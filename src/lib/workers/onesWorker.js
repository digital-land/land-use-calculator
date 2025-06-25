// worker.js
self.onmessage = function (e) {
  console.log("onsesWorker")
try{
  const { arrays, start, end } = e.data;
  const count = arrays.length;
  const length = end - start;
  const result = new Uint8Array(length).fill(99);

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
      result[i] = foundIndex
    }
  }

  self.postMessage({ result }, [result.buffer]);
    } catch (err) {
    self.postMessage({ error: err.message || 'Unknown error' });
  }
};