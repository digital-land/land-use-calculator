// matrixWorker.js

self.onmessage = function (e) {
  //console.log("e",e)
  const arr = e.data.data; // Array of Uint8Arrays
  const id=e.data.id;
  const len = arr.length;
  const vectorLength = arr[0].length;

  const matrix = Array.from({ length: len }, () => Array(len).fill(0));

  for (let i = 0; i < len; i++) {
    for (let j = i; j < len; j++) {
      let count = 0;
      const ai = arr[i];
      const aj = arr[j];
      for (let n = 0; n < vectorLength; n++) {
        count += ai[n] & aj[n];
      }
      matrix[i][j] = count;
      if (i !== j) matrix[j][i] = count; // symmetric
    }
  }

  self.postMessage({matrix,id});
};