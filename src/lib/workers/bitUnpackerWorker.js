self.onmessage = function (e) {
  const { rasters, width, height, rasterLayers } = e.data;
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
};
