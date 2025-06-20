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

  const { url, metadataCsv } = e.data;

const geotiff = typeof url == 'string' ? await fromUrl(url) : await fromBlob(url);

try {
const image = await geotiff.getImage(),
      width = image.getWidth(),
      height = image.getHeight(),
      bbox = image.getBoundingBox(),
      rasterLayers = parseMetadataCsv(metadataCsv),
      rasters = await image.readRasters();

  const bitLayers = [];

  let layerIndex = 0;
  const enrichedRasterLayers = rasterLayers.map((layer) => {
    const band = rasters[Math.floor(layerIndex / 8)];
    const bit = layerIndex % 8;
    const result = new Uint8Array(width * height);
    let count = 0;

    for (let i = 0; i < band.length; i++) {
      if (band[i] & (1 << bit)) {
        result[i] = 1;
        count++;
      }
    }

    bitLayers.push(result);
    const enriched = { ...layer, area: count };
    layerIndex++;
    return enriched;
  });

  self.postMessage({ bitLayers, rasterLayers: enrichedRasterLayers });
  } catch (error) {
    self.postMessage({ error: error.message});
  }
};
