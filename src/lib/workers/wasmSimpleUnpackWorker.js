import { fromBlob } from "geotiff";
import init, { binary_and } from "$lib/raster_ops/pkg/raster_ops.js";
import { width, height } from "$lib/constants";

let wasmReady = false;
async function ensureWasm() {
  if (!wasmReady) {
    await init();
    wasmReady = true;
  }
}

function indicesToBinaryMask(bin) {
  const out = new Uint8Array(width * height).fill(0);
  console.log(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[bin[i]] = 1;
  }

  return { data: out, area: bin.length };
}

function rasterToBinaryMask(raster) {
  const out = new Uint8Array(raster.length);
  let count = 0;

  for (let i = 0; i < raster.length; i++) {
    if (raster[i]) {
      out[i] = 1;
      count++;
    }
  }

  return { data: out, area: count };
}

function countActive(mask) {
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) count++;
  }
  return count;
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
      const url = `${base}/data/PUBLIC_BIN_LAYERS/${policyLens}`;
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
      return indicesToBinaryMask(bin);
    }

    if (policyLens !== "England") {
      // console.log(processedCustomArea)
      lensLayer = policyLens === 'customArea' ? indicesToBinaryMask(processedCustomArea) : await loadLensMask();
      console.log("Loaded policy lens", lensLayer.area);
    }

    const enrichedRasterLayers = await Promise.all(
      layersToUnpack.map(async (layer) => {
        const url = `${base}/data/PUBLIC_BIN_LAYERS/${layer.filename}`;
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
        const { data: result } = indicesToBinaryMask(bin);
        // console.log(result.findIndex((e) => e == 1));
        // 2️⃣ Apply policy lens using WASM (if needed)
        if (lensLayer) {
          binary_and(result, lensLayer.data);
        }
        console.log(result);
        // console.log(result.findIndex((e) => e == 1));
        // 3️⃣ Count active pixels
        const area = countActive(result);
        console.log(area);
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
        policyLensArea: lensLayer?.area ?? 13_046_002,
        policyLensLayer: lensLayer?.data,
      },
      enrichedRasterLayers.map((layer) => layer.data.buffer),
    );
    console.timeEnd("unpack");
  } catch (error) {
    console.error("unpackWorker error:", error);
    self.postMessage({ error: error.message || "Unknown error" });
  }
};
