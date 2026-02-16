self.onmessage = async function (e) {
  console.log("tilerWorker called");

  const { tiles, width } = e.data;

	// const tiles = {
	// 	"0,0": [11, 14, 15],
	// 	"1,0": [8, 12, 13],
	// 	"2,0": [1, 2],
	// 	"0,1": [2, 3, 7],
	// 	"2,1": [0, 1, 4],
	// 	// "2,2":[]
	// };

	const grid = Array.from({ length: width }, (_, i) => i);

	// Parse active tiles
	const activeTiles = Object.keys(tiles).map(k => {
		const [col, row] = k.split(",").map(Number);
		return { key: k, col, row };
	});

	// Determine used columns/rows
	const usedCols = [...new Set(activeTiles.map(t => t.col))].sort((a,b)=>a-b);
	const usedRows = [...new Set(activeTiles.map(t => t.row))].sort((a,b)=>a-b);

	// Compact remapping
	const colMap = Object.fromEntries(usedCols.map((c,i)=>[c,i]));
	const rowMap = Object.fromEntries(usedRows.map((r,i)=>[r,i]));

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
		activeTiles.map(tile => [
			tile.key,
			tiles[tile.key].map(v => transform(v, tile))
		])
	);

	const newSet = new Set(Object.values(newArrays).flat());

  try {
    //do something
    self.postMessage({ array:newSet });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
