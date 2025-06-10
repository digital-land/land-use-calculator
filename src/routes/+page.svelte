<script>
import { onMount } from "svelte";
import { fromUrl, fromArrayBuffer, fromBlob  } from "geotiff";
// import { Map } from "@communitiesuk/svelte-component-library";
import Map from '$lib/map/Map.svelte'

function transform(a, b, M, roundToInt = false) {
  const round = (v) => (roundToInt ? v | 0 : v);
  return [
    round(M[0] + M[1] * a + M[2] * b),
    round(M[3] + M[4] * a + M[5] * b),
  ];
}

let gpsToPixel, pixelToGPS, rasters, image = $state();

onMount(async ()=>{
	const res = await fromUrl(`./reduced3.tif`); console.log("res",res);
     image = await res.getImage();
     console.log("img",image);




const lerp = (a, b, t) => (1 - t) * a + t * b;




// Construct the WGS-84 forward and inverse affine matrices:
const { ModelPixelScale: s, ModelTiepoint: t } = image.fileDirectory;
let [sx, sy, sz] = s;
let [px, py, k, gx, gy, gz] = t;
sy = -sy; // WGS-84 tiles have a "flipped" y component

pixelToGPS = [gx, sx, 0, gy, 0, sy];
console.log(`pixel to GPS transform matrix:`, pixelToGPS);

gpsToPixel = [-gx / sx, 1 / sx, 0, -gy / sy, 0, 1 / sy];
console.log(`GPS to pixel transform matrix:`, gpsToPixel);

// Convert a GPS coordinate to a pixel coordinate in our tile:
const [gx1, gy1, gx2, gy2] = image.getBoundingBox();

const lat = lerp(gy1, gy2, Math.random());

const long = lerp(gx1, gx2, Math.random());

console.log(`Looking up GPS coordinate (${lat.toFixed(6)},${long.toFixed(6)})`);

const [x, y] = transform(long, lat, gpsToPixel, true);

console.log(`Corresponding tile pixel coordinate: [${x}][${y}]`);

// And as each pixel in the tile covers a geographic area, not a single
// GPS coordinate, get the area that this pixel covers:
const gpsBBox = [transform(x, y, pixelToGPS), transform(x + 1, y + 1, pixelToGPS)];

console.log(`Pixel covers the following GPS area:`, gpsBBox);

// Finally, retrieve the elevation associated with this pixel's geographic area:
rasters = await image.readRasters();

console.log("rasters",rasters)

// const { width, [0]: flood, [1]: bua, [2]: trees, [3]: england} = rasters;

// const cover = {flood: flood[x + y * width], bua: bua[x + y * width], trees: trees[x + y * width], england: england[x + y * width]}

// console.log(`At (${lat.toFixed(6)},${long.toFixed(6)}) the data show ${JSON.stringify(cover)}`);

})

let clickedLocation = $state(undefined);
let tileAtClickedLocation = $derived(clickedLocation ? transform(clickedLocation.lng, clickedLocation.lat, gpsToPixel, true) : undefined)
let tileArea = $derived(tileAtClickedLocation ? [transform(tileAtClickedLocation[0], tileAtClickedLocation[1], pixelToGPS), transform(tileAtClickedLocation[0] + 1, tileAtClickedLocation[1] + 1, pixelToGPS)] : undefined)
let tileData = $derived(tileAtClickedLocation ? rasters.map(layer => layer[tileAtClickedLocation[0] + tileAtClickedLocation[1]*rasters.width]) : undefined)
$inspect(clickedLocation, tileAtClickedLocation, tileArea, tileData);

function logClick(e) {
  clickedLocation = e.lngLat
}

let styleSheet = {
    version: 8,
    sources: {
      esri: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution:
          'Imagery © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
      },
      labels: {
        type: 'raster',
        tiles: [
          'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution:
          'Labels © Esri — Source: Esri and the GIS User Community'
      }
    },
    layers: [
      {
        id: 'esri-imagery',
        type: 'raster',
        source: 'esri'
      },
      {
        id: 'esri-labels',
        type: 'raster',
        source: 'labels'
      }
    ]
  }

</script>

<h1>[Heading]</h1>
<p>[Description]</p>
<h2>[Headline takeaway statement]</h2>
<p>[potentially visualisations]</p>

<div class="container">
  <div>
  {#await image}
{console.log('Waiting')}
{:then image}
{console.log('done waiting')}
    <Map tifLayer={'/reduced3.tif'} onclick={logClick} mapHeight={500} {styleSheet} />
{/await}
</div>
<div class='output'>
  <h2>Selected filters</h2>
  <details>
    <summary>Expand to adjust</summary>
        <p>Clicked location is {clickedLocation}</p>
<p>Corresponding tile pixel coordinate: {tileAtClickedLocation}</p>
<p>Pixel covers the following GPS area: {tileArea}</p>
<p>Data at this location: {tileData}</p>
  </details>
  <div>

  </div>
</div>
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 65% 35%;
  }
  .output {
    padding: 10px;
  }
</style>