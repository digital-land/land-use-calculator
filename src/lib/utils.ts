//@ts-check

import { fromUrl } from "geotiff";
import { interpolateViridis } from "d3-scale-chromatic";
import ImageLayer from "ol/layer/Image.js";
import ImageCanvasSource from "ol/source/ImageCanvas.js";
import { width, height, gridSize, bbox } from "./constants";

type TableMetadataEntry = Record<"explainer" | "label" | "shortLabel", string>;

export type TableMetadata = Record<string, TableMetadataEntry>;

export interface GridConfig {
  width: number;
  height: number;
  colOffset?: number;
}

export interface MapGroup {
  name: string;
  paintedIndices: number[];
  gridConfig: GridConfig;
  stats: any;
  histogram: any;
  layer: ImageLayer<ImageCanvasSource>;
}

export interface PolicyLensItem {
  value: string;
  text: string;
  sentenceText: string;
}

export function parseCsv(csvText: string): object[] {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].trim().split(",");

  return lines.slice(1).map((line) => {
    // console.log(line);
    const values = line.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h] = values[i].replace("\r", "")));
    // console.log(row);
    return row;
  });
}

export function jsonToCsv(
  items: object[],
  policyLens: string,
  policyLensItems: PolicyLensItem[],
  selected: string[],
): string {
  const title = `"Selected area covers : ${selected.map((d) => makeFileNameReadable(d)).join(", ")}"\r\n`;
  const footer =
    "\r\n Notes: \r\n 1. All figures are in hectares. \r\n 2. This is an experimental product under development.";
  const caveat =
    "Selected area figures relate to the area within " +
    (policyLensItems.find((d) => d.value == policyLens)?.sentenceText ??
      'the "' + makeFileNameReadable(policyLens) + '" layer') +
    " \r\n";
  const header = Object.keys(items[0]);
  const headerString = header.join(",");
  // handle null or undefined values here
  const replacer = (key, value) => value ?? "";
  const rowItems = items.map((row) =>
    header
      .map((fieldName) => JSON.stringify(row[fieldName], replacer))
      .join(","),
  );
  // join header and body, and break into separate lines
  const csv = [title, caveat, headerString, ...rowItems, footer].join("\r\n");
  return csv;
}

export function makeFileNameReadable(filename: string): string {
  return filename.replace(".bin", "").replaceAll("_", " ");
}

export function downloadJSON(data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "stats.json";
  a.click();

  URL.revokeObjectURL(url);
}

export function downloadCSV(results: any[]) {
  const headers = [
    "file",
    "count",
    "sum",
    "mean",
    "median",
    "min",
    "max",
    "<=1",
    "2 to 5",
    "6 to 10",
    "11 to 20",
    "21 to 50",
    "51 to 100",
    "101 to 200",
    "201 to 500",
    "over 500",
  ];

  const rows = results.map((r) => [
    r.file,
    r.stats.count,
    r.stats.sum,
    r.stats.mean,
    r.stats.median,
    r.stats.min,
    r.stats.max,
    r.histogram["<=1"],
    r.histogram["2 to 5"],
    r.histogram["6 to 10"],
    r.histogram["11 to 20"],
    r.histogram["21 to 50"],
    r.histogram["51 to 100"],
    r.histogram["101 to 200"],
    r.histogram["201 to 500"],
    r.histogram["over 500"],
  ]);

  const csv =
    headers.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "stats.csv";
  a.click();

  URL.revokeObjectURL(url);
}

export function computeStats(group: MapGroup, densityArray: Uint16Array) {
  if (!densityArray || group.paintedIndices.length === 0) {
    group.stats = { count: 0, sum: 0, mean: 0, median: 0, min: 0, max: 0 };
    group.histogram = {};
    return;
  }

  const values = Array.from(group.paintedIndices)
    .map((i) => {
      const full = uploadedIndexToFullIndex(i, group.gridConfig);
      return densityArray[full];
    })
    .filter((v) => v !== undefined);

  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const histogram = {
    "<=1": 0,
    "2 to 5": 0,
    "6 to 10": 0,
    "11 to 20": 0,
    "21 to 50": 0,
    "51 to 100": 0,
    "101 to 200": 0,
    "201 to 500": 0,
    "over 500": 0,
  };
  for (const v of values) {
    if (v <= 1) histogram["<=1"]++;
    else if (v <= 5) histogram["2 to 5"]++;
    else if (v <= 10) histogram["6 to 10"]++;
    else if (v <= 20) histogram["11 to 20"]++;
    else if (v <= 50) histogram["21 to 50"]++;
    else if (v <= 100) histogram["51 to 100"]++;
    else if (v <= 200) histogram["101 to 200"]++;
    else if (v <= 500) histogram["201 to 500"]++;
    else histogram["over 500"]++;
  }

  group.stats = { count: values.length, sum, mean, median, min, max };
  group.histogram = histogram;

  return group;
}

export function uploadedIndexToFullIndex(
  index: number,
  grid: GridConfig,
): number {
  if (!grid.colOffset) return index;

  const croppedCols = grid.width - grid.colOffset;
  const row = Math.floor(index / croppedCols);
  const col = index % croppedCols;

  return row * grid.width + col;
}

export function coordToIndex(
  x: number,
  y: number,
  grid: GridConfig = { width, height },
): number {
  const cols = grid.width - (grid.colOffset || 0);
  const row = grid.height - 1 - Math.floor((y - originY) / cellSize);
  // const row = Math.floor((y - originY)/(-cellSize))
  // console.log(row)
  const col = Math.floor((x - originX) / cellSize);
  if (col < 0 || col >= cols || row < 0 || row >= grid.height) return null;
  return row * cols + col;
}

export function indexToCoord(
  index: number,
  grid: GridConfig,
): { x: number; y: number } {
  const cols = grid.width - (grid.colOffset || 0);
  const row = Math.floor(index / cols);
  const col = index % cols;
  const x = originX + col * cellSize;
  const y = originY + (grid.height - row) * cellSize; //Had to remove the -1 to match previous method and data
  // const y = originY + row * (-cellSize);
  return { x, y };
}

// --- Load GeoTIFF ---
export async function loadDensityTiff(url: string): Promise<{
  densityArray: number | Uint16Array;
  width: number;
  height: number;
}> {
  const tiff = await fromUrl(url);
  const image = await tiff.getImage();
  // console.log(image.getBoundingBox())
  if (JSON.stringify(image.getBoundingBox()) !== JSON.stringify(bbox)) {
    console.error(
      "Mismatch between density tiff and other data layers. Density tiff bbox: ",
      image.getBoundingBox(),
      "Other data layers bbox: ",
      bbox,
    );
  }
  const rasters = await image.readRasters();
  return {
    densityArray: rasters[0],
    width: image.getWidth(),
    height: image.getHeight(),
    // densityOriginX: image.getOrigin()[0],
    // densityOriginY: image.getOrigin()[1]
  };
}

export function drawGroupRaster(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  extent: number[],
  group: MapGroup,
  densityArray: Uint16Array,
) {
  const [minX, minY, maxX, maxY] = extent;
  const scaleX = canvas.width / (maxX - minX);
  const scaleY = canvas.height / (maxY - minY);

  for (const index of group.paintedIndices) {
    const { x, y } = indexToCoord(index, group.gridConfig);
    if (x < minX || x > maxX || y < minY || y > maxY) continue;

    // const value = densityArray[index];

    const fullIndex = uploadedIndexToFullIndex(index, group.gridConfig);
    const value = densityArray[fullIndex];
    if (value === undefined) continue;

    ctx.fillStyle = getFillStyle(value);
    ctx.fillRect(
      (x - minX) * scaleX,
      canvas.height - (y - minY) * scaleY,
      cellSize * scaleX,
      cellSize * scaleY,
    );
  }
}

export function getFillStyle(value: number): string {
  let normalized: number;

  if (value <= 1) normalized = 0.0;
  else if (value <= 5) normalized = 0.1;
  else if (value <= 10) normalized = 0.2;
  else if (value <= 20) normalized = 0.35;
  else if (value <= 50) normalized = 0.45;
  else if (value <= 100) normalized = 0.55;
  else if (value <= 200) normalized = 0.65;
  else if (value <= 500) normalized = 0.8;
  else normalized = 1.0;

  return interpolateViridis(1 - normalized)
    .replace("rgb(", "rgba(")
    .replace(")", `, ${fillOpacity})`);
}

export function createGroupLayer(
  group: MapGroup,
  opacity: number,
  densityArray: Uint16Array,
  DENSITY_LUT: Uint32Array,
): ImageLayer<ImageCanvasSource> {
  return new ImageLayer({
    source: new ImageCanvasSource({
      projection: "EPSG:27700",
      canvasFunction: (extent, resolution, pixelRatio, size) => {
        const canvas = document.createElement("canvas");
        canvas.width = size[0];
        canvas.height = size[1];
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawGroupRaster(ctx, canvas, extent, group, densityArray);
        // const imageData = ctx.createImageData(width, height);
        // const pixels = new Uint32Array(imageData.data.buffer);

        // // pixels are already zero (transparent) by default

        // for (let i = 0; i < group.paintedIndices.length; i++) {
        //   const index = group.paintedIndices[i];
        //   const value = densityArray[index];
        //   pixels[index] = DENSITY_LUT[value];
        // }
        // console.log(imageData)
        // ctx.putImageData(imageData, 0, 0);

        return canvas;
      },
    }),
    opacity,
  });
}

// export function createDensityCanvas(densityCanvas, blendedIndices, densityArray, DENSITY_LUT) {
//   let densityDataURL;
//   const canvas = densityCanvas
  
//   canvas.width = width;
//   canvas.height = height;

//   const ctx = canvas.getContext("2d");

//   const imageData = ctx.createImageData(width, height);
//   const pixels = new Uint32Array(imageData.data.buffer);

//   // pixels are already zero (transparent) by default

//   for (let i = 0; i < blendedIndices.length; i++) {
//     const index = blendedIndices[i];
//     const value = densityArray[index];
//     pixels[index] = DENSITY_LUT[value];
//   }
//   console.log(imageData)
//   ctx.putImageData(imageData, 0, 0);

//   canvas.toBlob((blob) => {
//     const canvasURL = URL.createObjectURL(blob);
//     densityDataURL = canvasURL
//     console.log(densityDataURL);
//   });
// console.log(densityDataURL);
//   return densityDataURL;
// }

export function createDensityCanvas(
  densityCanvas,
  blendedIndices,
  densityArray,
  DENSITY_LUT
) {
  return new Promise((resolve, reject) => {
    const canvas = densityCanvas;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return reject("No 2D context");

    const imageData = ctx.createImageData(width, height);
    const pixels = new Uint32Array(imageData.data.buffer);

    for (let i = 0; i < blendedIndices.length; i++) {
      const index = blendedIndices[i];
      const value = densityArray?.[index];
      pixels[index] = DENSITY_LUT[value];
    }

    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return reject("Blob creation failed");

      const canvasURL = URL.createObjectURL(blob);
      resolve(canvasURL);
    });
  });
}

// export async function createDensityCanvasMobile(
//   blendedIndices: Uint32Array,
//   densityArray: Uint16Array,
//   DENSITY_LUT: Uint32Array
// ) {
//   console.time("density-mobile");

//   const MAX_TILE_PIXELS = 10_000_000;
//   const MAX_FINAL_PIXELS = 16_000_000;

//   const tileSize = Math.floor(Math.sqrt(MAX_TILE_PIXELS));
//   const cols = Math.ceil(width / tileSize);
//   const rows = Math.ceil(height / tileSize);

//   let scale = 1;
//   const totalPixels = width * height;
//   if (totalPixels > MAX_FINAL_PIXELS) {
//     scale = Math.sqrt(MAX_FINAL_PIXELS / totalPixels);
//   }

//   const tileBlobs = [];

//   // ----------------------------------
//   // Render each tile
//   // ----------------------------------

//   for (let row = 0; row < rows; row++) {
//     for (let col = 0; col < cols; col++) {

//       const x0 = col * tileSize;
//       const y0 = row * tileSize;
//       const w = Math.min(tileSize, width - x0);
//       const h = Math.min(tileSize, height - y0);

//       const canvas = document.createElement("canvas");
//       canvas.width = w;
//       canvas.height = h;

//       const ctx = canvas.getContext("2d")!;
//       const imageData = ctx.createImageData(w, h);
//       const pixels = new Uint32Array(imageData.data.buffer);

//       // Sparse write only indices inside this tile
//       for (let i = 0; i < blendedIndices.length; i++) {
//         const globalIndex = blendedIndices[i];

//         const x = globalIndex % width;
//         const y = Math.floor(globalIndex / width);

//         if (
//           x >= x0 && x < x0 + w &&
//           y >= y0 && y < y0 + h
//         ) {
//           const localX = x - x0;
//           const localY = y - y0;
//           const localIndex = localY * w + localX;

//           pixels[localIndex] =
//             DENSITY_LUT[densityArray[globalIndex]];
//         }
//       }

//       ctx.putImageData(imageData, 0, 0);

//       const blob = await new Promise<Blob>((r) =>
//         canvas.toBlob(r, "image/png")
//       );

//       tileBlobs.push({ row, col, blob, w, h });
//     }
//   }

//   // ----------------------------------
//   // Merge tiles
//   // ----------------------------------

//   const finalW = Math.floor(width * scale);
//   const finalH = Math.floor(height * scale);

//   const finalCanvas = document.createElement("canvas");
//   finalCanvas.width = finalW;
//   finalCanvas.height = finalH;

//   const finalCtx = finalCanvas.getContext("2d")!;
//   finalCtx.imageSmoothingEnabled = false;
//   // finalCtx.imageSmoothingQuality = "high";

//   await Promise.all(
//     tileBlobs.map(async ({ row, col, blob, w, h }) => {
//       const img = await createImageBitmap(blob);

//       const dx = Math.round(col * tileSize * scale);
// const dy = Math.round(row * tileSize * scale);
// const dw = Math.round(w * scale);
// const dh = Math.round(h * scale);

// finalCtx.drawImage(img, dx, dy, dw, dh);

//     })
//   );

//   const finalBlob = await new Promise<Blob>((r) =>
//     finalCanvas.toBlob(r, "image/png")
//   );

//   const dataURL = URL.createObjectURL(finalBlob);

//   console.timeEnd("density-mobile");

//   return { dataURL, scale };
// }

// export async function createDensityCanvasMobile(
//   blendedIndices: Uint32Array,
//   densityArray: Uint16Array,
//   DENSITY_LUT: Uint32Array
// ) {
//   console.time("density-mobile");

//   const MAX_TILE_PIXELS = 10_000_000;
//   const MAX_FINAL_PIXELS = 16_000_000;

//   const totalPixels = width * height;

//   let scale = 1;
//   if (totalPixels > MAX_FINAL_PIXELS) {
//     scale = Math.sqrt(MAX_FINAL_PIXELS / totalPixels);
//   }

//   const scaledWidth = Math.floor(width * scale);
//   const scaledHeight = Math.floor(height * scale);

//   const tileSize = Math.floor(Math.sqrt(MAX_TILE_PIXELS));
//   const cols = Math.ceil(scaledWidth / tileSize);
//   const rows = Math.ceil(scaledHeight / tileSize);

//   const tileBlobs: {
//     row: number;
//     col: number;
//     blob: Blob;
//     w: number;
//     h: number;
//   }[] = [];

//   // ----------------------------------
//   // Render each tile already scaled
//   // ----------------------------------

//   for (let row = 0; row < rows; row++) {
//     for (let col = 0; col < cols; col++) {

//       const sx0 = col * tileSize;
//       const sy0 = row * tileSize;

//       const sw = Math.min(tileSize, scaledWidth - sx0);
//       const sh = Math.min(tileSize, scaledHeight - sy0);

//       const canvas = document.createElement("canvas");
//       canvas.width = sw;
//       canvas.height = sh;

//       const ctx = canvas.getContext("2d")!;
//       const imageData = ctx.createImageData(sw, sh);
//       const pixels = new Uint32Array(imageData.data.buffer);

//       // For each sparse index
//       for (let i = 0; i < blendedIndices.length; i++) {
//         const globalIndex = blendedIndices[i];

//         const gx = globalIndex % width;
//         const gy = Math.floor(globalIndex / width);

//         // Convert to scaled coordinate
//         const sx = Math.floor(gx * scale);
//         const sy = Math.floor(gy * scale);

//         // Check if pixel falls inside this scaled tile
//         if (
//           sx >= sx0 && sx < sx0 + sw &&
//           sy >= sy0 && sy < sy0 + sh
//         ) {
//           const localX = sx - sx0;
//           const localY = sy - sy0;
//           const localIndex = localY * sw + localX;

//           pixels[localIndex] =
//             DENSITY_LUT[densityArray[globalIndex]];
//         }
//       }

//       ctx.putImageData(imageData, 0, 0);

//       const blob = await new Promise<Blob>((r) =>
//         canvas.toBlob(r, "image/png")
//       );

//       tileBlobs.push({ row, col, blob, w: sw, h: sh });
//     }
//   }

//   // ----------------------------------
//   // Merge (NO SCALING)
//   // ----------------------------------

//   const finalCanvas = document.createElement("canvas");
//   finalCanvas.width = scaledWidth;
//   finalCanvas.height = scaledHeight;

//   const finalCtx = finalCanvas.getContext("2d")!;
//   finalCtx.imageSmoothingEnabled = false;

//   await Promise.all(
//     tileBlobs.map(async ({ row, col, blob, w, h }) => {
//       const img = await createImageBitmap(blob);

//       finalCtx.drawImage(
//         img,
//         col * tileSize,
//         row * tileSize
//       );
//     })
//   );

//   const finalBlob = await new Promise<Blob>((r) =>
//     finalCanvas.toBlob(r, "image/png")
//   );

//   const dataURL = URL.createObjectURL(finalBlob);

//   console.timeEnd("density-mobile");

//   return { dataURL, scale };
// }

// import ImageLayer from "ol/layer/Image";
import ImageStatic from "ol/source/ImageStatic";
import LayerGroup from "ol/layer/Group";

export async function createDensityLayerMobile(
  blendedIndices: Uint32Array,
  densityArray: Uint16Array,
  DENSITY_LUT: Uint32Array,
  bbox: [number, number, number, number],
  opacity: number
) {
  console.time("density-mobile-tiles");

  const MAX_TILE_PIXELS = 10_000_000;

  const tileSize = Math.floor(Math.sqrt(MAX_TILE_PIXELS));
  const cols = Math.ceil(width / tileSize);
  const rows = Math.ceil(height / tileSize);

  const [minX, minY, maxX, maxY] = bbox;

  const pixelWidth = (maxX - minX) / width;
  const pixelHeight = (maxY - minY) / height;

  const layers: ImageLayer<ImageStatic>[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {

      const x0 = col * tileSize;
      const y0 = row * tileSize;

      const w = Math.min(tileSize, width - x0);
      const h = Math.min(tileSize, height - y0);

      // --- Create tile canvas (FULL resolution, no scaling) ---
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.createImageData(w, h);
      const pixels = new Uint32Array(imageData.data.buffer);

      // Sparse write only indices inside this tile
      for (let i = 0; i < blendedIndices.length; i++) {
        const globalIndex = blendedIndices[i];

        const gx = globalIndex % width;
        const gy = Math.floor(globalIndex / width);

        if (
          gx >= x0 && gx < x0 + w &&
          gy >= y0 && gy < y0 + h
        ) {
          const localX = gx - x0;
          const localY = gy - y0;
          const localIndex = localY * w + localX;

          pixels[localIndex] =
            DENSITY_LUT[densityArray[globalIndex]];
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const blob = await new Promise<Blob>((r) =>
        canvas.toBlob(r, "image/png")
      );

      const tileURL = URL.createObjectURL(blob);

      // --- Compute precise spatial extent for this tile ---
      const tileMinX = minX + x0 * pixelWidth;
      const tileMaxX = minX + (x0 + w) * pixelWidth;

      const tileMaxY = maxY - y0 * pixelHeight;
      const tileMinY = maxY - (y0 + h) * pixelHeight;

      const tileExtent: [number, number, number, number] = [
        tileMinX,
        tileMinY,
        tileMaxX,
        tileMaxY,
      ];

      const layer = new ImageLayer({
        source: new ImageStatic({
          url: tileURL,
          imageExtent: tileExtent,
          projection: "EPSG:27700",
          interpolate: false,
        }),
        opacity,
      });

      layers.push(layer);
    }
  }

  console.timeEnd("density-mobile-tiles");

  return new LayerGroup({ layers });
}


export function convertPixelsToHectares(value: number): number {
  return Math.round((value * gridSize * gridSize) / 10_000);
}

export function indicesToBinaryMask(bin) {
  const out = new Uint8Array(width * height).fill(0);
  console.log(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[bin[i]] = 1;
  }
  return out;
}
// export function countOccurrences(uint8Array: Uint8Array): object {
//   const counts = {};
//   for (let i = 0; i < uint8Array.length; i++) {
//     const value = uint8Array[i];
//     if (counts[value] === undefined) {
//       counts[value] = 1;
//     } else {
//       counts[value]++;
//     }
//   }
//   return counts;
// }

// --- Constants ---
export const originX = 82768;
export const originY = 5339;
// export const originY = 657439;
export const cellSize = 100; // meters per cell/hectare
export const fillOpacity = 0.5;
