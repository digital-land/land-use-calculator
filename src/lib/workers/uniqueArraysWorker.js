self.onmessage = function (e) {
  try {
    const { arrays } = e.data;

    // Rebuild typed arrays from transferred buffers
    const rebuiltArrays = arrays.map((buf) => new Uint32Array(buf));
    const count = rebuiltArrays.length;

    if (count === 0) {
      self.postMessage({ uniqueCounts: null, uniqueIndicesPerArray: null });
      return;
    }

    // ------------------------------------------------------------
    // 1. Find max index (single cheap scan)
    // ------------------------------------------------------------
    let maxIndex = 0;
    for (const arr of rebuiltArrays) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] > maxIndex) maxIndex = arr[i];
      }
    }

    // ------------------------------------------------------------
    // 2. Allocate tracking arrays
    // ------------------------------------------------------------
    // freq: 0 = unseen, 1 = seen once, 2 = seen multiple times
    const freq = new Uint8Array(maxIndex + 1);
    const owner = new Int32Array(maxIndex + 1);

    // ------------------------------------------------------------
    // 3. Count pass
    // ------------------------------------------------------------
    for (let i = 0; i < count; i++) {
      const arr = rebuiltArrays[i];

      for (let k = 0; k < arr.length; k++) {
        const idx = arr[k];

        if (freq[idx] === 0) {
          freq[idx] = 1;
          owner[idx] = i;
        } else if (freq[idx] === 1) {
          freq[idx] = 2; // clamp at 2
        }
      }
    }

    // ------------------------------------------------------------
    // 4. Count uniques per array
    // ------------------------------------------------------------
    const uniqueCounts = new Uint32Array(count);

    for (let idx = 0; idx <= maxIndex; idx++) {
      if (freq[idx] === 1) {
        uniqueCounts[owner[idx]]++;
      }
    }

    // ------------------------------------------------------------
    // 5. Allocate exact-size result arrays
    // ------------------------------------------------------------
    const uniqueIndicesPerArray = new Array(count);
    const writePointers = new Uint32Array(count);

    for (let i = 0; i < count; i++) {
      uniqueIndicesPerArray[i] = new Uint32Array(uniqueCounts[i]);
    }

    // ------------------------------------------------------------
    // 6. Fill unique index arrays
    // ------------------------------------------------------------
    for (let idx = 0; idx <= maxIndex; idx++) {
      if (freq[idx] === 1) {
        const owningArray = owner[idx];
        uniqueIndicesPerArray[owningArray][writePointers[owningArray]++] = idx;
      }
    }

    // ------------------------------------------------------------
    // 7. Transfer buffers back to main thread
    // ------------------------------------------------------------
    const transferList = [
      uniqueCounts.buffer,
      ...uniqueIndicesPerArray.map((arr) => arr.buffer),
    ];

    self.postMessage(
      {
        uniqueCounts: uniqueCounts.buffer,
        uniqueIndicesPerArray: uniqueIndicesPerArray.map((arr) => arr.buffer),
      },
      transferList,
    );
  } catch (err) {
    self.postMessage({ error: err.message || "Unknown error" });
  }
};
