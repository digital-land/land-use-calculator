<svelte:head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@10.5.0/ol.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/OrdnanceSurvey/os-api-branding@0.3.1/os-api-branding.css" />
    <script src="https://cdn.jsdelivr.net/npm/proj4@2.15.0/dist/proj4.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/ol/dist/ol.js"></script>
    <script src="https://unpkg.com/ol-mapbox-style@12.3.5/dist/olms.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/OrdnanceSurvey/os-api-branding@0.3.1/os-api-branding.js"></script>
	</svelte:head>
    
    <script>
  import { onMount } from 'svelte';
 import { onDestroy } from 'svelte';
//import GeoTIFF from 'ol/source/GeoTIFF';
import WebGLTileLayer from 'ol/layer/WebGLTile';
import { VectorTile as VectorTileLayer, Image as ImageLayer } from 'ol/layer';
import GeoTIFF from 'geotiff'
import GeoTIFFWorker from '$lib/workers/geotiffWorker.js?worker'
import ImageStatic from 'ol/source/ImageStatic';
  let geotiffData = null; // to hold the raster data info
import ImageCanvasSource from 'ol/source/ImageCanvas';

console.log(GeoTIFF)
  let mapElement;
  let map;
  const apiKey = 'oCUBI8DjgzTP5J8VptrnOAxYVeZc0cZ2';
  const serviceUrl = 'https://api.os.uk/maps/vector/v1/vts';
let worker
  onMount(async () => {
    worker = new GeoTIFFWorker();
    // Define projection

     // Listen for messages from the worker
    worker.onmessage = (event) => {
      if (event.data.error) {
        console.error('Worker error:', event.data.error);
        return;
      }
      geotiffData = event.data;
      console.log('Received GeoTIFF data:', geotiffData);

      // TODO: Use geotiffData.width, geotiffData.height, geotiffData.data here for rendering
    };
worker.onerror = (error) => {
  console.error('Worker error:', error);
};
    // Send the GeoTIFF URL to the worker
    worker.postMessage({
      url: '/data/output.tif' // Adjust this path to your GeoTIFF file
    });

    proj4.defs(
      'EPSG:27700',
      '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs'
    );
    ol.proj.proj4.register(proj4);

    const service = await fetch(`${serviceUrl}?key=${apiKey}`).then(r => r.json());

    const extent = [service.fullExtent.xmin, service.fullExtent.ymin, service.fullExtent.xmax, service.fullExtent.ymax];
    const origin = [service.tileInfo.origin.x, service.tileInfo.origin.y];
    const resolutions = service.tileInfo.lods.map(l => l.resolution).slice(0, 16);
    const tileSize = service.tileInfo.rows;
    const tiles = service.tiles[0];

    const tileGrid = new ol.tilegrid.TileGrid({ extent, origin, resolutions, tileSize });

    const vectorTileLayer = new ol.layer.VectorTile({ declutter: true });

    await olms.applyStyle(
      vectorTileLayer,
      `${serviceUrl}/${service.defaultStyles}?key=${apiKey}`,
      '',
      { resolutions }
    );

    vectorTileLayer.setSource(new ol.source.VectorTile({
      format: new ol.format.MVT(),
      url: tiles,
      projection: 'EPSG:27700',
      tileGrid
    }));

    map = new ol.Map({
      target: mapElement,
      layers: [vectorTileLayer],
      view: new ol.View({
        projection: 'EPSG:27700',
        extent: [-238375.0, 0.0, 900000.0, 1376256.0],
        resolutions,
        minZoom: 2,
        maxZoom: 15,
        center: [337297, 503995],
        zoom: 9
      })
    });
    worker.onmessage = (e) => {
      console.log(e)
      const { data, width, height, bbox} = e.data;

      // Draw GeoTIFF to a canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false; // 🔧 prevent blurring
      const imageData = ctx.createImageData(width, height);
      
for (let i = 0; i < data[0].length; i++) {
  const val = data[0][i] + data[1][i] + data[2][i];
  imageData.data[4 * i + 0] = data[0][i]; // R
  imageData.data[4 * i + 1] = data[1][i]; // G
  imageData.data[4 * i + 2] = data[2][i]; // B
  imageData.data[4 * i + 3] = val > 0 ? 255 : 0; // A
}

      ctx.putImageData(imageData, 0, 0);

      const tiffLayer = new ImageLayer({
        source: new ImageStatic({
          url: canvas.toDataURL(),
          imageExtent: bbox,
          projection: 'EPSG:27700',
        }),
        opacity: 0.5,
      });

      map.addLayer(tiffLayer);
    };


  });

  // Cleanup the worker when the component is destroyed
 
  onDestroy(() => {
    if (worker) worker.terminate();
  });

// const tiffLayer = new WebGLTileLayer({
//   source: new GeoTIFF({
//     sources: [{ url: '/data/ENGLAND_100M.tif' }],
//     convertToRGB: true
//   }),
// });
// map.addLayer(tiffLayer);
 // });
</script>

<div bind:this={mapElement} class="map-container"></div>

<style>
  .map-container {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
  }
</style>