  function countOccurrences(uint8Array) {
    const counts = {};
    for (let i = 0; i < uint8Array.length; i++) {
      const value = uint8Array[i];
      if (counts[value] === undefined) {
        counts[value] = 1;
      } else {
        counts[value]++;
      }
    }
    return counts;
  }

// worker.js
self.onmessage = function (e) {
  //console.log("returnUniquesWorker", e.data)
try{
  if(["2","4","6","8"].includes(e.data.id))console.log("returnUniquesWorker", e.data)
  const arrays  = e.data.bits;
  const id = e.data.id;
  const count = arrays.length;
  const length = arrays[0].length
  const result = new Uint8Array(length).fill(99);

  for (let i = 0; i < length; i++) {
    let foundIndex = -1;
    let seenOne = false;

    for (let j = 0; j < count; j++) {
      //if (j == 2 && arrays[j][i] == 1){ console.log("found one at ", i)}
      if (j!=7){ //!!!!!!!!!NOTE - THIS IS TO EXCLUDE THE ENGLAND LAYER AND SHOULD BE RECONSIDERED!!!!!!!!!!!!!!!!!
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
    }

    if (foundIndex !== -1) {
      result[i] = foundIndex
    }
  }


  self.postMessage({ result, id, count, length, occurrences: countOccurrences(result)}, [result.buffer]);
    } catch (err) {
    self.postMessage({ error: err.message || 'Unknown error' , id: e.data.id});
  }
};