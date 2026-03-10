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

    let { indexArrays } = e.data;

    // Rebuild Uint32Arrays from transferred buffers
    indexArrays = indexArrays.map((b) => new Uint32Array(b));

    if (indexArrays.length === 0) {
      throw new Error("No input arrays");
    }

function uniqueUnionBySort(arrays) {
  // console.log(arrays)
  let total = 0;
  for (const a of arrays) total += a.length;

  const merged = new Uint32Array(total);
  let offset = 0;
  for (const a of arrays) {
    merged.set(a, offset);
    offset += a.length;
  }

  merged.sort();

  let uniqueCount = 0;
  for (let i = 0; i < merged.length; i++) {
    if (i === 0 || merged[i] !== merged[i - 1]) {
      merged[uniqueCount++] = merged[i];
    }
  }

  return merged.subarray(0, uniqueCount);
}


const result = uniqueUnionBySort(indexArrays)
let activeCount = result.length
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
