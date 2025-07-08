<script>
  import { onMount, tick } from "svelte";
  import { fromUrl, fromBlob } from "geotiff";
  import { writable } from "svelte/store";
  import { browser } from "$app/environment";
  import {
    CheckBox,
    PhaseBanner,
  } from "@communitiesuk/svelte-component-library";
  import Map from "$lib/map/Map.svelte";
  import OsMap from "$lib/map/OSMap.svelte";
  import proj4 from "proj4";
  import { base } from "$app/paths";
  import Table from "$lib/Table.svelte";
  import { csvParse } from "d3-dsv";
  import LALookup from "$lib/LALookup.js";

  let done = $state(false);
  let ones;
  let dataURL = $state();
  let dataURLForUniques = $state();
  let dataURLForSelectedArea = $state();
  let occurences = $state();
  // let finalArray = $state();
  let width = $state(0),
    height = $state(0);
  let bbox = $state([]);
  // let canvas = $state();
  // let canvasForUniques = $state();
  // let canvasForSelectedArea = $state();
  // let ctx = $state();
  // let ctxForUniques = $state();
  // let ctxForSelectedArea = $state();
  let image = $state();
  // let imageData = $state();
  // let imageDataForUniques = $state();
  // let imageDataForSelectedArea = $state();
  let rasterLayers = $state([]);
  let lookup = [];
  let bitLayers = $state([]);
  let currentBitArrays = $state();
  let England;
  // let selected = $state([]);
  let blendedArray = $state([]);
  let blendedArrayLength = $state(0);
  let startingPosition;

  let uniqueArray = $state([]);

  const blendingProgress = writable(0);
  let geotiffFile = $state();
  let csvFile = $state();

  let csvLocation = $derived(
    //DERIVED 3
    csvFile?.length > 0 ? csvFile[0] : `${base}/bitpacking_metadata.csv`
  );

  let geotiff = $state();
  let enrichedLayers = $state([]);

  let unpackWorker;

  onMount(async () => {
    unpackWorker = new Worker(
      new URL("../lib/workers/bitUnpackerWorker.js", import.meta.url),
      { type: "module" }
    );

    // blendWorker = new Worker(
    //   new URL("../lib/workers/blendWorker.js?worker", import.meta.url),
    //   { type: "module" }
    // );

    unpackWorker.onmessage = (e) => {
      const { bitLayers: bits, rasterLayers: layers } = e?.data;
      console.log(bits, layers);
      if (!Array.isArray(bits) || !Array.isArray(layers)) {
        console.error("Worker returned unexpected data:", e?.data);
        return;
      }

      bitLayers = bits;
      rasterLayers = layers;

      // Only assign .data, don't compute .area again
      rasterLayers.forEach((layer, i) => {
        layer.data = bitLayers[i];
      });

      England = rasterLayers.find(
        (l) => l.filename === "ENGLAND_100M.tif"
      )?.data;
      // selected = rasterLayers
      //   .map((e) => e.filename)
      //   .filter((e) => e != "ENGLAND_100M.tif");

      startingPosition = rasterLayers
        .map((e) => e.filename)
        .filter((e) => e != "ENGLAND_100M.tif");
      // updateBlending();
      //findTheOnes();
    };

    unpackWorker.onerror = (e) => {
      console.log("ERROR", e);
    };

    const simpleWorker = new Worker(
      new URL("$lib/workers/simpleUnpackWorker.js", import.meta.url),
      { type: "module" }
    );

    simpleWorker.onmessage = (e) => {
      if (e.data.error) {
        message = `Worker error: ${e.data.error}`;
        return;
      }

      console.log("Processed data:", e.data);
      enrichedLayers = e.data.rasterLayers;
      message = `Processed ${enrichedLayers.length} layers.`;
    };

    simpleWorker.onerror = (e) => {
      console.error("Worker error:", e);
      message = `Error: ${e.message}`;
    };

    try {
      const response = await fetch(csvLocation);
      if (!response.ok) throw new Error("Failed to fetch CSV");
      const metadataCsv = await response.text();
      console.log(metadataCsv);

      simpleWorker.postMessage({
        metadataCsv,
        base,
      });
    } catch (err) {
      message = `CSV Load Error: ${err.message}`;
    }
  });

  let message = $state("Waiting...");
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@10.5.0/ol.css" />
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/gh/OrdnanceSurvey/os-api-branding@0.3.1/os-api-branding.css"
  />
  <script
    src="https://cdn.jsdelivr.net/npm/proj4@2.15.0/dist/proj4.js"
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/ol/dist/ol.js"></script>
  <script src="https://unpkg.com/ol-mapbox-style@12.3.5/dist/olms.js"></script>
  <script
    src="https://cdn.jsdelivr.net/gh/OrdnanceSurvey/os-api-branding@0.3.1/os-api-branding.js"
  ></script>
</svelte:head>

<PhaseBanner
  tagText={"Alpha"}
  bannerText={"THIS IS AN EXPERIMENTAL PRODUCT UNDER DEVELOPMENT"}
  linkText={""}
/>
<!-- <h2>
  The total area of land in ... is
  {englandArea ? englandArea.toLocaleString() : "..."} ha. Removing areas with the
  selected restrictions there are {englandArea
    ? (englandArea - blendedArrayLength).toLocaleString()
    : "..."} ha.
</h2> -->
<p>{message}</p>
{#if enrichedLayers.length}
  <ul>
    {#each enrichedLayers as layer}
      <li>{layer.filename} - area: {layer.area}</li>
    {/each}
  </ul>
{/if}
<!-- <p>[potentially visualisations]</p> -->
<!-- <label for="area"
  >Select an area
  <select name="area" bind:value={selectedArea}>
    {#each LALookup.sort((a, b) => a.LPA23NM.localeCompare(b.LPA23NM)) as LA, i}
      <option value={LA.id}>{LA.LPA23NM}</option>
    {/each}
  </select></label
> -->

<div class="container">
  <div class="output">
    <div>
      <details>
        <summary>Use a local file (optional)</summary>
        <br />
        <label for="csv-file-upload">Use a local csv file:</label>
        <input
          bind:files={csvFile}
          accept="text/csv"
          id="csv-file-upload"
          type="file"
        />
        <br />
        <label for="file-upload">Use a local geotiff file:</label>
        <input
          bind:files={geotiffFile}
          accept="image/tiff"
          id="file-upload"
          type="file"
        />
      </details>
    </div>
    {#if rasterLayers.length}
      <!-- <p>
        {LALookup[selectedArea - 1]?.LPA23NM ?? "England"} total:
        {englandArea ? englandArea.toLocaleString() : "..."} ha.
      </p> -->

      <fieldset>
        <legend>Layers to turn on/off:</legend>
        <!-- <button
          onclick={() => {
            selected.length = 0;
            // console.log(selected);
            updateBlending();
            return (selected = selected);
          }}>all off</button
        >
        <button
          onclick={() => {
            selected.length = 0;
            startingPosition.forEach((e) => selected.push(e));
            // console.log(selected);
            updateBlending();
            return (selected = selected);
          }}>all on</button
        > -->

        {#each rasterLayers as layer, i}
          {#if layer.filename !== "ENGLAND_100M.tif"}
            <div>
              <input
                id={"checkbox-" + i}
                name="checkbox"
                type="checkbox"
                value={layer.filename}
              />

              <label for={"checkbox-" + i}>
                {layer.filename.replace(".tif", "").replaceAll("_", " ")}
                <!-- : {layer.area?.toLocaleString() ?? 0} ha -->
              </label>
            </div>
          {/if}
        {/each}
      </fieldset>
      {#if $blendingProgress < 100}
        <p>Blending... {$blendingProgress.toFixed(1)}%</p>
        <progress max="100" value={$blendingProgress}></progress>
      {:else}
        <p>
          <b
            >Land outside selected categories:
            {(
              rasterLayers.find((e) => e.filename === "ENGLAND_100M.tif")
                ?.area - blendedArrayLength
            ).toLocaleString()} ha
          </b>
        </p>
      {/if}
    {/if}
  </div>
  <div>
    {#if dataURL && dataURLForSelectedArea && dataURLForUniques && bbox.length > 0}
      {console.log("Rendering the map!")}

      <div class="os-map-container">
        <!-- {#key geotiffFile}
          <OsMap
            {dataURL}
            {dataURLForUniques}
            {dataURLForSelectedArea}
            {bbox}
            bind:selectedAreaName
          />
        {/key} -->
      </div>
    {/if}
  </div>
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 20% 40% 40%;
    font-family: sans-serif;
    max-height: 80vh;
    overflow: scroll;
  }
  .output {
    padding: 10px;
    max-height: 700px;
    overflow-y: auto;
    overflow-x: scroll;
    /* width: 100%; */
  }

  .table {
    padding: 0px 10px;
    max-height: 700px;
  }

  .os-map-container {
    height: 700px;
  }
  :global(td.govuk-table__cell) {
    padding-right: 20px;
  }
  summary {
    cursor: pointer;
  }

  .uniqueHighlightText {
    font-weight: 700;
    color: crimson;
  }
</style>
