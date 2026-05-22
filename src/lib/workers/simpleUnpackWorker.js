import { fromBlob } from "geotiff";

self.onmessage = async function (e) {
  const { layersToUnpack, base, policyLens } = e.data;
  console.log("starting to unpack", { policyLens });
  try {
    const rasterLayers = layersToUnpack;
    // console.log(rasterLayers);
    // const bitLayers = [];

    let layerIndex = 0;
    let width, height, bbox;

    async function loadMask() {
      const url = `${base}/data/PUBLIC_LAYERS/${policyLens}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load ${url}`);

      const blob = await response.blob();
      const geotiff = await fromBlob(blob);
      const image = await geotiff.getImage();
      const width = image.getWidth();
      const height = image.getHeight();
      const bbox = image.getBoundingBox();
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

    if (policyLens !== "England") {
      lensLayer = await loadMask();
      console.log(lensLayer);
    }

    const enrichedRasterLayers = await Promise.all(
      rasterLayers.map(async (layer) => {
        // const url = `${base}/data/ALL_LAYERS/${layer.filename}`;
        const url = `${base}/data/PUBLIC_LAYERS/${layer.filename}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}`);

        const blob = await response.blob();
        const geotiff = await fromBlob(blob);
        const image = await geotiff.getImage();
        width = image.getWidth();
        height = image.getHeight();
        bbox = image.getBoundingBox();
        const rasters = await image.readRasters();

        const result = new Uint8Array(width * height);
        let count = 0;

        if (policyLens !== "England") {
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

        // bitLayers.push(result);

        const enriched = {
          ...layer,
          area: count,
          data: result,
        };

        layerIndex++;
        return enriched;
      })
    );

    self.postMessage(
      {
        rasterLayers: enrichedRasterLayers,
        width,
        height,
        bbox,
        policyLensArea: lensLayer?.area ?? 13046002,
        policyLensLayer: lensLayer?.data
      },
      enrichedRasterLayers.map((layer) => layer.data.buffer)
    );
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
