import { fromBlob } from 'geotiff';

function parseMetadataCsv(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => (row[h] = values[i]));
    return row;
  });
}

self.onmessage = async function (e) {
  const { metadataCsv, base } = e.data;

  try {
    const rasterLayers = parseMetadataCsv(metadataCsv);
    console.log(rasterLayers)
    const bitLayers = [];

    let layerIndex = 0;
    let width, height, bbox;

    const enrichedRasterLayers = await Promise.all(
      rasterLayers.map(async (layer) => {
        const url = `${base}/data/filters/${layer.filename}`;
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

        for (let i = 0; i < rasters[0].length; i++) {
          if (rasters[0][i]) {
            result[i] = 1;
            count++;
          }
        }

        bitLayers.push(result);

        const enriched = {
          ...layer,
          area: count,
          data: result,
        };

        layerIndex++;
        return enriched;
      })
    );

    self.postMessage({ bitLayers, rasterLayers: enrichedRasterLayers, width, height, bbox });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
