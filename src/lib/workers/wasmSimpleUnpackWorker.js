import init, { binary_and } from "$lib/raster_ops/pkg/raster_ops.js";
// import { width, height, gridSize, sourceFolder } from "$lib/constants";
import { makeFileNameDatasetKey, buildTileFilename } from "$lib/utils";

let wasmReady = false;
async function ensureWasm() {
  if (!wasmReady) {
    await init();
    wasmReady = true;
  }
}

function isTiledDataset(layerKey, gridMeta) {
  return gridMeta[layerKey]?.tile_codes?.length > 0;
}

function intersectUint32(a, b) {
  if (a.length === 0 || b.length === 0) {
    return new Uint32Array(0);
  }

  // Build the Set from the smaller array
  let small = a,
    large = b;
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
  const {
    layersToUnpack,
    base,
    policyLens,
    customArea,
    settingsObject,
    grid10mVariables = {},
  } = e.data;
  const { gridSize, sourceFolder } = settingsObject;
  const processedCustomArea = new Uint32Array(customArea);
  console.log("starting to unpack", { policyLens });
  console.time("unpack");
  try {
    await ensureWasm();

    let lensLayer = null;

    // async function loadLensMask() {
    //   const url = `${base}/data/${sourceFolder}/${policyLens}`;
    //   const response = await fetch(url).then((r) => r.arrayBuffer());
    //   // if (!response.ok) throw new Error(`Failed to load ${url}`);

    //   const bin = new Uint32Array(response.slice(0));

    //   return bin;
    // }

    async function loadLensMask() {
      const layerKey = makeFileNameDatasetKey(policyLens);

      // England = full mask
      if (policyLens === "England") {
        return null;
      }

      // Custom area already prepared in memory
      if (policyLens === "customArea") {
        return processedCustomArea;
      }

      // Multi-tile dataset
      if (isTiledDataset(layerKey, grid10mVariables)) {
        const meta = grid10mVariables[layerKey];

        const tileArrays = await Promise.all(
          meta.tile_codes.map(async (code) => {
            const filename = buildTileFilename(code, layerKey, meta);
            const url = `${base}/data/${sourceFolder}/${filename}`;
            const buffer = await fetch(url).then((r) => r.arrayBuffer());
            return new Uint32Array(buffer);
          }),
        );

        // Merge tiles
        const totalLength = tileArrays.reduce(
          (sum, arr) => sum + arr.length,
          0,
        );
        const merged = new Uint32Array(totalLength);

        let offset = 0;
        for (const arr of tileArrays) {
          merged.set(arr, offset);
          offset += arr.length;
        }

        merged.sort(); // safe unless you guarantee sorted tiles

        return merged;
      }

      // Legacy single-file dataset
      const url = `${base}/data/${sourceFolder}/${policyLens}`;
      const buffer = await fetch(url).then((r) => r.arrayBuffer());
      return new Uint32Array(buffer);
    }

    // if (policyLens !== "England") {
    //   // console.log(processedCustomArea)
    //   lensLayer = policyLens === 'customArea' ? processedCustomArea : await loadLensMask();
    //   console.log("Loaded policy lens", lensLayer.length);
    // }

    lensLayer = await loadLensMask();

    const enrichedRasterLayers = await Promise.all(
      layersToUnpack.map(async (layer) => {
        // const url = `${base}/data/${sourceFolder}/${layer.filename}`;
        // const response = await fetch(url).then((r) => r.arrayBuffer());
        // // if (!response.ok) throw new Error(`Failed to load ${url}`);

        // const bin = new Uint32Array(response.slice(0));
        // // console.log(bin);

        const layerKey = makeFileNameDatasetKey(layer.filename);

        let bin;

        if (isTiledDataset(layerKey, grid10mVariables)) {
          const meta = grid10mVariables[layerKey];
          // console.log(layerKey);
          const tileArrays = await Promise.all(
            meta.tile_codes.map(async (code) => {
              const filename = buildTileFilename(code, layerKey, meta);
              const url = `${base}/data/${sourceFolder}/${filename}`;
              const buffer = await fetch(url).then((r) => r.arrayBuffer());
              return new Uint32Array(buffer);
            }),
          );

          // Merge + sort
          const totalLength = tileArrays.reduce(
            (sum, arr) => sum + arr.length,
            0,
          );
          const merged = new Uint32Array(totalLength);

          let offset = 0;
          for (const arr of tileArrays) {
            merged.set(arr, offset);
            offset += arr.length;
          }

          merged.sort(); // if needed

          bin = merged;
        } else {
          // Legacy single-file dataset
          const url = `${base}/data/${sourceFolder}/${layer.filename}`;
          const buffer = await fetch(url).then((r) => r.arrayBuffer());
          bin = new Uint32Array(buffer);
        }

        let result = bin;

        // Apply policy lens (if needed)
        if (lensLayer) {
          // binary_and(result, lensLayer.data);
          result = intersectUint32(result, lensLayer);
        }

        let area = result.length;
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
        policyLensArea:
          lensLayer?.length ?? (13_046_002 * 10_000) / (gridSize * gridSize),
        lensIndices: lensLayer,
      },
      enrichedRasterLayers.map((layer) => layer.data.buffer),
    );
    console.timeEnd("unpack");
  } catch (error) {
    console.error("unpackWorker error:", error);
    self.postMessage({ error: error.message || "Unknown error" });
  }
};
