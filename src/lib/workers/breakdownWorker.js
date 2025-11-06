import init, { categorical_count_masked } from "$lib/raster_ops/pkg/raster_ops.js";

function unpackBitmask(rawMask, nPixels) {
  const unpacked = new Uint8Array(nPixels);
  for (let i = 0; i < nPixels; i++) {
    const byte = rawMask[i >> 3]; // 8 pixels per byte
    const bit = (byte >> (i & 7)) & 1;
    unpacked[i] = bit;
  }
  return unpacked;
}

let wasmReady = false;

self.onmessage = async (e) => {
  if (!wasmReady) {
    try {
      await init(new URL("$lib/raster_ops/pkg/raster_ops_bg.wasm", import.meta.url));
      wasmReady = true;
      console.log("✅ WASM initialized in worker");
    } catch (err) {
      console.error("WASM init error:", err);
      return;
    }
  }

  const { categoricalArray, bitArray } = e.data;

  const a = unpackBitmask(bitArray, categoricalArray.length);

  const c = new Uint16Array(categoricalArray.buffer);
  const b = new Uint8Array(bitArray.buffer);

  console.log("Received arrays:", c.length, a.length);

  // 🔍 Check lengths
  if (c.length !== a.length) {
    console.error("❌ Length mismatch:", c.length, a.length);
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


  try {
    const result = categorical_count_masked(c, a, 400);
    self.postMessage({ json: result });
  } catch (err) {
    console.error("categorical_count_masked failed:", err);
    self.postMessage({ error: err.message });
  }
};
