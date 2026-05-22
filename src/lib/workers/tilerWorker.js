import { tiles as tileMetadata } from "$lib/constants.ts";
import { buildTileFilename } from "$lib/utils";

/* -------------------------------------------------- */
/* Helpers */
/* -------------------------------------------------- */

async function loadIndexedArray(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint32Array(buffer);
}

/* -------------------------------------------------- */
/* Precompute fast lookup for tile metadata */
/* -------------------------------------------------- */

const tileIndex = Object.fromEntries(tileMetadata.map((t) => [t.code, t]));
// console.log(tileIndex);
/* -------------------------------------------------- */
/* Worker */
/* -------------------------------------------------- */

self.onmessage = async (e) => {
  const { grid10mVariables, gridSize, sourceFolder, base } = e.data;
  const width = 5000; //Hardcoded! because reading from constants wasn't working
  try {
    /* -------------------------------------------- */
    /* 1️⃣ Build active tile list from variables   */
    /* -------------------------------------------- */

    const activeTileMeta = Object.entries(grid10mVariables).flatMap(
      ([varName, meta]) =>
        meta.tile_codes.map((code) => {
          const tileMeta = tileIndex[code];

          if (!tileMeta) {
            throw new Error(`Tile metadata not found for ${code}`);
          }

          return {
            key: tileMeta.pos_rel, // "9,10"
            col: tileMeta.grid_x,
            row: tileMeta.grid_y,
            code,
            varName,
            meta,
          };
        }),
    );

    /* -------------------------------------------- */
    /* 2️⃣ Load all binary files                    */
    /* -------------------------------------------- */

    const entries = await Promise.all(
      activeTileMeta.map(async (tile) => {
        const filename = buildTileFilename(tile.code, tile.varName, tile.meta);

        const url = `${base}/data/${sourceFolder}/${filename}`;
        const data = await loadIndexedArray(url);

        return [tile.key, { ...tile, data }];
      }),
    );

    const loadedTiles = Object.fromEntries(entries);
    // console.log(loadedTiles);
    /* -------------------------------------------- */
    /* 3️⃣ Determine used rows/cols                 */
    /* -------------------------------------------- */

    const activeTiles = Object.values(loadedTiles);
    console.log(activeTiles);

    const TILE_SIZE = width * gridSize;
    const minEast = Math.min(...activeTiles.map((t) => tileIndex[t.code].east));
    const minNorth = Math.min(
      ...activeTiles.map((t) => tileIndex[t.code].north),
    );
    const maxEast =
      Math.max(...activeTiles.map((t) => tileIndex[t.code].east)) + TILE_SIZE;
    const maxNorth =
      Math.max(...activeTiles.map((t) => tileIndex[t.code].north)) + TILE_SIZE;

    const boundingBox = [minEast, minNorth, maxEast, maxNorth];
    const canvasWidth = (maxEast - minEast) / gridSize;
    const canvasHeight = (maxNorth - minNorth) / gridSize;
    console.log(canvasWidth, canvasHeight);

    // const usedCols = [...new Set(activeTiles.map((t) => t.col))].sort(
    //   (a, b) => a - b,
    // );

    // const usedRows = [...new Set(activeTiles.map((t) => t.row))].sort(
    //   (a, b) => a - b,
    // );

    // const colMap = Object.fromEntries(usedCols.map((c, i) => [c, i]));

    // const rowMap = Object.fromEntries(usedRows.map((r, i) => [r, i]));

    // const cols = usedCols.length;

    /* -------------------------------------------- */
    /* 3️⃣ Bounding box (NO compaction)            */
    /* -------------------------------------------- */

    const minCol = Math.min(...activeTiles.map((t) => t.col));
    const maxCol = Math.max(...activeTiles.map((t) => t.col));
    const minRow = Math.min(...activeTiles.map((t) => t.row));
    const maxRow = Math.max(...activeTiles.map((t) => t.row));

    const cols = maxCol - minCol + 1;
    const rows = maxRow - minRow + 1;

    /* -------------------------------------------- */
    /* 4️⃣ Transform tile indices into global grid  */
    /* -------------------------------------------- */

    // function transform(index, tile) {
    //   const x = index % width;
    //   const y = Math.floor(index / width);

    //   const globalX = colMap[tile.col] * width + x;
    //   const globalY = rowMap[tile.row] * width + y;

    //   return globalY * (cols * width) + globalX;
    // }

    function transform(index, tile) {
      const x = index % width;
      const y = Math.floor(index / width);

      const globalX = (tile.col - minCol) * width + x;
      const globalY = (tile.row - minRow) * width + y;

      return globalY * (cols * width) + globalX;
    }
    // console.log(activeTiles);
    // const merged = activeTiles
    //   .flatMap((tile) => tile.data.map((v) => transform(v, tile)))
    //   .sort((a, b) => a - b);
    // console.log(merged);

    // const merged = [];

    // for (const tile of activeTiles) {
    //   for (let i = 0; i < tile.data.length; i++) {
    //     merged.push(transform(tile.data[i], tile));
    //   }
    // }

    // merged.sort((a, b) => a - b);

    /* -------------------------------------------- */
    /* 4️⃣ Merge per variable                       */
    /* -------------------------------------------- */

    const results = [];

    const variables = Object.keys(grid10mVariables);

    for (const varName of variables) {
      const variableTiles = activeTiles.filter((t) => t.varName === varName);

      const merged = [];

      for (const tile of variableTiles) {
        for (let i = 0; i < tile.data.length; i++) {
          merged.push(transform(tile.data[i], tile));
        }
      }

      merged.sort((a, b) => a - b);

      const resultArray = new Uint32Array(merged);

      results.push({
        filename: `${varName}.bin`,
        area: resultArray.length,
        data: resultArray,
      });
    }

    // const result = new Uint32Array(merged);
    // console.log(result);
    /* -------------------------------------------- */
    /* 5️⃣ Send back efficiently (transfer buffer)  */
    /* -------------------------------------------- */
    console.log(boundingBox);
    self.postMessage(
      {
        datasets: results,
        bbox: boundingBox,
        canvasWidth,
        canvasHeight,
      },
      results.map((r) => r.data.buffer),
    );
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
