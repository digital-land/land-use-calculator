import init, {
  categorical_count_masked,
} from "$lib/raster_ops/pkg/raster_ops.js";

import { parseCsvForBreakdown, unpackABGR } from "$lib/utils";
import areaSizeLookup from "$lib/data/areas_las_pixels.json";

let wasmReady = false;

let laLookupCache = null;
let laLookupUrlCache = null;

async function getLaLookup(csvUrl) {
  if (laLookupCache && laLookupUrlCache === csvUrl) {
    return laLookupCache;
  }

  const response = await fetch(csvUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV at ${csvUrl}`);
  }

  const text = await response.text();

  laLookupCache = parseCsvForBreakdown(text);
  laLookupUrlCache = csvUrl;

  return laLookupCache;
}

self.onmessage = async (e) => {
  const {
    categoricalArray,
    selectionMask,
    areaMask,
    csvUrl,
    numCats = 64465,
    BREAKDOWN_LUT,
  } = e.data;

  if (!wasmReady) {
    await init({
      module_or_path: new URL(
        "$lib/raster_ops/pkg/raster_ops_bg.wasm",
        import.meta.url,
      ),
    });

    wasmReady = true;
  }

  try {
    const minLen = areaMask
      ? Math.min(categoricalArray.length, selectionMask.length, areaMask.length)
      : Math.min(categoricalArray.length, selectionMask.length);

    const categories = categoricalArray.subarray(0, minLen);
    const selectedMask = selectionMask.subarray(0, minLen);

    let selectedCounts;
    let totalCounts = null;

    if (areaMask) {
      const area = areaMask.subarray(0, minLen);

      const combinedMask = new Uint8Array(minLen);

      for (let i = 0; i < minLen; i++) {
        combinedMask[i] = selectedMask[i] && area[i] ? 1 : 0;
      }

      totalCounts = categorical_count_masked(categories, area, numCats);

      selectedCounts = categorical_count_masked(
        categories,
        combinedMask,
        numCats,
      );
    } else {
      selectedCounts = categorical_count_masked(
        categories,
        selectedMask,
        numCats,
      );
    }

    const lookup = await getLaLookup(csvUrl);

    const json = lookup.map((row) => {
      const idx = Number(row.index);

      const total = areaMask
        ? (totalCounts?.[idx] ?? 0)
        : (areaSizeLookup?.[idx + 1]?.["Pixel count"] ?? 0);

      const selected = selectedCounts?.[idx] ?? 0;

      return {
        area_code: row.area_code,
        area_name: row.area_name,
        selected_area: selected,
        total_area: total,
        selected_area_as_a_proportion_of_total_area:
          total > 0 ? selected / total : 0,
        color: unpackABGR(BREAKDOWN_LUT[idx]),
      };
    });

    self.postMessage({ json });
  } catch (err) {
    self.postMessage({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
