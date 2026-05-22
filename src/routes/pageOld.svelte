<script>
  import { onMount } from "svelte";
  import { fromUrl } from "geotiff";
  import Map from '$lib/map/Map.svelte';
  import {csvParse} from 'd3'


  let width = $state(0);
  let height = $state(0);
  let England = $state(0);
  let areas = $state([]);
  let rasters = $state([]);
  let rastersArray = $state([]);
  let lookup=$state()
  let bitLayers = $state([])
  let rasterLayers=$state([])
  let selectedLayers=$state([])

  onMount(async () => {

    const look = await fetch('lookup.json');
    lookup = await look.json()

    const res = await fromUrl(`./multi.tif`);
    const image = await res.getImage();

    rasters = await image.readRasters();
    rasters.forEach(e=>rastersArray.push(e)); 
    width = image.getWidth();
    height = image.getHeight();
    const numBands = image.getSamplesPerPixel();

let url=`./multi.tif`
let bitMetadataCsvUrl=`./bitpacking_metadata.csv`
let geotiffUrl=`./multi.tif`
let metadataUrl=`./bitpacking_metadata.csv`

    async function unpackGeoTIFFBits(url, bitMetadataCsvUrl = null, image) {

  for (let b = 0; b < numBands; b++) {
    const band = rasters[b]; // Uint8Array
    const bandBits = new Array(8);
for (let bit = 0; bit < 8; bit++) {
  bandBits[bit] = new Uint8Array(width * height);
}

    for (let i = 0; i < band.length; i++) {
      const byte = band[i];
      for (let bit = 0; bit < 8; bit++) {
        if (byte & (1 << bit)) {
          bandBits[bit][i] = 1;
        }
      }
    }

    bitLayers.push(...bandBits); // up to 8 per band
  }

  // Optionally fetch category rasterLayers from metadata CSV
  
  if (bitMetadataCsvUrl) {
    const csvText = await (await fetch("./bitpacking_metadata.csv")).text();
    rasterLayers = parseMetadataCsv(csvText);
  }

  return {
    width,
    height,
    layers: bitLayers, // Array of length ≤ 256, each is Uint8Array
    rasterLayers,            // Optional array of {filename, band, bit_position}
  };
}

function parseMetadataCsv(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => row[h] = values[i]);
    return row;
  });
}


unpackGeoTIFFBits(geotiffUrl, metadataUrl).then(({ width, height, layers, rasterLayers }) => {
  rasterLayers.forEach((el,i)=>{el.area=layers[i].filter(e=>e).length; el.data=layers[i]})
  England = rasterLayers.find(e=>e.filename=="ENGLAND_MASTER.tif").data

layers.forEach(el=>areas.push(el.filter(e=>e).length))
  // Example: show active layers for the first pixel
  const pixelIndex = 0;
  const activeBits = layers
    .map((layer, i) => (layer[pixelIndex] ? i : null))
    .filter(i => i !== null);
});
  });

let layers = $derived(lookup?lookup.map(e => e.category):[]);


let selection = $derived(rasterLayers.map(e=>e.filename))
let chosenLayers=$derived(rasterLayers.filter(e=>selection.includes(e.filename)).map(e=>e.data)||[])
let blendedArrayLength=$state(5470417)

function blendBitArrays(bitArrays) {
 if(bitArrays[0]){
  if (bitArrays[0].length){
  const length = bitArrays[0].length;
  const result = new Uint8Array(length); // Fast, typed array
  for (let i = 0; i < length; i++) {
    for (let arr of bitArrays) {
      if (arr[i] && England[i]) {
        result[i] = 1;
        break; // Short-circuit once a '1' is found
      }
    }
  }

  blendedArrayLength = result.filter(e=>e).length;

}};


}

</script>

<h1>GeoTIFF app</h1>
{#if rasterLayers.length && rasterLayers[0].area}
<p>England is {rasterLayers.find(e=>e.filename=="ENGLAND_MASTER.tif").area.toLocaleString()}Ha</p>

 <fieldset>
  <legend>layers to turn on and off:</legend>
{#each rasterLayers as label, i}
{#if label.filename!="ENGLAND_MASTER.tif"}
<div>
    <input type="checkbox" id="{label.filename}" value="{label.filename}" checked bind:group={selection} onchange={()=>blendBitArrays(chosenLayers)}/>
    <label for="{label.filename}"> {label.filename.replace(".tif","")}: {label.area?label.area.toLocaleString():0}Ha</label>
  </div>
  {/if}
{/each}

</fieldset>

<p>English land outside the selected categories: {(rasterLayers.find(e=>e.filename=="ENGLAND_MASTER.tif").area-blendedArrayLength).toLocaleString()}Ha</p>
{/if}