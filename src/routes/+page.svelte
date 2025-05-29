<script>
import { onMount } from "svelte";
import { fromUrl, fromArrayBuffer, fromBlob  } from "geotiff";

onMount(async ()=>{
	const res = await fromUrl(`./LAST_TEST_OF_28_MAY.tif`); console.log("res",res);
    const image = await res.getImage(); console.log("img",image);




const lerp = (a, b, t) => (1 - t) * a + t * b;

function transform(a, b, M, roundToInt = false) {
  const round = (v) => (roundToInt ? v | 0 : v);
  return [
    round(M[0] + M[1] * a + M[2] * b),
    round(M[3] + M[4] * a + M[5] * b),
  ];
}


// Construct the WGS-84 forward and inverse affine matrices:
const { ModelPixelScale: s, ModelTiepoint: t } = image.fileDirectory;
let [sx, sy, sz] = s;
let [px, py, k, gx, gy, gz] = t;
sy = -sy; // WGS-84 tiles have a "flipped" y component

const pixelToGPS = [gx, sx, 0, gy, 0, sy];
console.log(`pixel to GPS transform matrix:`, pixelToGPS);

const gpsToPixel = [-gx / sx, 1 / sx, 0, -gy / sy, 0, 1 / sy];
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
const rasters = await image.readRasters();

console.log("rasters",rasters)

const { width, [0]: flood, [1]: bua, [2]: trees, [3]: england} = rasters;

const cover = {flood: flood[x + y * width], bua: bua[x + y * width], trees: trees[x + y * width], england: england[x + y * width]}

console.log(`At (${lat.toFixed(6)},${long.toFixed(6)}) the data show ${JSON.stringify(cover)}`);
})
</script>

<h1>GeoTIFF app</h1>
