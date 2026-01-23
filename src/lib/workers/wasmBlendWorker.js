import init, { binary_or } from "$lib/raster_ops/pkg/raster_ops.js";

let wasmReady = false;

async function ensureWasm() {
  if (!wasmReady) {
    await init();
    wasmReady = true;
  }
}

self.onmessage = async function (e) {
  try {
    await ensureWasm();

    let { bitArrays } = e.data;

    // Rebuild Uint8Arrays from transferred buffers
    bitArrays = bitArrays.map((b) => new Uint8Array(b));

    if (bitArrays.length === 0) {
      throw new Error("No input arrays");
    }

    // Clone first array as accumulator
    const result = bitArrays[0].slice();

    // OR-reduce using WASM
    for (let i = 1; i < bitArrays.length; i++) {
      binary_or(result, bitArrays[i]);
    }

    // Count active bits
    let activeCount = 0;
    for (let i = 0; i < result.length; i++) {
      if (result[i] === 1) activeCount++;
    }

    self.postMessage(
      {
        type: "done",
        result,
        activeCount
      },
      [result.buffer]
    );

  } catch (error) {
    console.error("blendWorker error:", error);
    self.postMessage({ error: error.message || "Unknown error" });
  }
};
