<script>
  import { onMount } from 'svelte';
  import { fromUrl } from 'geotiff';
  import { writable } from 'svelte/store';
  import { browser } from '$app/environment';

  // UI + state
  let width = 0, height = 0;
  let rasterLayers = $state([]);
  let lookup = [];
  let bitLayers = [];
  let England;
  let selected = $state([]);
  let blendedArrayLength = $state(0);
  let startingPosition

  const blendingProgress = writable(0);

  // Workers
  let unpackWorker, blendWorker;

  // Init workers on client
  if (browser) {
    unpackWorker = new Worker(
      new URL('$lib/workers/bitUnpackerWorker.js', import.meta.url),
      { type: 'module' }
    );

    blendWorker = new Worker(
      new URL('$lib/workers/blendWorker.js', import.meta.url),
      { type: 'module' }
    );

unpackWorker.onmessage = (e) => {
  const { bitLayers: bits, rasterLayers: layers } = e.data;

  if (!Array.isArray(bits) || !Array.isArray(layers)) {
    console.error("Worker returned unexpected data:", e.data);
    return;
  }

  bitLayers = bits;
  rasterLayers = layers;

  // Only assign .data, don't compute .area again
  rasterLayers.forEach((layer, i) => {
    layer.data = bitLayers[i];
  });

  England = rasterLayers.find(l => l.filename === "ENGLAND_MASTER.tif")?.data;
  selected=rasterLayers.map(e=>e.filename).filter(e=>e!="ENGLAND_MASTER.tif");


  startingPosition=rasterLayers.map(e=>e.filename).filter(e=>e!="ENGLAND_MASTER.tif");
  updateBlending();
};



    blendWorker.onmessage = (e) => {
      if (e.data.progress !== undefined) {
        blendingProgress.set(e.data.progress);
      } else if (e.data.type === 'done') {
        blendedArrayLength = e.data.activeCount;
        blendingProgress.set(100);
      }
    };
  }

  // Util: Count '1's
  function countOnes(arr) {
    return arr.reduce((sum, val) => sum + val, 0);
  }

  // Trigger blending in worker
  function updateBlending() {
    if (!England) return;
    const active = rasterLayers.filter(l => selected.includes(l.filename));
    const bitArrays = active.map(l => l.data);
    blendingProgress.set(0);
    blendWorker.postMessage({ bitArrays, englandMask: England });
  }

  // Parse metadata CSV
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

  onMount(async () => {
    const geotiff = await fromUrl('./multi.tif');
    const image = await geotiff.getImage();
    width = image.getWidth();
    height = image.getHeight();

    const metadataRes = await fetch('./bitpacking_metadata.csv')
    const metadataCsv = await metadataRes.text();
    const rasterLayersParsed = parseMetadataCsv(metadataCsv);

    const rasters = await image.readRasters();
    unpackWorker.postMessage({ rasters, width, height, rasterLayers: rasterLayersParsed });
    console.log("sp",startingPosition)
  });
$inspect(selected)
</script>

<h1>GeoTIFF App</h1>

{#if rasterLayers.length}
  <p>England total: {rasterLayers.find(e => e.filename === "ENGLAND_MASTER.tif")?.area.toLocaleString()} Ha</p>

  <fieldset>
    <legend>Layers to turn on/off:</legend>
    <button onclick={() => {selected.length=0; updateBlending(); return selected=selected}}>all off</button>
    <button onclick={() => {selected.length=0; startingPosition.forEach(e=>selected.push(e)); updateBlending(); return selected=selected}}>all on</button>
    {#each rasterLayers as layer (layer.filename)}
      {#if layer.filename !== "ENGLAND_MASTER.tif"}
        <div>
          <input
            name="checkbox"
            type="checkbox"
            bind:group={selected}
            value={layer.filename}
            onchange={() => updateBlending()}
          />
          <label for="checkbox">
            {layer.filename.replace('.tif', '')}: {layer.area?.toLocaleString() ?? 0} Ha
          </label>
        </div>
      {/if}
    {/each}
  </fieldset>

  {#if $blendingProgress < 100}
    <p>Blending... {$blendingProgress.toFixed(1)}%</p>
    <progress max="100" value="{$blendingProgress}"></progress>
  {:else}
    <p>English land outside selected categories: 
      {(rasterLayers.find(e => e.filename === "ENGLAND_MASTER.tif")?.area - blendedArrayLength).toLocaleString()} Ha
    </p>
  {/if}
{/if}
