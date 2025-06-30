export default function (ladetails) {
  let matrices = ladetails.map((el) => el.matrix);
  let depth = matrices.length;
  let width = matrices[0].length;

  // Sum all matrices
  let sumMatrix = Array.from({ length: width }, () => Array(width).fill(0));

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < width; y++) {
      for (let x = 0; x < width; x++) {
        sumMatrix[y][x] += matrices[z][y][x];
      }
    }
  }

  // Normalize rows by diagonal values
  let normalizedMatrix = Array.from({ length: width }, () => Array(width).fill(0));

  for (let y = 0; y < width; y++) {
    const rowTotal = sumMatrix[y][y]; // total count for metric y
    for (let x = 0; x < width; x++) {
      normalizedMatrix[y][x] = rowTotal !== 0 ? sumMatrix[y][x] / rowTotal : 0;
    }
  }

  return {sumMatrix, normalizedMatrix}
}
