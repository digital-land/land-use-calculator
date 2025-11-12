import init, { categorical_count_masked } from "$lib/raster_ops/pkg/raster_ops.js";
import { parseCsv } from "$lib/utils";
import { base } from "$app/paths";

// function unpackBitmask(rawMask, nPixels) {
//   const unpacked = new Uint8Array(nPixels);
//   for (let i = 0; i < nPixels; i++) {
//     const byte = rawMask[i >> 3]; // 8 pixels per byte
//     const bit = (byte >> (i & 7)) & 1;
//     unpacked[i] = bit;
//   }
//   return unpacked;
// }

let wasmReady = false;

self.onmessage = async (e) => {
  if (!wasmReady) {
    try {
      await init({
  module_or_path: new URL("$lib/raster_ops/pkg/raster_ops_bg.wasm", import.meta.url)
});
      wasmReady = true;
      console.log("✅ WASM initialized in worker");
    } catch (err) {
      console.error("WASM init error:", err);
      return;
    }
  }

  const { categoricalArray, bitArray } = e.data;

  // const a = bitArray

const expectedLength = 5728 * 6521;
const c = new Uint16Array(categoricalArray.buffer.slice(0, expectedLength * 2));
  const b = new Uint8Array(bitArray.buffer);

  console.log("Received arrays C:", c.length, "B: ",b.length);

  // 🔍 Check lengths
  if (c.length !== b.length) {
    console.error("❌ Length mismatch:", c.length, b.length);
    self.postMessage({ error: "Length mismatch" });
    return;
  }

  // 🔍 Check for invalid values
  
  const uniqueMask = [...new Set(b)];
  console.log("unique mask values:", uniqueMask);

  if (uniqueMask.some(v => v > 1)) {
    console.error("❌ Mask contains non-binary values");
    return;
  }

  const response = await fetch(`${base}/data/LAs/lad_may_2025_lookup.csv`);
    if (!response.ok) throw new Error("Failed to fetch CSV");
    let lookupCsv = await response.text();
      // console.log(metadataCsv);

    let laLookup = parseCsv(lookupCsv);
      // console.log(laLookup)

  try {
    const result = categorical_count_masked(c, b, 400);
    let total = result.reduce((a, b) => a + b, 0);
    // console.log("Total masked elements counted:", total);
    const jsonResult = laLookup.map((d, i) => {return {"area_code": d.area_code ,'area_name': d.area_name, "value": result[+d.index]}} ) 
    // console.log(result, laLookup.map((d, i) => {return {[d.area_name]: result[+d.index]}} ))
    self.postMessage({ json: jsonResult, categoricalArray, bitArray},[categoricalArray.buffer, bitArray.buffer]);
  } catch (err) {
    console.error("categorical_count_masked failed:", err);
    self.postMessage({ error: err.message });
  }
};
