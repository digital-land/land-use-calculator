import type { GridConfig } from "./utils";
import { uploadedIndexToFullIndex } from "./utils";

export interface DensityStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  indexOfMaxValue: number | null;
}

export type DensityHistogram = Record<string, number>;

export function computeDensityStats(
  paintedIndices: Uint32Array,
  densityArray: Uint16Array,
  gridConfig: GridConfig,
): { stats: DensityStats; histogram: DensityHistogram } {
  if (!densityArray || paintedIndices?.length === 0 || !paintedIndices) {
    return {
      stats: {
        count: 0,
        sum: 0,
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        indexOfMaxValue: null,
      },
      histogram: {},
    };
  }

  const values: number[] = [];

  for (const i of paintedIndices) {
    const full = uploadedIndexToFullIndex(i, gridConfig);
    const v = densityArray[full];
    if (v !== undefined) values.push(v);
  }

  if (values.length === 0) {
    return {
      stats: { count: 0, sum: 0, mean: 0, median: 0, min: 0, max: 0 },
      histogram: {},
    };
  }

  let sum = 0;
  let min = values[0];
  let max = values[0];

  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  // const indexOfMaxValue = densityArray.indexOf(max);
  const indexOfMaxValue = paintedIndices[values.indexOf(max)];

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  const histogram: DensityHistogram = {
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

  return {
    stats: {
      count: values.length,
      sum,
      mean: sum / values.length,
      median,
      min,
      max,
      indexOfMaxValue,
    },
    histogram,
  };
}
