self.onmessage = function (e) {
  try {
    const { arrays, selectedRestrictionIndex } = e.data;
    const count = arrays.length;

    // index -> number of arrays it appears in
    const freq = new Map();

    // index -> array index that owns it (only meaningful if freq === 1)
    const owner = new Map();

    // 1. Build frequency + owner maps
    for (let i = 0; i < count; i++) {
      const arr = arrays[i];

      for (let k = 0; k < arr.length; k++) {
        const idx = arr[k];

        if (!freq.has(idx)) {
          freq.set(idx, 1);
          owner.set(idx, i);
        } else {
          freq.set(idx, freq.get(idx) + 1);
        }
      }
    }

    // 2. Count unique values per input array
    const uniqueCounts = new Uint32Array(count);

    // 3. Collect unique indices for selectedRestrictionIndex
    const selectedUniques = [];

    for (const [idx, occurrences] of freq) {
      if (occurrences === 1) {
        const owningArray = owner.get(idx);
        uniqueCounts[owningArray]++;

        if (owningArray === selectedRestrictionIndex) {
          selectedUniques.push(idx);
        }
      }
    }

    // Convert selected uniques to typed array
    const uniqueIndices = new Uint32Array(selectedUniques);

    self.postMessage(
      { uniqueCounts, uniqueIndices },
      [uniqueCounts.buffer, uniqueIndices.buffer]
    );

  } catch (err) {
    self.postMessage({ error: err.message || 'Unknown error' });
  }
};
