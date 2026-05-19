import init from "$lib/raster_ops/pkg/raster_ops.js";
import { tiles as tileMetadata } from "$lib/constants.ts";
import {
  makeFileNameDatasetKey,
  buildTileFilename,
  loadIndexedArray,
} from "$lib/utils";

// --------------------------------------------------
// Shared State
// --------------------------------------------------
let wasmReady = false;

const debugInfo = {
  layers: [],
};

const tileIndex = Object.fromEntries(tileMetadata.map((t) => [t.code, t]));

// --------------------------------------------------
// WASM
// --------------------------------------------------
async function ensureWasm() {
  if (!wasmReady) {
    await init();
    wasmReady = true;
  }
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

class MinHeap {
  constructor() {
    this.data = [];
  }

  push(node) {
    this.data.push(node);
    this.bubbleUp(this.data.length - 1);
  }

  pop() {
    if (this.data.length === 1) return this.data.pop();
    const top = this.data[0];
    this.data[0] = this.data.pop();
    this.bubbleDown(0);
    return top;
  }

  peek() {
    return this.data[0];
  }

  size() {
    return this.data.length;
  }

  bubbleUp(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p][0] <= this.data[i][0]) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }

  bubbleDown(i) {
    const n = this.data.length;
    while (true) {
      let left = 2 * i + 1;
      let right = 2 * i + 2;
      let smallest = i;

      if (left < n && this.data[left][0] < this.data[smallest][0]) {
        smallest = left;
      }
      if (right < n && this.data[right][0] < this.data[smallest][0]) {
        smallest = right;
      }
      if (smallest === i) break;

      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

// async function loadIndexedArray(url) {
//   const res = await fetch(url);
//   if (!res.ok) throw new Error(`Failed to load ${url}`);
//   return new Uint32Array(await res.arrayBuffer());
// }

// async function loadIndexedArray(url) {
//   try {
//     const res = await fetch(url);
//     if (!res.ok) return new Uint32Array(0); // ← key change
//     return new Uint32Array(await res.arrayBuffer());
//   } catch {
//     return new Uint32Array(0); // network errors too
//   }
// }

function resolveRequestedTileSet(tileCodes) {
  if (!tileCodes || tileCodes.length === 0) return null; // null = no filter, use all
  return new Set(tileCodes);
}

function filterTileCodes(meta, requestedSet) {
  const codes = meta?.tile_codes ?? [];
  if (!requestedSet) return codes;
  return codes.filter((c) => requestedSet.has(c));
}

function intersectUint32(a, b) {
  if (!a?.length || !b?.length) return new Uint32Array(0);
  const small = a.length < b.length ? a : b;
  const large = a.length < b.length ? b : a;
  const set = new Set(small);
  const result = [];
  for (let i = 0; i < large.length; i++) {
    if (set.has(large[i])) result.push(large[i]);
  }
  return new Uint32Array(result);
}

// function unionSortedUint32Arrays(arrays) {
//   const total = arrays.reduce((sum, a) => sum + a.length, 0);
//   const merged = new Uint32Array(total);

//   let offset = 0;
//   for (const a of arrays) {
//     merged.set(a, offset);
//     offset += a.length;
//   }

//   merged.sort();

//   let uniqueCount = 0;
//   for (let i = 0; i < merged.length; i++) {
//     if (i === 0 || merged[i] !== merged[i - 1]) {
//       merged[uniqueCount++] = merged[i];
//     }
//   }

//   const result = new Uint32Array(uniqueCount);
//   result.set(merged.subarray(0, uniqueCount));
//   return result;
// }

// function findUniquePerArray(indexArrays) {
//   if (!indexArrays.length)
//     return { uniqueCounts: new Uint32Array(0), uniqueArrays: [] };

//   let maxIndex = 0;
//   for (const arr of indexArrays) {
//     for (let i = 0; i < arr.length; i++)
//       if (arr[i] > maxIndex) maxIndex = arr[i];
//   }

//   const freq = new Uint8Array(maxIndex + 1);
//   const owner = new Int32Array(maxIndex + 1);

//   indexArrays.forEach((arr, i) => {
//     for (let k = 0; k < arr.length; k++) {
//       const idx = arr[k];
//       if (freq[idx] === 0) {
//         freq[idx] = 1;
//         owner[idx] = i;
//       } else if (freq[idx] === 1) {
//         freq[idx] = 2;
//       }
//     }
//   });

//   const uniqueCounts = new Uint32Array(indexArrays.length);
//   for (let idx = 0; idx <= maxIndex; idx++) {
//     if (freq[idx] === 1) uniqueCounts[owner[idx]]++;
//   }

//   const uniqueArrays = indexArrays.map(
//     (_, i) => new Uint32Array(uniqueCounts[i]),
//   );
//   const writePointers = new Uint32Array(indexArrays.length);

//   for (let idx = 0; idx <= maxIndex; idx++) {
//     if (freq[idx] === 1) {
//       const i = owner[idx];
//       uniqueArrays[i][writePointers[i]++] = idx;
//     }
//   }

//   return { uniqueCounts, uniqueArrays };
// }

// --------------------------------------------------
// Global frame computation
// --------------------------------------------------

function unionAndUniqueSorted(arrays) {
  const k = arrays.length;
  const heap = new MinHeap();

  // Initialize heap
  for (let i = 0; i < k; i++) {
    const arr = arrays[i];
    if (arr.length > 0) {
      heap.push([arr[0], i, 0]); // [value, arrayIndex, elementIndex]
    }
  }

  const union = [];
  const uniqueArrays = Array.from({ length: k }, () => []);

  while (heap.size() > 0) {
    const [value, arrIdx, elemIdx] = heap.pop();

    let count = 1;
    let owner = arrIdx;

    // Push next element from this array
    const nextIdx = elemIdx + 1;
    if (nextIdx < arrays[arrIdx].length) {
      heap.push([arrays[arrIdx][nextIdx], arrIdx, nextIdx]);
    }

    // Consume duplicates across arrays
    while (heap.size() > 0 && heap.peek()[0] === value) {
      const [, i, j] = heap.pop();
      count++;

      if (count === 1) owner = i; // only matters if unique

      const next = j + 1;
      if (next < arrays[i].length) {
        heap.push([arrays[i][next], i, next]);
      }
    }

    // Union (always include once)
    union.push(value);

    // Unique (only appears once globally)
    if (count === 1) {
      uniqueArrays[owner].push(value);
    }
  }

  return {
    blendedIndices: new Uint32Array(union),
    uniqueCounts: new Uint32Array(uniqueArrays.map((a) => a.length)),
    uniqueArrays: uniqueArrays.map((a) => new Uint32Array(a)),
  };
}

function computeGlobalTileFrame(
  layersToUnpack,
  grid10mVariables,
  gridSize,
  width,
  requestedSet,
) {
  const allTiles = [];

  layersToUnpack.forEach((layer) => {
    // const key = makeFileNameDatasetKey(layer.filename);
    const key = layer.filename.split("_")[1];
    // console.log("key: ", key);
    const meta = grid10mVariables[key];
    // console.log("meta tile codes: ", meta.tile_codes);

    const tileCodes = filterTileCodes(meta, requestedSet);

    //   if (meta?.tile_codes?.length) {
    //     meta.tile_codes.forEach((code) => {
    //       const t = tileIndex[code];
    //       if (!t) throw new Error(`Tile metadata not found for ${code}`);
    //       allTiles.push({
    //         code,
    //         col: t.grid_x,
    //         row: t.grid_y,
    //         east: t.east,
    //         north: t.north,
    //       });
    //     });
    //   }
    // });

    if (tileCodes.length) {
      tileCodes.forEach((code) => {
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
    canvasWidth: cols * width,
    canvasHeight: rows * width,
    minEast,
    minNorth,
    maxEast,
    maxNorth,
  };
}

// --------------------------------------------------
// Load tiled dataset (flattened to global frame)
// --------------------------------------------------
async function loadTiledDatasetGlobal({
  layerKey,
  meta,
  base,
  sourceFolder,
  gridSize,
  globalFrame,
  width,
  requestedSet,
}) {
  // console.log("in loadTiledDatasetGlobal");
  // const loadedTiles = await Promise.all(
  //   meta.tile_codes.map(async (code) => {
  //     const t = tileIndex[code];
  //     // console.log(t);
  //     const subFolder = t.code + sourceFolder.slice(5);
  //     // console.log(subFolder);
  //     const filename = buildTileFilename(code, layerKey, meta);
  //     const url = `${base}/data/${sourceFolder}/${subFolder}/${filename}`;
  //     return { ...t, data: await loadIndexedArray(url) };
  //   }),
  // );

  const debug = {
    expected: [],
    loaded: [],
    missing: [],
  };

  // const loadedTiles = (
  //   await Promise.all(
  //     meta.tile_codes.map(async (code) => {
  //       try {
  //         const t = tileIndex[code];
  //         if (!t) return null; // guard

  //         const subFolder = t.code + sourceFolder.slice(5);
  //         const filename = buildTileFilename(code, layerKey, meta);
  //         const url = `${base}/data/${sourceFolder}/${subFolder}/${filename}`;

  //         const data = await loadIndexedArray(url);

  //         if (!data.length) return null; // ← skip missing/empty tiles

  //         return { ...t, data };
  //       } catch (e) {
  //         // optional debug:
  //         // console.warn("Tile failed:", code, e);
  //         return null;
  //       }
  //     }),
  //   )
  // ).filter(Boolean);

  // if (!loadedTiles.length) {
  //   return new Uint32Array(0);
  // }

  const tileCodes = filterTileCodes(meta, requestedSet);
  if (!tileCodes.length) {
    return { data: new Uint32Array(0), debug };
  }

  const loadedTiles = (
    await Promise.all(
      tileCodes.map(async (code) => {
        debug.expected.push(code);

        try {
          const t = tileIndex[code];
          if (!t) {
            debug.missing.push(code);
            return null;
          }

          const subFolder = t.code + sourceFolder.slice(5);
          const filename = buildTileFilename(code, layerKey, meta);
          const url = `${base}/data/${sourceFolder}/${subFolder}/${filename}`;
          // console.log("url: ", url);
          const data = await loadIndexedArray(url);

          if (data === null || data.length === 0) {
            debug.missing.push(code);
            return null;
          }

          debug.loaded.push(code);
          return { ...t, data };
        } catch (e) {
          debug.missing.push(code);
          return null;
        }
      }),
    )
  ).filter(Boolean);

  if (!loadedTiles.length) {
    return { data: new Uint32Array(0), debug };
  }

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
    for (let i = 0; i < tile.data.length; i++)
      merged[offset++] = transform(tile.data[i], tile);
  }

  merged.sort();
  // return merged;
  return {
    data: merged,
    debug,
  };
}

// --------------------------------------------------
// Main worker
// --------------------------------------------------
self.onmessage = async function (e) {
  const {
    layersToUnpack,
    base,
    policyLens,
    customArea,
    settingsObject,
    grid10mVariables = {},
    transformToGlobal = false,
    tileCodes,
  } = e.data;

  const debugInfo = { layers: [] };

  const requestedSet = resolveRequestedTileSet(tileCodes);
  // console.log({ requestedSet, tileCodes, transformToGlobal, grid10mVariables });

  const { gridSize, sourceFolder } = settingsObject;
  const width = 5000;

  const processedCustomArea = customArea ? new Uint32Array(customArea) : null;

  try {
    await ensureWasm();

    // Load lens mask
    let lensLayer = null;
    if (policyLens === "customArea") lensLayer = processedCustomArea;
    else if (policyLens !== "England") {
      const layerKey = makeFileNameDatasetKey(policyLens);
      const meta = grid10mVariables[layerKey];
      if (meta?.tile_codes?.length) {
        const globalFrameTmp = computeGlobalTileFrame(
          [{ filename: policyLens }],
          grid10mVariables,
          gridSize,
          width,
          requestedSet,
        );
        const result = await loadTiledDatasetGlobal({
          layerKey,
          meta,
          base,
          sourceFolder,
          gridSize,
          globalFrame: globalFrameTmp,
          width,
          requestedSet,
        });
        lensLayer = result.data;

        debugInfo.layers.push({
          layer: policyLens,
          ...result.debug,
        });
        // lensLayer = await loadTiledDatasetGlobal({
        //   layerKey,
        //   meta,
        //   base,
        //   sourceFolder,
        //   gridSize,
        //   globalFrame: globalFrameTmp,
        //   width,
        // });
      } else {
        lensLayer = await loadIndexedArray(
          `${base}/data/${sourceFolder}/${policyLens}`,
        );
      }
    }

    const policyLensArea =
      lensLayer?.length ?? (13_046_002 * 10_000) / (gridSize * gridSize);

    const globalFrame = transformToGlobal
      ? computeGlobalTileFrame(
          layersToUnpack,
          grid10mVariables,
          gridSize,
          width,
          requestedSet,
        )
      : null;

    // Load all layers
    const enrichedRasterLayers = await Promise.all(
      layersToUnpack.map(async (layer) => {
        const layerKey = transformToGlobal
          ? layer.filename.split("_")[1]
          : makeFileNameDatasetKey(layer.filename);
        // console.log(layerKey);
        const meta = grid10mVariables[layerKey];
        // console.log(meta);
        let data;
        if (meta?.tile_codes?.length) {
          if (transformToGlobal && globalFrame) {
            const result = await loadTiledDatasetGlobal({
              layerKey,
              meta,
              base,
              sourceFolder,
              gridSize,
              globalFrame,
              width,
              requestedSet,
            });
            data = result.data;

            debugInfo.layers.push({
              layer: layer.filename,
              ...result.debug,
            });
          } else {
            const tileCodesForLayer = filterTileCodes(meta, requestedSet);
            data = (
              await Promise.all(
                tileCodesForLayer.map(async (code) => {
                  try {
                    const filename = buildTileFilename(code, layerKey, meta);
                    const url = `${base}/data/${sourceFolder}/${filename}`;
                    return await loadIndexedArray(url);
                  } catch (e) {
                    // optional debug
                    console.warn("Missing tile:", code, url);
                    return new Uint32Array(0);
                  }
                }),
              )
            ).reduce((acc, arr) => {
              const merged = new Uint32Array(acc.length + arr.length);
              merged.set(acc);
              merged.set(arr, acc.length);
              return merged;
            }, new Uint32Array(0));
          }

          // await loadTiledDatasetGlobal({
          //     layerKey,
          //     meta,
          //     base,
          //     sourceFolder,
          //     gridSize,
          //     globalFrame,
          //     width,
          //   })

          data.sort();
        } else {
          data = await loadIndexedArray(
            `${base}/data/${sourceFolder}/${layer.filename}`,
          );
        }

        if (lensLayer) data = intersectUint32(data, lensLayer);

        return { ...layer, area: data.length, data };
      }),
    );

    // Blend layers
    const activeBitArrays = enrichedRasterLayers.map((l) => l.data);
    // const blendedIndices = unionSortedUint32Arrays(activeBitArrays);
    const { blendedIndices, uniqueCounts, uniqueArrays } =
      unionAndUniqueSorted(activeBitArrays);

    // const blendedArrayLength = blendedIndices.length;
    const blendedArrayLength = blendedIndices.length;

    // Find unique per array
    // const { uniqueCounts, uniqueArrays } = findUniquePerArray(activeBitArrays);

    const transferList = [
      ...enrichedRasterLayers.map((l) => l.data.buffer),
      ...(lensLayer ? [lensLayer.buffer] : []),
      blendedIndices.buffer,
      uniqueCounts.buffer,
      ...uniqueArrays.map((a) => a.buffer),
    ];

    self.postMessage(
      {
        rasterLayers: enrichedRasterLayers,
        policyLensArea,
        lensIndices: lensLayer,
        blendedIndices: blendedIndices.buffer,
        blendedArrayLength,
        uniqueCounts,
        uniqueArrays,
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
        debug: debugInfo,
        tileIndex,
      },
      transferList,
    );
  } catch (err) {
    self.postMessage({ error: err.message || "Unknown error" });
  }
};
