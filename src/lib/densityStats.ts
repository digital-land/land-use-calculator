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

  const indexOfMaxValue = densityArray.indexOf(max);

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  const histogram: DensityHistogram = {
    Unregistered: 0,
    Private: 0,
    "UK company": 0,
    "Overseas company": 0,
  };

  for (const v of values) {
    if (v === 0) histogram["Unregistered"]++;
    else if (v === 1) histogram["Private"]++;
    else if (v === 2) histogram["UK company"]++;
    else if (v === 3) histogram["Overseas company"]++;
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
