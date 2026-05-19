import init from "$lib/raster_ops/pkg/raster_ops.js";
import { tiles as tileMetadata } from "$lib/constants.ts";
import { makeFileNameDatasetKey, buildTileFilename } from "$lib/utils";
/* -------------------------------------------------- */
/* Shared State                                      */
/* -------------------------------------------------- */

let wasmReady = false;

const tileIndex = Object.fromEntries(tileMetadata.map((t) => [t.code, t]));

/* -------------------------------------------------- */
/* WASM                                              */
/* -------------------------------------------------- */

async function ensureWasm() {
  if (!wasmReady) {
    await init();
    wasmReady = true;
  }
}

/* -------------------------------------------------- */
/* Helpers                                           */
/* -------------------------------------------------- */

async function loadIndexedArray(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return new Uint32Array(await response.arrayBuffer());
}

function intersectUint32(a, b) {
  if (!a?.length || !b?.length) return new Uint32Array(0);

  let small = a.length < b.length ? a : b;
  let large = a.length < b.length ? b : a;

  const set = new Set(small);
  const result = [];

  for (let i = 0; i < large.length; i++) {
    if (set.has(large[i])) result.push(large[i]);
  }

  return new Uint32Array(result);
}

/* -------------------------------------------------- */
/* Precompute global tile grid                        */
/* -------------------------------------------------- */

function computeGlobalTileFrame(
  layersToUnpack,
  grid10mVariables,
  gridSize,
  width,
) {
  const allTiles = [];

  layersToUnpack.forEach((layer) => {
    const key = makeFileNameDatasetKey(layer.filename);
    const meta = grid10mVariables[key];

    if (meta?.tile_codes?.length) {
      meta.tile_codes.forEach((code) => {
        const t = tileIndex[code];
        if (!t) throw new Error(`Tile metadata not found for ${code}`);
        allTiles.push({
          code,
          col: t.grid_x,
          row: t.grid_y,
          east: t.east,
          north: t.north,
        });
      });
    }
  });

  if (!allTiles.length) return null;

  const minCol = Math.min(...allTiles.map((t) => t.col));
  const maxCol = Math.max(...allTiles.map((t) => t.col));
  const minRow = Math.min(...allTiles.map((t) => t.row));
  const maxRow = Math.max(...allTiles.map((t) => t.row));

  const cols = maxCol - minCol + 1;
  const rows = maxRow - minRow + 1;
  const canvasWidth = cols * width;
  const canvasHeight = rows * width;

  const TILE_SIZE_METERS = width * gridSize;
  const minEast = Math.min(...allTiles.map((t) => t.east));
  const minNorth = Math.min(...allTiles.map((t) => t.north));
  const maxEast = Math.max(...allTiles.map((t) => t.east)) + TILE_SIZE_METERS;
  const maxNorth = Math.max(...allTiles.map((t) => t.north)) + TILE_SIZE_METERS;

  return {
    minCol,
    maxCol,
    minRow,
    maxRow,
    cols,
    rows,
    canvasWidth,
    canvasHeight,
    minEast,
    minNorth,
    maxEast,
    maxNorth,
  };
}

/* -------------------------------------------------- */
/* Tiled Dataset Loader with Global Frame           */
/* -------------------------------------------------- */

async function loadTiledDatasetGlobal({
  layerKey,
  meta,
  base,
  sourceFolder,
  gridSize,
  globalFrame,
  width,
}) {
  // Load all tiles for this dataset
  const loadedTiles = await Promise.all(
    meta.tile_codes.map(async (code) => {
      const t = tileIndex[code];
      const filename = buildTileFilename(code, layerKey, meta);
      const url = `${base}/data/${sourceFolder}/${filename}`;

      return {
        ...t,
        data: await loadIndexedArray(url),
      };
    }),
  );

  // Flatten tile data into global grid indices
  const totalLength = loadedTiles.reduce((sum, t) => sum + t.data.length, 0);
  const merged = new Uint32Array(totalLength);
  let offset = 0;

  function transform(index, tile) {
    const x = index % width;
    const y = Math.floor(index / width);

    const globalX = (tile.grid_x - globalFrame.minCol) * width + x;
    const globalY = (tile.grid_y - globalFrame.minRow) * width + y;

    return globalY * (globalFrame.cols * width) + globalX;
  }

  for (const tile of loadedTiles) {
    for (let i = 0; i < tile.data.length; i++) {
      merged[offset++] = transform(tile.data[i], tile);
    }
  }

  merged.sort();

  return merged;
}

/* -------------------------------------------------- */
/* Main Worker                                       */
/* -------------------------------------------------- */

self.onmessage = async function (e) {
  const {
    layersToUnpack,
    base,
    policyLens,
    customArea,
    settingsObject,
    grid10mVariables = {},
    transformToGlobal = false,
  } = e.data;

  const { gridSize, sourceFolder } = settingsObject;
  const width = 5000;
  const processedCustomArea = customArea ? new Uint32Array(customArea) : null;
  const TILE_SIZE = width * gridSize;

  try {
    await ensureWasm();

    // Load lens
    async function loadLensMask() {
      if (policyLens === "England") return null;
      if (policyLens === "customArea") return processedCustomArea;

      const layerKey = makeFileNameDatasetKey(policyLens);
      const meta = grid10mVariables[layerKey];

      if (meta?.tile_codes?.length) {
        return await loadTiledDatasetGlobal({
          layerKey,
          meta,
          base,
          sourceFolder,
          gridSize,
          globalFrame: computeGlobalTileFrame(
            [{ filename: policyLens }],
            grid10mVariables,
            gridSize,
            width,
          ),
          width,
        });
      }

      const url = `${base}/data/${sourceFolder}/${policyLens}`;
      return loadIndexedArray(url);
    }

    const lensLayer = await loadLensMask();

    // Compute global frame for all datasets if transforming
    let globalFrame = transformToGlobal
      ? computeGlobalTileFrame(
          layersToUnpack,
          grid10mVariables,
          width,
          gridSize,
        )
      : null;

    // Prepare arrays
    const enrichedRasterLayers = await Promise.all(
      layersToUnpack.map(async (layer) => {
        const layerKey = makeFileNameDatasetKey(layer.filename);
        const meta = grid10mVariables[layerKey];

        let result;

        if (meta?.tile_codes?.length) {
          if (transformToGlobal && globalFrame) {
            result = await loadTiledDatasetGlobal({
              layerKey,
              meta,
              base,
              sourceFolder,
              gridSize,
              globalFrame,
              width,
            });
          } else {
            // Just merge without global transform
            const loadedTiles = await Promise.all(
              meta.tile_codes.map(async (code) => {
                const filename = buildTileFilename(code, layerKey, meta);
                const url = `${base}/data/${sourceFolder}/${filename}`;
                return await loadIndexedArray(url);
              }),
            );
            const totalLength = loadedTiles.reduce(
              (sum, t) => sum + t.length,
              0,
            );
            result = new Uint32Array(totalLength);
            let offset = 0;
            for (const arr of loadedTiles) {
              result.set(arr, offset);
              offset += arr.length;
            }
            result.sort();
          }
        } else {
          const url = `${base}/data/${sourceFolder}/${layer.filename}`;
          result = await loadIndexedArray(url);
        }

        // Apply policy lens
        if (lensLayer) result = intersectUint32(result, lensLayer);

        return { ...layer, area: result.length, data: result };
      }),
    );

    self.postMessage(
      {
        rasterLayers: enrichedRasterLayers,
        policyLensArea:
          lensLayer?.length ?? (13_046_002 * 10_000) / (gridSize * gridSize),
        lensIndices: lensLayer,
        bbox: globalFrame
          ? [
              globalFrame.minEast,
              globalFrame.minNorth,
              globalFrame.maxEast,
              globalFrame.maxNorth,
            ]
          : null,
        canvasWidth: globalFrame ? globalFrame.cols * width : null,
        canvasHeight: globalFrame ? globalFrame.rows * width : null,
      },
      enrichedRasterLayers.map((l) => l.data.buffer),
    );
  } catch (error) {
    self.postMessage({ error: error.message || "Unknown error" });
  }
};
