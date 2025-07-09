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
  $inspect(occurences);
  // let finalArray = $state();
  let width = $state(0),
    height = $state(0);
  let bbox = $state([]);
  $inspect(bbox);
  let canvas = $state();
  let canvasForUniques = $state();
  let canvasForSelectedArea = $state();
  let ctx = $state();
  let ctxForUniques = $state();
  let ctxForSelectedArea = $state();
  let image = $state();
  let imageData = $state();
  let imageDataForUniques = $state();
  let imageDataForSelectedArea = $state();
  // Define RGBA colors in little-endian format (most systems are little-endian)
  const UNIQUE_ON_COLOR = 0xff0000ff; // Red with full opacity (R=255, G=0, B=0, A=255)
  const UNIQUE_OFF_COLOR = 0x000000ff; // Red with 0 alpha (R=255, G=0, B=0, A=0)
  const TOTAL_ON_COLOR = 0xff000000;
  const TOTAL_OFF_COLOR = 0x00000000;
  let rasterLayers = $state([]);
  let lookup = [];
  let bitLayers = $state([]);
  $inspect(bitLayers);
  let currentBitArrays = $state();
  let England = $state();
  let englandLength = $derived(England?.length);

  let enrichedLayers = $state([]);

  let englandArea = $derived(
    enrichedLayers?.find((d) => d.filename == "ENGLAND_100M.tif")?.area
  );
  $inspect(englandArea);

  // let selected = $state([]);
  let blendedArray = $state([]);
  $inspect(blendedArray);
  let blendedArrayLength = $state(0);
  let selected = $state([]);
  let startingPosition;

  let uniqueArray = $state([]);
  let selectedRestrictionIndex = 0;
  const blendingProgress = writable(0);
  let geotiffFile = $state();
  let csvFile = $state();

  let csvLocation = $derived(
    //DERIVED 3
    csvFile?.length > 0 ? csvFile[0] : `${base}/bitpacking_metadata.csv`
  );

  let geotiff = $state();

  // let unpackWorker;
  let blendWorker;

  onMount(async () => {
    // unpackWorker = new Worker(
    //   new URL("../lib/workers/bitUnpackerWorker.js", import.meta.url),
    //   { type: "module" }
    // );

    // blendWorker = new Worker(
    //   new URL("../lib/workers/blendWorker.js?worker", import.meta.url),
    //   { type: "module" }
    // );

    // unpackWorker.onmessage = (e) => {
    //   const { bitLayers: bits, rasterLayers: layers } = e?.data;
    //   console.log(bits, layers);
    //   if (!Array.isArray(bits) || !Array.isArray(layers)) {
    //     console.error("Worker returned unexpected data:", e?.data);
    //     return;
    //   }

    //   bitLayers = bits;
    //   rasterLayers = layers;

    //   // Only assign .data, don't compute .area again
    //   rasterLayers.forEach((layer, i) => {
    //     layer.data = bitLayers[i];
    //   });

    //   England = rasterLayers.find(
    //     (l) => l.filename === "ENGLAND_100M.tif"
    //   )?.data;
    //   // selected = rasterLayers
    //   //   .map((e) => e.filename)
    //   //   .filter((e) => e != "ENGLAND_100M.tif");

    //   startingPosition = rasterLayers
    //     .map((e) => e.filename)
    //     .filter((e) => e != "ENGLAND_100M.tif");
    //   // updateBlending();
    //   //findTheOnes();
    // };

    // unpackWorker.onerror = (e) => {
    //   console.log("ERROR", e);
    // };

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
      bitLayers = e.data.bitLayers;
      enrichedLayers = e.data.rasterLayers;
      height = e.data.height;
      width = e.data.width;
      bbox = e.data.bbox;
      message = `Processed ${enrichedLayers.length} layers.`;

      England = enrichedLayers.find(
        (l) => l.filename === "ENGLAND_100M.tif"
      )?.data;
      //Filter out England to get 'selected', and do again to get starting position if needed
      selected = enrichedLayers
        .map((e) => e.filename)
        .filter((e) => e != "ENGLAND_100M.tif");

      startingPosition = enrichedLayers
        .map((e) => e.filename)
        .filter((e) => e != "ENGLAND_100M.tif");

      //Make bitArrays a copy of bitLayers but with England filtered out - I think easiest is to use enrichedLayers
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

  $effect(() => {
    if (englandArea) {
      const blendWorker = new Worker(
        new URL("$lib/workers/blendWorker.js", import.meta.url),
        { type: "module" }
      );

      // Select the active layers
      const active = enrichedLayers.filter((l) =>
        selected.includes(l.filename)
      );

      // Ensure Uint8Arrays
      const duplicateBitLayers = active.map((l) => new Uint8Array(l.data));

      // Get the raw buffers
      const buffers = duplicateBitLayers.map((arr) => arr.buffer);

      // Post to the worker (transferring buffers)
      blendWorker.postMessage(
        {
          bitArrays: buffers, // ✅ send raw ArrayBuffers
          englandLength, // e.g. 37371060
        },
        buffers // ✅ transfer buffers (zero-copy)
      );

      // Listen for messages
      blendWorker.onmessage = (e) => {
        if (e.data.progress !== undefined) {
          blendingProgress.set(e.data.progress);
        } else if (e.data.type === "done") {
          blendedArrayLength = e.data.activeCount;
          blendedArray = new Uint8Array(e.data.result); // ✅ re-wrap transferred buffer
          blendingProgress.set(100);
          console.log("Blending complete:", blendedArrayLength);
        } else if (e.data.error) {
          console.error("Blend worker error:", e.data.error);
        }

        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext("2d");
        imageData = ctx.createImageData(width, height);

        for (let i = 0; i < blendedArray.length; i++) {
          const value = blendedArray[i];

          imageData.data[i * 4 + 0] = 0; // redValue; //R
          imageData.data[i * 4 + 1] = 0; // greenValue; //G
          imageData.data[i * 4 + 2] = 0; // blueValue; //B
          imageData.data[i * 4 + 3] = value !== 0 ? 255 : 0; //Alpha
        }

        if (canvas) {
          ctx.putImageData(imageData, 0, 0);

          // Convert canvas to data URL
          dataURL = canvas.toDataURL();
        }
      };

      findTheOnes(
        enrichedLayers
          .filter((l) => selected.includes(l.filename))
          .map((l) => l.data)
      ).then(({ finalArray, uniqueArray, occurrences }) => {
        console.log("Done processing.");
        console.log("Final result:", finalArray);
        console.log("Selected mask:", uniqueArray);
        console.log("Occurrences:", occurrences);

        canvasForUniques = document.createElement("canvas");
        canvasForUniques.width = width;
        canvasForUniques.height = height;
        ctxForUniques = canvasForUniques.getContext("2d", {
          willReadFrequently: true,
        });
        imageDataForUniques = ctxForUniques.createImageData(width, height);

        canvasForSelectedArea = document.createElement("canvas");
        canvasForSelectedArea.width = width;
        canvasForSelectedArea.height = height;
        ctxForSelectedArea = canvasForSelectedArea.getContext("2d", {
          willReadFrequently: true,
        });
        imageDataForSelectedArea = ctxForSelectedArea.createImageData(
          width,
          height
        );

        const renderUnique = true;

        const pixels = new Uint32Array(imageDataForUniques?.data.buffer);

        for (let i = 0; i < uniqueArray.length; i++) {
          const valueUnique = renderUnique ? uniqueArray[i] : 0;
          pixels[i] = valueUnique !== 0 ? UNIQUE_ON_COLOR : UNIQUE_OFF_COLOR;
        }

        // Draw to canvas
        if (canvasForUniques) {
          ctxForUniques.putImageData(imageDataForUniques, 0, 0);

          // Only convert to Data URL if needed (since it's expensive)
          dataURLForUniques = canvasForUniques.toDataURL();
        }

        const areaPixels = new Uint32Array(
          imageDataForSelectedArea?.data.buffer
        );

        for (let i = 0; i < blendedArray.length; i++) {
          const valueSelectedArea = renderUnique
            ? currentBitArrays[selectedRestrictionIndex][i]
            : 0;

          areaPixels[i] =
            valueSelectedArea !== 0 ? UNIQUE_ON_COLOR : UNIQUE_OFF_COLOR;
        }
        if (canvasForSelectedArea) {
          ctxForSelectedArea.putImageData(imageDataForSelectedArea, 0, 0);

          // Convert canvas to data URL
          dataURLForSelectedArea = canvasForSelectedArea.toDataURL();
        }
      });
    }
  });

  function countOccurrences(uint8Array) {
    const counts = {};
    for (let i = 0; i < uint8Array.length; i++) {
      const value = uint8Array[i];
      if (counts[value] === undefined) {
        counts[value] = 1;
      } else {
        counts[value]++;
      }
    }
    return counts;
  }

  // function findTheOnes(ba) {
  //   if (ba.length) {
  //     const bitArrays = ba;
  //     const NUM_WORKERS = 4;
  //     // const numArrays = 18;
  //     const length = bitArrays[0].length;

  //     const inputArrays = bitArrays;
  //     const chunkSize = Math.ceil(length / NUM_WORKERS);
  //     const workers = [];
  //     const finalArray = new Uint8Array(length);
  //     uniqueArray = new Uint8Array(length);
  //     const promises = [];

  //     for (let w = 0; w < NUM_WORKERS; w++) {
  //       const worker = new Worker(
  //         new URL("../lib/workers/onesWorker.js?worker", import.meta.url),
  //         { type: "module" }
  //       );
  //       workers.push(worker);

  //       const start = w * chunkSize;
  //       const end = Math.min(start + chunkSize, length);
  //       const chunkSlices = inputArrays.map((arr) => arr.slice(start, end));

  //       const p = new Promise((resolve, reject) => {
  //         worker.onmessage = function (e) {
  //           if (e.data.error) {
  //             console.error(`Worker ${w} reported error:`, e.data.error);
  //             reject(new Error(e.data.error));
  //             return;
  //           }

  //           finalArray.set(new Uint8Array(e.data.result), start);
  //           // if (selectedRestrictionIndex) {
  //           uniqueArray.set(new Uint8Array(e.data.uniqueResult), start);
  //           // }

  //           resolve();
  //         };

  //         worker.onerror = function (err) {
  //           console.error(`Worker ${w} failed:`, err.message);
  //           reject(err);
  //         };

  //         worker.postMessage(
  //           {
  //             arrays: chunkSlices,
  //             start,
  //             end,
  //             selectedRestrictionIndex,
  //           },
  //           chunkSlices.map((a) => a.buffer)
  //         );
  //       });

  //       // ✅ push promise into array
  //       promises.push(p);
  //     }

  //     // ✅ wait for all promises to complete
  //     return Promise.all(promises).then(() => {
  //       occurences = countOccurrences(finalArray);
  //       // console.log(occurences, selectedRestrictionIndex);
  //       done = true;
  //     });
  //   }
  // }

  function findTheOnes(bitArrays) {
    if (!bitArrays.length) return;

    const NUM_WORKERS = 4;
    const length = bitArrays[0].length;
    const chunkSize = Math.ceil(length / NUM_WORKERS);

    const finalArray = new Uint8Array(length);
    const uniqueArray = new Uint8Array(length);
    const promises = [];

    for (let w = 0; w < NUM_WORKERS; w++) {
      const worker = new Worker(
        new URL("../lib/workers/onesWorker.js?worker", import.meta.url),
        { type: "module" }
      );

      const start = w * chunkSize;
      const end = Math.min(start + chunkSize, length);

      const chunkSlices = bitArrays.map((arr) => arr.slice(start, end));

      const p = new Promise((resolve, reject) => {
        worker.onmessage = function (e) {
          if (e.data.error) {
            console.error(`Worker ${w} reported error:`, e.data.error);
            reject(new Error(e.data.error));
            return;
          }

          const { result, uniqueResult } = e.data;

          // Ensure these are Uint8Arrays
          const resultArray = new Uint8Array(result);
          const uniqueResultArray = new Uint8Array(uniqueResult);

          finalArray.set(resultArray, start);
          uniqueArray.set(uniqueResultArray, start);

          resolve();
        };

        worker.onerror = function (err) {
          console.error(`Worker ${w} failed:`, err.message);
          reject(err);
        };

        worker.postMessage(
          {
            arrays: chunkSlices,
            start,
            end,
            selectedRestrictionIndex,
          },
          [...chunkSlices.map((a) => a.buffer)] // Transfer input buffers
        );
      });

      promises.push(p);
    }

    return Promise.all(promises).then(() => {
      const occurrences = countOccurrences(finalArray);
      const done = true;

      return {
        finalArray,
        uniqueArray,
        occurrences,
        done,
      };
    });
  }

  let message = $state("Processing layers...");

  // $effect(async () => {
  //   canvas = document.createElement("canvas");
  //   canvas.width = width;
  //   canvas.height = height;
  //   ctx = canvas.getContext("2d");
  //   imageData = ctx.createImageData(width, height);

  //   for (let i = 0; i < blendedArray.length; i++) {
  //     const value = blendedArray[i];

  //     imageData.data[i * 4 + 0] = 0; // redValue; //R
  //     imageData.data[i * 4 + 1] = 0; // greenValue; //G
  //     imageData.data[i * 4 + 2] = 0; // blueValue; //B
  //     imageData.data[i * 4 + 3] = value !== 0 ? 255 : 0; //Alpha
  //   }

  //   if (canvas) {
  //     ctx.putImageData(imageData, 0, 0);

  //     // Convert canvas to data URL
  //     dataURL = canvas.toDataURL();
  //   }
  // });
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
      <li>{layer.filename} - area: {layer.area.toLocaleString()} ha</li>
    {/each}
  </ul>
{/if}
{#if $blendingProgress < 100}
  <p>Blending... {$blendingProgress.toFixed(1)}%</p>
  <progress max="100" value={$blendingProgress}></progress>
{:else}
  <p>
    Blending done, total area in England is {englandArea.toLocaleString()} ha, of
    which {(englandArea - blendedArrayLength).toLocaleString()} ha is unrestricted
  </p>
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
<div class="os-map-container">
  {#if dataURL && bbox}
    <OsMap {dataURL} {dataURLForUniques} {dataURLForSelectedArea} {bbox} />
  {/if}
</div>

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
