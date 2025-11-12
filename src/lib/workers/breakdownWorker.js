import init, { categorical_count_masked } from "$lib/raster_ops/pkg/raster_ops.js";
import { parseCsv } from "$lib/utils";
import { base } from "$app/paths";

let wasmReady = false;

// Worker receives { categoricalArray: Uint16Array, bitArray: Uint16Array }
self.onmessage = async (e) => {
  const { categoricalArray, bitArray } = e.data;
  console.log("Worker received chunk:", categoricalArray.length, bitArray.length);

  // Initialize WASM once
  if (!wasmReady) {
    try {
      console.log("Initializing WASM...");
      await init({
        module_or_path: new URL("$lib/raster_ops/pkg/raster_ops_bg.wasm", import.meta.url),
      });
      wasmReady = true;
      console.log("WASM ready");
    } catch (err) {
      console.error("WASM init error:", err);
      self.postMessage({ error: err.message });
      return;
    }
  }

  try {
    // Trim extra rows if needed (assumes full raster: width*height)
    const width = 5728;
    const height = 6521;
    const expectedLength = width * height;

    const c = categoricalArray.length > expectedLength
      ? categoricalArray.subarray(0, expectedLength)
      : categoricalArray;

    const b = bitArray; // already full length

    console.log("Processing chunk:", c.length, b.length);

    // Fetch CSV lookup once per message
    const response = await fetch(`${base}/data/LAs/lad_may_2025_lookup.csv`);
    if (!response.ok) throw new Error("Failed to fetch CSV");
    const lookupCsv = await response.text();
    const laLookup = parseCsv(lookupCsv);

    const result = categorical_count_masked(c, b, 400);

    const jsonResult = laLookup.map((d, i) => ({
      area_code: d.area_code,
      area_name: d.area_name,
      value: result[+d.index],
    }));

    // Post results back — do NOT transfer buffers
    self.postMessage({ json: jsonResult });
  } catch (err) {
    console.error("Worker processing error:", err);
    self.postMessage({ error: err.message });
  }
};
