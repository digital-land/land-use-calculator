self.onmessage = function (e) {
  try {
    const { arrays, selectedRestrictionIndex } = e.data;

    const rebuiltArrays = arrays.map(buf => new Uint32Array(buf));
    const count = rebuiltArrays.length;

    // 1. Find max index (cheap single scan)
    let maxIndex = 0;
    for (const arr of rebuiltArrays) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] > maxIndex) maxIndex = arr[i];
      }
    }

    // 2. Typed arrays instead of Maps
    const freq = new Uint8Array(maxIndex + 1);      // 0,1,2 (clamped)
    const owner = new Int32Array(maxIndex + 1);     // owning array index

    console.time("counting");

    // 3. Count pass
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

    console.timeEnd("counting");

    // 4. Count uniques per array + selected uniques
    const uniqueCounts = new Uint32Array(count);

    // First pass: count how many uniques belong to selectedRestrictionIndex
    let selectedCount = 0;

    for (let idx = 0; idx <= maxIndex; idx++) {
      if (freq[idx] === 1) {
        const owningArray = owner[idx];
        uniqueCounts[owningArray]++;

        if (owningArray === selectedRestrictionIndex) {
          selectedCount++;
        }
      }
    }

    // 5. Allocate exact-size result
    const uniqueIndices = new Uint32Array(selectedCount);
    let write = 0;

    for (let idx = 0; idx <= maxIndex; idx++) {
      if (freq[idx] === 1 && owner[idx] === selectedRestrictionIndex) {
        uniqueIndices[write++] = idx;
      }
    }

    self.postMessage(
      {
        uniqueCounts: uniqueCounts.buffer,
        uniqueIndices: uniqueIndices.buffer
      },
      [uniqueCounts.buffer, uniqueIndices.buffer]
    );

  } catch (err) {
    self.postMessage({ error: err.message || "Unknown error" });
  }
};
