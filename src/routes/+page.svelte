<script>
  import { onMount } from "svelte";
  import { fromUrl, fromBlob } from "geotiff";
  import { writable } from "svelte/store";
  import { browser } from "$app/environment";
  import { CheckBox } from "@communitiesuk/svelte-component-library";
  import Map from "$lib/map/Map.svelte";
  import OsMap from "$lib/map/OSMap.svelte";
  import proj4 from "proj4";
  import { base } from "$app/paths";
  import Table from "$lib/Table.svelte";

  let done = $state(false);
  let ones;
  let dataURL = $state();
  let dataURLForUniques = $state();
  let occurences = $state();
  // let finalArray = $state();
  let width = $state(0),
    height = $state(0);
  let bbox = $state([]);
  let canvas = $state();
  let canvasForUniques = $state();
  let ctx = $state();
  let ctxForUniques = $state();
  let image = $state();
  let imageData = $state();
  let imageDataForUniques = $state();
  let rasterLayers = $state([]);
  let lookup = [];
  let bitLayers = $state([]);
  let England;
  let selected = $state([]);
  let blendedArray = $state([]);
  let blendedArrayLength = $state(0);
  let startingPosition;
  let selectedRestriction = $state();
  let restrictionChanged = $state(false);

  let selectedRestrictionIndex = $derived(
    rasterLayers
      ?.map((d) => d.filename.replace(".tif", "").replaceAll("_", " "))
      .filter((d) => !d.includes("ENGLAND"))
      .indexOf(selectedRestriction)
  );
  // $inspect(selectedRestrictionIndex);
  let uniqueArray = $state([]);
  // $inspect(uniqueArray);
  // let styleSheet = $state();
  // let redValue = Math.random() * 255;
  // let greenValue = Math.random() * 255;
  // let blueValue = Math.random() * 255;
  let checkboxOptions = $state();
  // $inspect(blendedArray.length);
  const blendingProgress = writable(0);
  let geotiffFile = $state();
  let csvFile = $state();
  // $inspect(geotiffFile);
  let tiffLocation = $derived(
    geotiffFile?.length > 0 ? geotiffFile[0] : `${base}/data/LAs/LA1.tif`
  );
  let csvLocation = $derived(
    csvFile?.length > 0 ? csvFile[0] : `${base}/bitpacking_metadata.csv`
  );

  // let metadataCsv = $state();
  // $inspect(metadataCsv);
  let geotiff = $state();
  // $inspect(geotiff);
  // let metadataRes = $state();
  // $inspect(metadataRes);
  $inspect({ tiffLocation, csvLocation, csvFile });
  // Workers
  let unpackWorker, blendWorker, onesWorker;

  // Init workers on client
  if (browser) {
    unpackWorker = new Worker(
      new URL("../lib/workers/bitUnpackerWorker.js?worker", import.meta.url),
      { type: "module" }
    );

    blendWorker = new Worker(
      new URL("../lib/workers/blendWorker.js?worker", import.meta.url),
      { type: "module" }
    );

    unpackWorker.onmessage = (e) => {
      const { bitLayers: bits, rasterLayers: layers } = e?.data;

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
      selected = rasterLayers
        .map((e) => e.filename)
        .filter((e) => e != "ENGLAND_100M.tif");

      startingPosition = rasterLayers
        .map((e) => e.filename)
        .filter((e) => e != "ENGLAND_100M.tif");
      updateBlending();
      //findTheOnes();
    };

    unpackWorker.onerror = (e) => {
      console.log("ERROR", e);
    };
    blendWorker.onmessage = (e) => {
      if (e.data.progress !== undefined) {
        blendingProgress.set(e.data.progress);
      } else if (e.data.type === "done") {
        blendedArrayLength = e.data.activeCount;
        blendedArray = e.data.result;
        blendingProgress.set(100);
      }
    };
  }

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

  // Trigger blending in worker
  function updateBlending() {
    if (!England) return;
    const active = rasterLayers.filter((l) => selected.includes(l.filename));
    // console.log("active", active);
    const bitArrays = active.map((l) => l.data);
    blendingProgress.set(0);
    // console.log("bitarrays", bitArrays); //THIS IS WHERE I NEED TO DO THE SINGLE BLOCKER CALC...
    blendWorker.postMessage({ bitArrays, englandMask: England });
    findTheOnes(bitArrays, active);
  }

  $effect(() => {
    if (restrictionChanged) {
      restrictionChanged = !restrictionChanged;
      updateBlending();
    }
  });

  function findTheOnes(ba, active) {
    if (ba.length) {
      const bitArrays = ba;
      const NUM_WORKERS = 4;
      const numArrays = 18;
      const length = bitArrays[0].length;

      const inputArrays = bitArrays;
      const chunkSize = Math.ceil(length / NUM_WORKERS);
      const workers = [];
      const finalArray = new Uint8Array(length);
      uniqueArray = new Uint8Array(length);
      const promises = [];

      for (let w = 0; w < NUM_WORKERS; w++) {
        const worker = new Worker(
          new URL("../lib/workers/onesWorker.js?worker", import.meta.url),
          { type: "module" }
        );
        workers.push(worker);

        const start = w * chunkSize;
        const end = Math.min(start + chunkSize, length);
        const chunkSlices = inputArrays.map((arr) => arr.slice(start, end));

        const p = new Promise((resolve, reject) => {
          worker.onmessage = function (e) {
            if (e.data.error) {
              console.error(`Worker ${w} reported error:`, e.data.error);
              reject(new Error(e.data.error));
              return;
            }

            finalArray.set(new Uint8Array(e.data.result), start);
            // if (selectedRestrictionIndex) {
            uniqueArray.set(
              new Uint8Array(e.data.result).map((d) =>
                d == selectedRestrictionIndex ? 1 : 0
              ),
              start
            );
            // }

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
            },
            chunkSlices.map((a) => a.buffer)
          );
        });

        // ✅ push promise into array
        promises.push(p);
      }

      // ✅ wait for all promises to complete
      return Promise.all(promises).then(() => {
        occurences = countOccurrences(finalArray);
        done = true;
        console.log(uniqueArray);

        console.log("✅ All workers done. Final array ready.", occurences);
      });
    }
  }

  // // Parse metadata CSV
  // function parseMetadataCsv(csvText) {
  //   const lines = csvText.trim().split("\n");
  //   const headers = lines[0].split(",");
  //   return lines.slice(1).map((line) => {
  //     const values = line.split(",");
  //     const row = {};
  //     headers.forEach((h, i) => (row[h] = values[i]));
  //     return row;
  //   });
  // }

  // $inspect(rasters);
  $effect(async () => {
    geotiff =
      geotiffFile?.length > 0
        ? await fromBlob(tiffLocation)
        : await fromUrl(tiffLocation);
    image = await geotiff.getImage();
    width = image.getWidth();
    height = image.getHeight();
    bbox = image.getBoundingBox();
    // console.log(image, width, height, bbox[0]);
    let metadataRes =
      csvFile?.length > 0 ? csvLocation : await fetch(csvLocation);

    let metadataCsv = await metadataRes.text();

    // console.log("SENDING UNPACK MESSAGE");
    if (metadataCsv) {
      unpackWorker.postMessage({
        url: tiffLocation,
        metadataCsv: metadataCsv,
      });
    }

    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
    imageData = ctx.createImageData(width, height);

    canvasForUniques = document.createElement("canvas");
    canvasForUniques.width = width;
    canvasForUniques.height = height;
    ctxForUniques = canvasForUniques.getContext("2d");
    imageDataForUniques = ctxForUniques.createImageData(width, height);
  });

  $effect(async () => {
    let metadataRes =
      csvFile?.length > 0 ? csvLocation : await fetch(csvLocation);

    let metadataCsv = await metadataRes.text();

    if (metadataCsv && tiffLocation) {
      unpackWorker.postMessage({
        url: tiffLocation,
        metadataCsv: metadataCsv,
      });
    }
  });

  // $inspect(selected, rasterLayers);
  $effect(() => {
    // console.log(blendedArrayLength, blendedArray.length);
    for (let i = 0; i < blendedArray.length; i++) {
      const value = blendedArray[i];

      imageData.data[i * 4 + 0] = 0; // redValue; //R
      imageData.data[i * 4 + 1] = 0; // greenValue; //G
      imageData.data[i * 4 + 2] = 0; // blueValue; //B
      imageData.data[i * 4 + 3] = value !== 0 ? 255 : 0; //Alpha
    }

    for (let i = 0; i < uniqueArray.length; i++) {
      const valueUnique = uniqueArray[i];

      imageDataForUniques.data[i * 4 + 0] = 255; // redValue; //R
      imageDataForUniques.data[i * 4 + 1] = 0; // greenValue; //G
      imageDataForUniques.data[i * 4 + 2] = 0; // blueValue; //B
      imageDataForUniques.data[i * 4 + 3] = valueUnique !== 0 ? 255 : 0; //Alpha
    }

    if (canvas) {
      ctx.putImageData(imageData, 0, 0);

      // Convert canvas to data URL
      dataURL = canvas.toDataURL();
    }

    if (canvasForUniques) {
      ctxForUniques.putImageData(imageDataForUniques, 0, 0);

      // Convert canvas to data URL
      dataURLForUniques = canvasForUniques.toDataURL();
    }

    if (rasterLayers.length) {
      checkboxOptions = rasterLayers
        .filter((d) => d.filename !== "ENGLAND_100M.tif")
        .map((d) => {
          return {
            label: `${d.filename.replace(".tif", "").replaceAll("_", " ")}: ${
              d.area?.toLocaleString() ?? 0
            } ha`,
            value: d.filename,
          };
        });
    }
  });

  // $inspect(checkboxOptions);
  let selectionsLength = $derived(selected.length);
  $effect(() => {
    selectionsLength = selected.length;
    updateBlending();
  });

  let englandArea = $derived(
    rasterLayers.find((e) => e.filename === "ENGLAND_100M.tif")?.area
  );

  let tableData = $derived(
    selected.map((layer, i) => {
      return {
        name: layer.replace(".tif", "").replaceAll("_", " "),
        area: rasterLayers.find((d) => d.filename == layer).area,
        unique: occurences && occurences[i] ? occurences[i] : 0,
      };
    })
  );

  let tableMetadata = {
    name: { explainer: "Restriction name", label: "Name", shortLabel: "Name" },
    area: {
      explainer: "The total area in England covered by this restriction",
      label: "Area",
      shortLabel: "Area",
    },
    unique: {
      explainer: "Hectares where this is the only barrier to development",
      label: "Uniquely this",
      shortLabel: "Uniquely this",
    },
  };

  let sortState = $state({ column: "sortedColumn", order: "descending" });
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

<!-- <h1>[Heading]</h1> -->
<!-- <p>[Description]</p> -->
<h2>
  The total area of land in England is {englandArea
    ? englandArea.toLocaleString()
    : "..."} ha. Removing areas with the selected restrictions there are {englandArea
    ? (englandArea - blendedArrayLength).toLocaleString()
    : "..."} ha left over.
</h2>
<!-- <p>[potentially visualisations]</p> -->

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
      <p>
        England total: {rasterLayers
          .find((e) => e.filename === "ENGLAND_100M.tif")
          ?.area.toLocaleString()} ha
      </p>

      <fieldset>
        <legend>Layers to turn on/off:</legend>
        <button
          onclick={() => {
            console.log(selected);
            selected.length = 0;
            console.log(selected);
            updateBlending();
            return (selected = selected);
          }}>all off</button
        >
        <button
          onclick={() => {
            selected.length = 0;
            startingPosition.forEach((e) => selected.push(e));
            updateBlending();
            return (selected = selected);
          }}>all on</button
        >

        {#each rasterLayers as layer (layer.filename)}
          {#if layer.filename !== "ENGLAND_100M.tif"}
            <div>
              <input
                name="checkbox"
                type="checkbox"
                bind:group={selected}
                value={layer.filename}
                onchange={() => updateBlending()}
              />

              <label for="checkbox">
                {layer.filename.replace(".tif", "").replaceAll("_", " ")}
                <!-- : {layer.area?.toLocaleString() ?? 0} ha -->
              </label>
            </div>
          {/if}
        {/each}

        <!-- 
           <CheckBox
          legend={""}
          small={true}
          name={"checkboxes"}
          options={checkboxOptions}
          bind:selectedValues={selected}
        />    
-->
      </fieldset>
      {#if $blendingProgress < 100}
        <p>Blending... {$blendingProgress.toFixed(1)}%</p>
        <progress max="100" value={$blendingProgress}></progress>
      {:else}
        <p>
          <b
            >English land outside selected categories:
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
    {#await image}
      {console.log("waiting")}
      <p>Generating the map...</p>
    {:then image}
      {console.log("done waiting")}
      <!-- {#if dataURL && bbox} -->
      <!-- <Map onclick={logClick} mapHeight={700} {styleSheet} /> -->

      <div class="os-map-container">
        <!-- {#key (dataURL, dataURLForUniques)} -->
        <OsMap {dataURL} {dataURLForUniques} {bbox} />
        <!-- {/key} -->
      </div>
      <!-- {/if} -->
    {/await}
  </div>
  {#if done}
    <div class="table">
      {#key tableData}
        {#if tableData}
          <Table
            caption={""}
            data={tableData}
            metaData={tableMetadata}
            colourScale={"Off"}
            bind:sortState
            bind:selectedRestriction
            bind:restrictionChanged
            sortedColumn={"unique"}
          />
        {/if}
      {/key}
    </div>
  {/if}
</div>

<!-- <h2>Selected area</h2>
<details open>
  <summary>Expand to adjust</summary>
  <p>Clicked location is {clickedLocation}</p>
  <p>Corresponding tile pixel coordinate: {tileAtClickedLocation}</p>
  <p>Pixel covers the following GPS area: {tileArea}</p>
  <p>Data at this location: {tileData}</p>
</details> -->

<style>
  .container {
    display: grid;
    grid-template-columns: 20% 40% 40%;
    font-family: sans-serif;
  }
  .output,
  .table {
    padding: 10px;
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
</style>
