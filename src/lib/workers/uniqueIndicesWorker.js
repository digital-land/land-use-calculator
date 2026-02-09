// self.onmessage = function (e) {
//   try {
//     const { arrays, selectedRestrictionIndex } = e.data;

//     let rebuiltArrays = arrays.map(arr => new Uint32Array(arr))

//     const count = rebuiltArrays.length;

//     // index -> number of arrays it appears in
//     const freq = new Map();

//     // index -> array index that owns it (only meaningful if freq === 1)
//     const owner = new Map();
// console.time('counting')
//     // 1. Build frequency + owner maps
//     for (let i = 0; i < count; i++) {
//       const arr = rebuiltArrays[i];

//       for (let k = 0; k < arr.length; k++) {
//         const idx = arr[k];

//         if (!freq.has(idx)) {
//           freq.set(idx, 1);
//           owner.set(idx, i);
//         } else {
//           freq.set(idx, freq.get(idx) + 1);
//         }
//       }
//     }

//     // 2. Count unique values per input array
//     const uniqueCounts = new Uint32Array(count);
// console.timeEnd('counting')
//     // 3. Collect unique indices for selectedRestrictionIndex
//     const selectedUniques = [];

//     for (const [idx, occurrences] of freq) {
//       if (occurrences === 1) {
//         const owningArray = owner.get(idx);
//         uniqueCounts[owningArray]++;

//         if (owningArray === selectedRestrictionIndex) {
//           selectedUniques.push(idx);
//         }
//       }
//     }

//     // Convert selected uniques to typed array
//     const uniqueIndices = new Uint32Array(selectedUniques);

//     self.postMessage(
//       { uniqueCounts: uniqueCounts.buffer, uniqueIndices: uniqueIndices.buffer },
//       [uniqueCounts.buffer, uniqueIndices.buffer]
//     );

//   } catch (err) {
//     self.postMessage({ error: err.message || 'Unknown error' });
//   }
// };

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
