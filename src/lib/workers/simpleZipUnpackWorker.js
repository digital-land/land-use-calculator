import { fromArrayBuffer } from "geotiff";
import { indicesToBinaryMask, binaryMaskToIndices } from "$lib/utils";

// function indicesOfOnes(src) {
//   // First pass: count
//   let count = 0;
//   for (let i = 0; i < src.length; i++) {
//     if (src[i] === 1) count++;
//   }

//   // Allocate result
//   const result = new Uint32Array(count);

//   // Second pass: fill indices
//   let j = 0;
//   for (let i = 0; i < src.length; i++) {
//     if (src[i] === 1) {
//       result[j++] = i;
//     }
//   }

//   return result;
// }

self.onmessage = async function (e) {
  const { layersToUnpack, policyLensLayerToUnpack, customArea, width, height } =
    e.data;
  console.log("starting to unpack", e.data);
  const processedCustomArea = customArea ? new Uint32Array(customArea) : null;
  try {
    const rasterLayers = layersToUnpack;
    // console.log(rasterLayers, policyLensLayerToUnpack);
    // const bitLayers = [];

    let layerIndex = 0;
    // let width, height, bbox;

    async function loadMask() {
      if (policyLensLayerToUnpack === "customArea")
        return {
          area: processedCustomArea.length,
          data: indicesToBinaryMask(processedCustomArea, width, height),
        };
      // const url = `${base}/data/PUBLIC_LAYERS/${policyLensLayerToUnpack.filename}`;
      // const response = await fetch(url);
      // if (!response.ok) throw new Error(`Failed to load ${url}`);

      // const blob = await response.blob();
      // const geotiff = await fromBlob(blob);
      const geotiff = await fromArrayBuffer(
        policyLensLayerToUnpack.arrayBuffer,
      );
      const image = await geotiff.getImage();
      // const width = image.getWidth();
      // const height = image.getHeight();
      // const bbox = image.getBoundingBox();
      const rasters = await image.readRasters();

      const result = new Uint8Array(width * height);
      let count = 0;

      for (let i = 0; i < rasters[0].length; i++) {
        if (rasters[0][i]) {
          result[i] = 1;
          count++;
        }
      }

      const enriched = {
        area: count,
        data: result,
      };

      return enriched;
    }

    let lensLayer;

    if (policyLensLayerToUnpack !== "England") {
      lensLayer = await loadMask();
      console.log(lensLayer);
    } else if (policyLensLayerToUnpack === "customArea") {
      lensLayer = await loadMask();
    } else {
      console.log("Policy lens is England");
    }

    const enrichedRasterLayers = await Promise.all(
      rasterLayers.map(async (layer) => {
        // const url = `${base}/data/ALL_LAYERS/${layer.filename}`;
        // const response = await fetch(url);
        // if (!response.ok) throw new Error(`Failed to load ${url}`);

        // const blob = await response.blob();
        const geotiff = await fromArrayBuffer(layer.arrayBuffer);
        const image = await geotiff.getImage();
        // width = image.getWidth();
        // height = image.getHeight();
        // bbox = image.getBoundingBox();
        const rasters = await image.readRasters();

        const result = new Uint8Array(width * height);
        let count = 0;

        if (policyLensLayerToUnpack !== "England") {
          for (let i = 0; i < rasters[0].length; i++) {
            if (rasters[0][i] && lensLayer.data[i]) {
              result[i] = 1;
              count++;
            }
          }
        } else {
          for (let i = 0; i < rasters[0].length; i++) {
            if (rasters[0][i]) {
              result[i] = 1;
              count++;
            }
          }
        }

        const indices = binaryMaskToIndices(result);

        // bitLayers.push(result);

        const enriched = {
          ...layer,
          area: count,
          data: indices,
        };

        layerIndex++;
        return enriched;
      }),
    );

    self.postMessage(
      {
        rasterLayers: enrichedRasterLayers,
        // width,
        // height,
        // bbox,
        policyLensArea: lensLayer?.area ?? 13046002,
        // lensIndices: lensLayer?.data,
        lensIndices: lensLayer
          ? binaryMaskToIndices(lensLayer.data)
          : undefined,
      },
      enrichedRasterLayers.map((layer) => layer.data.buffer),
    );
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
