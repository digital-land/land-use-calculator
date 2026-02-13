import { fromBlob } from "geotiff";
import init, { binary_and } from "$lib/raster_ops/pkg/raster_ops.js";
import { width, height, gridSize, sourceFolder } from "$lib/constants";

let wasmReady = false;
async function ensureWasm() {
  if (!wasmReady) {
    await init();
    wasmReady = true;
  }
}

// function indicesToBinaryMask(bin) {
//   const out = new Uint8Array(width * height).fill(0);
//   console.log(bin.length);
//   for (let i = 0; i < bin.length; i++) {
//     out[bin[i]] = 1;
//   }

//   return { data: out, area: bin.length };
// }

// function rasterToBinaryMask(raster) {
//   const out = new Uint8Array(raster.length);
//   let count = 0;

//   for (let i = 0; i < raster.length; i++) {
//     if (raster[i]) {
//       out[i] = 1;
//       count++;
//     }
//   }

//   return { data: out, area: count };
// }

// function countActive(mask) {
//   let count = 0;
//   for (let i = 0; i < mask.length; i++) {
//     if (mask[i] === 1) count++;
//   }
//   return count;
// }

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
  const { layersToUnpack, base, policyLens, customArea } = e.data;
  const processedCustomArea = new Uint32Array(customArea)
  console.log("starting to unpack", { policyLens });
  console.time("unpack");
  try {
    await ensureWasm();

    // let width, height, bbox;
    let lensLayer = null;

    async function loadLensMask() {
      const url = `${base}/data/${sourceFolder}/${policyLens}`;
      const response = await fetch(url).then((r) => r.arrayBuffer());
      // if (!response.ok) throw new Error(`Failed to load ${url}`);

      // const blob = await response.blob();
      // const geotiff = await fromBlob(blob);
      // const image = await geotiff.getImage();

      // width = image.getWidth();
      // height = image.getHeight();
      // bbox = image.getBoundingBox();

      // const rasters = await image.readRasters();
      const bin = new Uint32Array(response.slice(0));

      // return rasterToBinaryMask(rasters[0]);
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

        // const blob = await response.blob();
        // const geotiff = await fromBlob(blob);
        // const image = await geotiff.getImage();

        // width = image.getWidth();
        // height = image.getHeight();
        // bbox = image.getBoundingBox();

        // const rasters = await image.readRasters();
        const bin = new Uint32Array(response.slice(0));
        // console.log(bin);

        // 1️⃣ Threshold raster → binary mask
        // const { data: result } = rasterToBinaryMask(rasters[0]);
        let result = bin;
        // console.log(result.findIndex((e) => e == 1));
        // 2️⃣ Apply policy lens using WASM (if needed)
        if (lensLayer) {
          // binary_and(result, lensLayer.data);
          result = intersectUint32(result, lensLayer)
        }
        // console.log(result);
        // console.log(result.findIndex((e) => e == 1));
        // 3️⃣ Count active pixels
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
        // width,
        // height,
        // bbox,
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
