self.onmessage = function (e) {
  try {
    const { arrays, start, end, selectedRestrictionIndex } = e.data;
    const count = arrays.length;
    const length = end - start;

    const result = new Uint8Array(length).fill(99);
    const uniqueResult = new Uint8Array(length).fill(99);

    for (let i = 0; i < length; i++) {
      let foundIndex = -1;
      let seenOne = false;

      for (let j = 0; j < count; j++) {
        const val = arrays[j][i];
        if (val === 1) {
          if (seenOne) {
            foundIndex = -1;
            break;
          }
          seenOne = true;
          foundIndex = j;
        }
      }

      if (foundIndex !== -1) {
        result[i] = foundIndex;

        // Assign to uniqueResult only if it matches selectedRestrictionIndex
        if (foundIndex === selectedRestrictionIndex) {
          uniqueResult[i] = 1;
        }
      }
    }

    self.postMessage(
      { result, uniqueResult },
      [result.buffer, uniqueResult.buffer]
    );
  } catch (err) {
    self.postMessage({ error: err.message || 'Unknown error' });
  }
};