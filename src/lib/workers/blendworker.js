// src/lib/workers/blendWorker.js

self.onmessage = function (e) {
  try{
  const { bitArrays, englandMask } = e.data;
  const length = englandMask.length;
  const result = new Uint8Array(length);
  let activeCount = 0;

  for (let i = 0; i < length; i++) {


    for (let j = 0; j < bitArrays.length; j++) {
      if (bitArrays[j][i]) {
        result[i] = 1;
        activeCount++;
        break;
      }
    }

    // Progress update every 1M pixels (tweakable)
    if (i % 1_000_000 === 0) {
      self.postMessage({ progress: (i / length) * 100 });
    }
  }

  self.postMessage({
    type: 'done',
    result,
    activeCount
  });

    } catch (error) {
    self.postMessage({ error: error.message});
  }
};
