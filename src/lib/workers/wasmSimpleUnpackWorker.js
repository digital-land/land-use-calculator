import init, { binary_and } from "$lib/raster_ops/pkg/raster_ops.js";
// import { width, height, gridSize, sourceFolder } from "$lib/constants";

let wasmReady = false;
async function ensureWasm() {
  if (!wasmReady) {
    await init();
    wasmReady = true;
  }
}

function intersectUint32(a, b) {
  if (a.length === 0 || b.length === 0) {
    return new Uint32Array(0);
  }

  // Build the Set from the smaller array
  let small = a, large = b;
  if (a.length > b.length) {
    small = b;
    large = a;
  }

  const set = new Set();
  for (let i = 0; i < small.length; i++) {
    set.add(small[i]);
  }

  const result = new Uint32Array(Math.min(small.length, large.length));
  let k = 0;

  for (let i = 0; i < large.length; i++) {
    const v = large[i];
    if (set.has(v)) {
      result[k++] = v;
    }
  }

  return result.subarray(0, k);
}


self.onmessage = async function (e) {
  const { layersToUnpack, base, policyLens, customArea, settingsObject } = e.data;
  const { width, height, gridSize, sourceFolder } = settingsObject;
  const processedCustomArea = new Uint32Array(customArea)
  console.log("starting to unpack", { policyLens });
  console.time("unpack");
  try {
    await ensureWasm();

    let lensLayer = null;

    async function loadLensMask() {
      const url = `${base}/data/${sourceFolder}/${policyLens}`;
      const response = await fetch(url).then((r) => r.arrayBuffer());
      // if (!response.ok) throw new Error(`Failed to load ${url}`);

      const bin = new Uint32Array(response.slice(0));

      return bin;
    }

    if (policyLens !== "England") {
      // console.log(processedCustomArea)
      lensLayer = policyLens === 'customArea' ? processedCustomArea : await loadLensMask();
      console.log("Loaded policy lens", lensLayer.length);
    }

    const enrichedRasterLayers = await Promise.all(
      layersToUnpack.map(async (layer) => {
        const url = `${base}/data/${sourceFolder}/${layer.filename}`;
        const response = await fetch(url).then((r) => r.arrayBuffer());
        // if (!response.ok) throw new Error(`Failed to load ${url}`);

        const bin = new Uint32Array(response.slice(0));
        // console.log(bin);

        let result = bin;
        
        // Apply policy lens (if needed)
        if (lensLayer) {
          // binary_and(result, lensLayer.data);
          result = intersectUint32(result, lensLayer)
        }
        
        let area = result.length
        // console.log(area);
        return {
          ...layer,
          area,
          data: result,
        };
      }),
    );

    self.postMessage(
      {
        rasterLayers: enrichedRasterLayers,
        policyLensArea: lensLayer?.length ?? (13_046_002 * 10_000)/(gridSize*gridSize),
        lensIndices: lensLayer,
      },
      enrichedRasterLayers.map((layer) => layer.data.buffer)
    );
    console.timeEnd("unpack");
  } catch (error) {
    console.error("unpackWorker error:", error);
    self.postMessage({ error: error.message || "Unknown error" });
  }
};
