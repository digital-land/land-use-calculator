import { fromUrl, fromArrayBuffer, fromBlob  }  from 'geotiff';

self.onmessage = async (event) => {

  
  const url = event.data.url;

  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    // Parse GeoTIFF from ArrayBuffer using geotiff 2.1.3 API
    const tiff = await fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasterData = await image.readRasters();
console.log("rasterData",rasterData)
    // Example: send back first band pixels and width/height
    self.postMessage({
      width: image.getWidth(),
      height: image.getHeight(),
      bbox: image.getBoundingBox(),
      data: rasterData, // first band pixel array
    });
  } catch (error) {
    self.postMessage({ error: error.message});
  }
};
