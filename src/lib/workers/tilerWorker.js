async function loadIndexedArray(url) {


  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint32Array(buffer);
}


self.onmessage = async (e) => {


  const { tileCodes, width, base } = e.data;

  const entries = await Promise.all(
    Object.entries(tileCodes).map(async ([key, code]) => {
	const url=`${base}/data/ten_metre/${code}_10_imaginaryNewTown_B_idx_32_2601.bin`
      const data = await loadIndexedArray(url);
      return [key, data];
    })
  );

  console.log("resolved entries", entries);
  const tiles = Object.fromEntries(entries);
  const grid = Array.from({ length: width }, (_, i) => i);

  // Parse active tiles
  const activeTiles = Object.keys(tiles).map((k) => {
    const [col, row] = k.split(",").map(Number);
    return { key: k, col, row };
  });

  // Determine used columns/rows
  const usedCols = [...new Set(activeTiles.map((t) => t.col))].sort(
    (a, b) => a - b,
  );
  const usedRows = [...new Set(activeTiles.map((t) => t.row))].sort(
    (a, b) => a - b,
  );

  // Compact remapping
  const colMap = Object.fromEntries(usedCols.map((c, i) => [c, i]));
  const rowMap = Object.fromEntries(usedRows.map((r, i) => [r, i]));
  const cols = usedCols.length;
  const rows = usedRows.length;


  function transform(index, tile) {
    const x = index % width;
    const y = Math.floor(index / width);
    const globalX = colMap[tile.col] * width + x;
    const globalY = rowMap[tile.row] * width + y;

    return globalY * (cols * width) + globalX;
  }

  const newArrays = Object.fromEntries(
    activeTiles.map((tile) => [
      tile.key,
      tiles[tile.key].map((v) => transform(v, tile)),
    ]),
  );

  const newSet = Object.values(newArrays).map(a => [...a]).flat().sort((a,b)=>a-b);

  try {
    //do something
    self.postMessage({ array: newSet });
  } catch (error) {
    self.postMessage({ error: error.message });
  }

};
