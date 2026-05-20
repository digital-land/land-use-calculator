// import init, {
//   categorical_count_masked,
// } from "$lib/raster_ops/pkg/raster_ops.js";
// import { parseCsv } from "$lib/utils";
// // import { base } from "$app/paths";
// const base = import.meta.env.BASE_URL || "/";
// import areaSizeLookup from "$lib/data/areas_las_pixels.json";
// import { hectareSettings } from "$lib/constants";
// const { width, height } = hectareSettings;

// let wasmReady = false;

// // Worker receives { categoricalArray: Uint16Array, bitArray: Uint16Array }
// self.onmessage = async (e) => {
//   const { categoricalArray, bitArray, csvUrl } = e.data;
//   // console.log("Worker received chunk:", categoricalArray.length, bitArray.length);

//   // Initialize WASM once
//   if (!wasmReady) {
//     try {
//       console.log("Initializing WASM...");
//       await init({
//         module_or_path: new URL(
//           "$lib/raster_ops/pkg/raster_ops_bg.wasm",
//           import.meta.url,
//         ),
//       });
//       wasmReady = true;
//       console.log("WASM ready");
//     } catch (err) {
//       console.error("WASM init error:", err);
//       self.postMessage({ error: err.message });
//       return;
//     }
//   }

//   try {
//     // Trim extra rows if needed (assumes full raster: width*height)
//     // const width = 5728;
//     // const height = 6521;
//     const expectedLength = width * height;

//     const c =
//       categoricalArray.length > expectedLength
//         ? categoricalArray.subarray(0, expectedLength)
//         : categoricalArray;

//     const b = bitArray; // already full length

//     console.log("Processing chunk:", c.length, b.length);

//     // Fetch CSV lookup once per message

//     const response = await fetch(csvUrl);
//     if (!response.ok) throw new Error(`Failed to fetch CSV at ${csvUrl}`);
//     const lookupCsv = await response.text();

//     const laLookup = parseCsv(lookupCsv);

//     const result = categorical_count_masked(c, b, 400);

//     const jsonResult = laLookup.map((d, i) => ({
//       area_code: d.area_code,
//       area_name: d.area_name,
//       selected_area: result[+d.index],
//       total_area: areaSizeLookup?.[d.index]?.["Pixel count"],
//       selected_area_as_a_proportion_of_total_area:
//         result[+d.index] / areaSizeLookup?.[d.index]?.["Pixel count"],
//     }));

//     // Post results back — do NOT transfer buffers
//     self.postMessage({ json: jsonResult });
//   } catch (err) {
//     console.error("Worker processing error:", err);
//     self.postMessage({ error: err.message });
//   }
// };

import init, {
  categorical_count_masked,
} from "$lib/raster_ops/pkg/raster_ops.js";
import { parseCsvForBreakdown, unpackABGR } from "$lib/utils";
import areaSizeLookup from "$lib/data/areas_las_pixels.json";
import { hectareSettings, shortCategoricalColorPalette } from "$lib/constants";

const { width, height } = hectareSettings;
let wasmReady = false;

let laLookupCache = null;
let laLookupUrlCache = null;

async function getLaLookup(csvUrl) {
  if (laLookupCache && laLookupUrlCache === csvUrl) return laLookupCache;

  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error(`Failed to fetch CSV at ${csvUrl}`);
  const lookupCsv = await response.text();

  laLookupCache = parseCsvForBreakdown(lookupCsv);
  laLookupUrlCache = csvUrl;
  return laLookupCache;
}

self.onmessage = async (e) => {
  const {
    categoricalArray,
    selectionMask,
    areaMask,
    csvUrl,
    numCats = 400,
    numChunks,
    BREAKDOWN_LUT,
  } = e.data;

  if (!wasmReady) {
    try {
      await init({
        module_or_path: new URL(
          "$lib/raster_ops/pkg/raster_ops_bg.wasm",
          import.meta.url,
        ),
      });
      wasmReady = true;
    } catch (err) {
      self.postMessage({ error: err.message });
      return;
    }
  }

  try {
    const expectedLength = width * height;
    const c =
      categoricalArray.length > expectedLength
        ? categoricalArray.subarray(0, expectedLength)
        : categoricalArray;

    const sel = selectionMask;

    // Optional restriction mask
    const hasAreaMask = !!areaMask;
    console.log({ areaMask, hasAreaMask });
    // Compute selected counts:
    // - if areaMask exists: selection AND areaMask
    // - else: selection only
    let selectedCounts;
    let totalCounts = null;

    if (hasAreaMask) {
      const minLen = Math.min(c.length, sel.length, areaMask.length);

      // combine masks (assumes 0/1 values; bitwise & is fine)
      const combined = new Uint8Array(minLen);
      for (let i = 0; i < minLen; i++)
        combined[i] = sel[i] & areaMask[i] ? 1 : 0;

      // totals within area
      totalCounts = categorical_count_masked(
        c.subarray(0, minLen),
        areaMask.subarray(0, minLen),
        numCats,
      );
      selectedCounts = categorical_count_masked(
        c.subarray(0, minLen),
        combined,
        numCats,
      );
    } else {
      selectedCounts = categorical_count_masked(c, sel, numCats);
    }

    const laLookup = await getLaLookup(csvUrl);

    const jsonResult = laLookup.map((d, i) => {
      const idx = +d.index;

      const total = hasAreaMask
        ? (totalCounts?.[idx] ?? 0)
        : (areaSizeLookup?.[idx + 1]?.["Pixel count"] / numChunks ?? 0);

      const selected = selectedCounts?.[idx] ?? 0;
      console.log(idx, totalCounts[idx], selectedCounts[idx]);
      return {
        area_code: d.area_code,
        area_name: d.area_name,
        selected_area: selected,
        total_area: total,
        selected_area_as_a_proportion_of_total_area: total
          ? selected / total
          : 0,
        color: unpackABGR(BREAKDOWN_LUT[idx]),
      };
    });
    console.log(jsonResult);

    self.postMessage({ json: jsonResult });
  } catch (err) {
    self.postMessage({ error: err.message });
  }
};
