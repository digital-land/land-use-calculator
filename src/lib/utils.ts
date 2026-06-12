//@ts-check

import { fromUrl } from "geotiff";
import { interpolateViridis } from "d3-scale-chromatic";
import ImageLayer from "ol/layer/Image.js";
import ImageStatic from "ol/source/ImageStatic";
import LayerGroup from "ol/layer/Group";
import ImageCanvasSource from "ol/source/ImageCanvas.js";
// import { width, height, gridSize, bbox } from "./constants";
import { tiles as tileMetadata, hectareBbox } from "./constants";

export const tileIndex = Object.fromEntries(
  tileMetadata.map((t) => [t.code, t]),
);

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

export async function loadIndexedArray(url) {
  try {
    const res = await fetch(url);
    // console.log("fetching hectare");
    if (!res.ok) return new Uint32Array(0); // ← key change
    return new Uint32Array(await res.arrayBuffer());
  } catch {
    return new Uint32Array(0); // network errors too
  }
}

export async function loadIndexedArrayUint16(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return new Uint16Array(0); // ← key change
    return new Uint16Array(await res.arrayBuffer());
  } catch {
    return new Uint16Array(0); // network errors too
  }
}

export function capitaliseFirst(str: string): string {
  return str?.[0] ? str[0].toUpperCase() + str.slice(1) : "";
}

export interface DataLayerItem {
  level: 1 | 2 | 3;
  tier: string;
  category: string;
  filename: string;
  initiallyChecked: boolean;
  dataLayer: string;
}

export type RawDataLayerRow = {
  Level: string;
  Tier: string;
  Category: string;
  filename: string;
  initially_checked: string;
  Data_layer: string;
};

export type DoughnutData = {
  color: string;
  name: string;
  selected: number;
  total: number;
};

function normaliseRow(row: RawDataLayerRow): DataLayerItem {
  const levelNum = Number(row.Level);

  // optional: enforce domain
  if (![1, 2, 3].includes(levelNum)) {
    throw new Error(`Invalid Level: "${row.Level}"`);
  }

  const initiallyChecked =
    row.initially_checked.trim().toLowerCase() === "y" ||
    row.initially_checked.trim().toLowerCase() === "yes" ||
    row.initially_checked.trim() === "1" ||
    row.initially_checked.trim().toLowerCase() === "true";

  return {
    level: levelNum as 1 | 2 | 3,
    tier: row.Tier?.trim() ?? "",
    category: row.Category?.trim() ?? "",
    filename: row.filename?.trim() ?? "",
    initiallyChecked,
    dataLayer: row.Data_layer?.trim() ?? "",
  };
}

export function parseCsv(csvText: string): DataLayerItem[] {
  const lines = csvText.trim().split("\n");
  const headers = lines[0]
    .trim()
    .split(",")
    .map((h) => h.replace("\r", ""));

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.replace("\r", ""));

    const row = {} as Record<string, string>;
    headers.forEach((h, i) => (row[h] = (values[i] ?? "").trim()));

    // Cast to RawDataLayerRow if you trust your CSV columns
    return normaliseRow(row as unknown as RawDataLayerRow);
  });
}

export function parseCsvForBreakdown(csvText: string): object[] {
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

export function parseCSVToObject(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",");

  const FIXED_COLUMNS = 6; // var, date, grid_size, data_type, datum, data_structure
  const result = {};

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row = {};

    // Extract fixed columns
    const varValue = values[0];
    row.date = values[1];
    row.grid_size = values[2];
    row.data_type = values[3];
    row.datum = values[4];
    row.data_structure = values[5];

    // Extract tile codes where value === "1"
    const tile_codes = [];

    for (let j = FIXED_COLUMNS; j < headers.length; j++) {
      if (values[j] === "1") {
        tile_codes.push(headers[j].split("_")[0]);
      }
    }

    row.tile_codes = tile_codes;

    result[varValue] = row;
  }

  return result;
}

export function jsonToCsv(
  items: object[],
  // policyLens: string,
  // policyLensItems: PolicyLensItem[],
  selectedAreaWording: string,
  selected: string[],
  gridType: string,
): string {
  const title = `"Selected area covers : ${selected.map((d) => makeFileNameReadable(d, gridType)).join(", ")}"\r\n`;
  const footer =
    "\r\n Notes: \r\n 1. All figures are in hectares. \r\n 2. This is an experimental product under development.";
  const caveat =
    "Selected area figures relate to the area within " +
    selectedAreaWording +
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

export function makeFileNameReadable(
  filename: string,
  gridType: string = "hectare",
): string {
  // console.log(filename);
  // return filename.replace(".bin", "").replace(".tif", "").replaceAll("_", " ");

  return filename
    ?.split("_")
    [gridType === "hectare" ? 2 : 1]?.replace(
      /([A-Z])/g,
      (match) => ` ${match}`,
    )
    .replace(/^./, (match) => match.toUpperCase())
    .trim();
}

export function makeFileNameDatasetKey(filename: string): string {
  return filename.replace(".bin", "").replace(".tif", "");
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

export function geometryToGridHitsScanline(geometry, bbox, width, height) {
  const hits = [];

  const cellWidth = (bbox[2] - bbox[0]) / width;
  const cellHeight = (bbox[3] - bbox[1]) / height;

  const polyExtent = geometry.getExtent();

  // const tileCodes = tilesForBBox(polyExtent, tileIndex, 50000);
  // console.log("tile codes in geometryToGridHitsScanline: ", tileCodes);

  const rowMin = Math.max(
    0,
    Math.floor((bbox[3] - polyExtent[3]) / cellHeight),
  );

  const rowMax = Math.min(
    height - 1,
    Math.ceil((bbox[3] - polyExtent[1]) / cellHeight),
  );
  console.log("settings in geomToGridScan", {
    bbox,
    width,
    height,
    cellWidth,
    cellHeight,
    rowMin,
    rowMax,
  });
  // normalize geometry → array of polygons
  const polygons =
    geometry.getType() === "Polygon"
      ? [geometry.getCoordinates()]
      : geometry.getCoordinates(); // MultiPolygon

  for (let row = rowMin; row <= rowMax; row++) {
    // const y = bbox[1] + (row + 0.5) * cellHeight;
    const y = bbox[3] - (row + 0.5) * cellHeight;

    const intersections = [];

    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (let i = 0; i < ring.length - 1; i++) {
          const [x1, y1] = ring[i];
          const [x2, y2] = ring[i + 1];

          if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
            const t = (y - y1) / (y2 - y1);
            const x = x1 + t * (x2 - x1);

            intersections.push(x);
          }
        }
      }
    }

    intersections.sort((a, b) => a - b);

    for (let i = 0; i < intersections.length; i += 2) {
      const xStart = intersections[i];
      const xEnd = intersections[i + 1];

      if (xEnd === undefined) break;

      const colStart = Math.max(
        0,
        Math.ceil((xStart - bbox[0]) / cellWidth - 0.5),
      );

      const colEnd = Math.min(
        width - 1,
        Math.floor((xEnd - bbox[0]) / cellWidth - 0.5),
      );

      for (let col = colStart; col <= colEnd; col++) {
        hits.push(row * width + col);
      }
    }
  }
  // console.log("customArea in geomToGridHits: ", hits);
  return hits;
}

function tileExtent(t, tileSizeM) {
  return [t.east, t.north, t.east + tileSizeM, t.north + tileSizeM];
}

// bbox = [minE, minN, maxE, maxN]
function intersects(a, b) {
  return !(b[0] >= a[2] || b[2] <= a[0] || b[1] >= a[3] || b[3] <= a[1]);
}

export function tilesForBBox(bbox, tileIndex, tileSizeM) {
  const codes = [];
  for (const code in tileIndex) {
    const t = tileIndex[code];
    if (!t) continue;
    const ext = tileExtent(t, tileSizeM);
    if (intersects(bbox, ext)) codes.push(code);
  }
  return codes;
}

// --- Load GeoTIFF ---
export async function loadDensityTiff(
  url: string,
  bbox: number[],
): Promise<{
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
  console.log({ rasters });
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

export async function createDensityCanvas(
  densityCanvas: HTMLCanvasElement | undefined,
  blendedIndices: Uint32Array,
  densityArray: Uint16Array,
  DENSITY_LUT: Uint32Array,
  height: number,
  width: number,
) {
  if (!densityCanvas) return;
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

export async function createDensityLayerMobile(
  blendedIndices: Uint32Array,
  densityArray: Uint16Array,
  DENSITY_LUT: Uint32Array,
  bbox: [number, number, number, number],
  opacity: number,
  height: number,
  width: number,
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

        if (gx >= x0 && gx < x0 + w && gy >= y0 && gy < y0 + h) {
          const localX = gx - x0;
          const localY = gy - y0;
          const localIndex = localY * w + localX;

          pixels[localIndex] = DENSITY_LUT[densityArray[globalIndex]];
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const blob = await new Promise<Blob>((r) =>
        canvas.toBlob(r, "image/png"),
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

export function unpackABGR(packed: number) {
  const r = packed & 0xff;
  const g = (packed >>> 8) & 0xff;
  const b = (packed >>> 16) & 0xff;
  const a = (packed >>> 24) & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function convertPixelsToHectares(
  value: number,
  gridSize: number,
): number {
  return (value * gridSize * gridSize) / 10_000;
}

export function indicesToBinaryMask(bin, width, height) {
  const out = new Uint8Array(width * height).fill(0);
  console.log(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[bin[i]] = 1;
  }
  return out;
}

export function getTheInverse(
  englandUint32Array: Uint32Array,
  inputUint32Array: Uint32Array,
): Uint32Array {
  console.time("inverse");
  const result: number[] = [];

  let i = 0;
  let j = 0;

  while (i < englandUint32Array.length) {
    if (
      j >= inputUint32Array.length ||
      englandUint32Array[i] < inputUint32Array[j]
    ) {
      result.push(englandUint32Array[i]);
      i++;
    } else if (englandUint32Array[i] === inputUint32Array[j]) {
      i++;
      j++;
    } else {
      j++;
    }
  }

  console.timeEnd("inverse");
  return new Uint32Array(result);
}

// --- Constants ---
// export const originX = 82768;
// export const originY = 5339;
export const originX = hectareBbox[0];
export const originY = hectareBbox[1];

// export const originY = 657439;
export const cellSize = 100; // meters per cell/hectare
export const fillOpacity = 0.5;

export function buildTileFilename(tileCode, varName, meta) {
  const { grid_size, data_type, datum, data_structure, date } = meta;

  return `${tileCode}_${grid_size}_${varName}_${data_type}_${datum}_${data_structure}_${date}.bin`;
}

export function getBBoxFromTileCodes(
  tileCodes,
  gridSize,
  tileWidth,
): [number, number, number, number] {
  let minEast = Math.min(...tileCodes.map((d) => tileIndex[d].east));
  let minNorth = Math.min(...tileCodes.map((d) => tileIndex[d].north));
  let maxEast = Math.max(...tileCodes.map((d) => tileIndex[d].east));
  let maxNorth = Math.max(...tileCodes.map((d) => tileIndex[d].north));
  // console.log("in getBBoxFromTileCodes, bbox is: ", [
  //   minEast,
  //   minNorth,
  //   maxEast + gridSize * tileWidth,
  //   maxNorth + gridSize * tileWidth,
  // ]);
  return [
    minEast,
    minNorth,
    maxEast + gridSize * tileWidth,
    maxNorth + gridSize * tileWidth,
  ];
}
