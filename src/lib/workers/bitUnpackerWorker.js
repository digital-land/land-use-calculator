import { fromUrl, fromBlob } from "geotiff";

  // Parse metadata CSV
  function parseMetadataCsv(csvText) {
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",");
    return lines.slice(1).map((line) => {
      const values = line.split(",");
      const row = {};
      headers.forEach((h, i) => (row[h] = values[i]));
      return row;
    });
  }
  
self.onmessage = async function (e) {
console.log("bitUnpackWorker")

const { metadataCsv, base } = e.data;

// const geotiff = typeof url == 'string' ? await fromUrl(url) : await fromBlob(url);

try {
// const image = await geotiff.getImage(),
//       width = image.getWidth(),
//       height = image.getHeight(),
      // bbox = image.getBoundingBox(),
      const rasterLayers = parseMetadataCsv(metadataCsv)
      console.log(rasterLayers)

      // for (let i = 0; i < rasterLayers.length; i++) {
      //   const geotiff = await fromBlob(`${base}/data/filters/${rasterLayers[i].filename}`)
      //   const image = await geotiff.getImage(),
      // const width = image.getWidth(),
      // const height = image.getHeight(),
      // const bbox = image.getBoundingBox(),
      // const rasters = await image.readRasters();
      // }
      
      // let transposed=[]


  const bitLayers = [];

  let layerIndex = 0;

  const enrichedRasterLayers = await Promise.all(rasterLayers.map(async (layer, i) => {
    // const band = rasters[Math.floor(layerIndex / 8)];
    // const bit = layerIndex % 8;

        const geotiff = await fromBlob(`${base}/data/filters/${rasterLayers[i].filename}`)
        const image = await geotiff.getImage(),
      const width = image.getWidth(),
      const height = image.getHeight(),
      const bbox = image.getBoundingBox(),
      const rasters = await image.readRasters();

    const result = new Uint8Array(width * height);
    let count = 0;

    for (let i = 0; i < rasters.length; i++) {
      if (rasters[i]) {
        result[i] = 1;
        count++;
      }
    }

    bitLayers.push(result);
    const enriched = { ...layer, area: count, data: result };
    layerIndex++;
    return enriched;
  }));

  self.postMessage({ bitLayers, rasterLayers: enrichedRasterLayers });
  } catch (error) {
    self.postMessage({ error: error.message});
  }
};
