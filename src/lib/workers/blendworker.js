// src/lib/workers/blendWorker.js

self.onmessage = function (e) {
  try {
    console.log("blendWorker received message:", e.data);

    let { bitArrays, englandLength } = e.data;

    // Rebuild Uint8Arrays from transferred ArrayBuffers
    bitArrays = bitArrays.map((b, i) => {
      const arr = new Uint8Array(b);
      if (arr.length !== englandLength) {
        console.warn(`Array ${i} length mismatch: ${arr.length} vs ${englandLength}`);
      }
      return arr;
    });

    const result = new Uint8Array(englandLength);
    let activeCount = 0;

    for (let i = 0; i < englandLength; i++) {
      for (let j = 0; j < bitArrays.length; j++) {
        if (bitArrays[j][i] === 1) {
          result[i] = 1;
          activeCount++;
          break;
        }
      }

      if (i % 1_000_000 === 0 && i !== 0) {
        const progress = ((i / englandLength) * 100).toFixed(1);
        self.postMessage({ progress: parseFloat(progress) });
      }
    }

    self.postMessage(
      {
        type: "done",
        result,
        activeCount
      },
      [result.buffer] // ✅ transfer result buffer
    );

  } catch (error) {
    console.error("blendWorker error:", error);
    self.postMessage({ error: error.message || "Unknown error" });
  }
};
