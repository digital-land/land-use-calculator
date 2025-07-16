<script>
  import { onMount, tick } from "svelte";
  import { enhance } from "$app/forms";
  import { fromUrl, fromBlob, fromArrayBuffer } from "geotiff";
  import { writable } from "svelte/store";
  import { browser } from "$app/environment";
  import {
    CheckBox,
    PhaseBanner,
    FilterPanel,
  } from "@communitiesuk/svelte-component-library";
  import Map from "$lib/map/Map.svelte";
  import OsMap from "$lib/map/OSMap.svelte";
  import proj4 from "proj4";
  import { base } from "$app/paths";
  import Table from "$lib/Table.svelte";
  import { csvParse } from "d3-dsv";
  import LALookup from "$lib/LALookup.js";
  import JSZip from "jszip";

  let done = $state(false);
  $inspect({ done });
  let ones;
  let dataURL = $state();
  let dataURLForUniques = $state();
  let dataURLForSelectedArea = $state();
  let occurrences = $state();
  $inspect(occurrences);
  let finalArray = $state();
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
  const AREA_ON_COLOR = 0xff0000ff;
  const AREA_OFF_COLOR = 0x000000ff;
  const TOTAL_ON_COLOR = 0xff000000;
  const TOTAL_OFF_COLOR = 0x00000000;
  let rasterLayers = $state([]);
  let lookup = [];
  let bitLayers = $state([]);
  $inspect(bitLayers);
  let currentBitArrays = $state();
  $inspect({ currentBitArrays });
  let England = $state();
  let englandLength = $derived(England?.length);

  let enrichedLayers = $state([]);

  let englandArea = $derived(
    enrichedLayers?.find((d) => d.filename == "ENGLAND_100M.tif")?.area
  );
  $inspect(englandArea);

  let blendedArray = $state([]);
  $inspect(blendedArray);
  let blendedArrayLength = $state(0);
  let selected = $state([]);
  let tableData = $derived(
    //DERIVED 6
    // if (englandArea && blendedArrayLength) {
    selected.map((layer, i) => {
      return {
        name: layer.replace(".tif", "").replaceAll("_", " "),
        area: enrichedLayers?.find((d) => d.filename == layer).area,
        unique: occurrences && occurrences[i] ? occurrences[i] : "-",
      };
    })
  );

  let tableMetadata = {
    name: {
      explainer: "Sort by restriction name",
      label: "Name",
      shortLabel: "Name",
    },
    area: {
      explainer:
        "Sort by the total area in England covered by this restriction",
      label: "Area",
      shortLabel: "Area",
    },
    unique: {
      explainer:
        "Sort by hectares where this is the only barrier to development",
      label: "Uniquely this",
      shortLabel: "Uniquely this",
    },
  };

  let sortState = $state({ column: "unique", order: "descending" });

  let startingPosition = $state();
  let filterSections = $derived([
    {
      id: "categories",
      type: "checkboxes",
      title: "Categories",
      ga4Section: "categories_filter",
      ga4IndexSection: 1,
      ga4IndexSectionCount: 2,
      name: "categories[]",
      legend: "Select categories",
      options: startingPosition?.slice(0, 3)?.map((layer) => {
        return { value: layer, label: layer };
      }),
      // selectedValues: startingPosition, //If we want all selected initially
    },
    {
      id: "second-categories",
      type: "checkboxes",
      title: "Second set of Categories",
      ga4Section: "second_categories_filter",
      ga4IndexSection: 2,
      ga4IndexSectionCount: 3,
      name: "second_categories[]",
      legend: "",
      options: startingPosition?.slice(3)?.map((layer) => {
        return { value: layer, label: layer };
      }),
      // selectedValues: startingPosition, //If we want all selected initially
    },
  ]);

  let uniqueArray = $state([]);
  // let selectedRestrictionIndex = 0;
  let selectedRestriction = $state();
  let restrictionChanged = $state(false);
  let selectedRestrictionIndex = $derived(
    selectedRestriction
      ? selected
          ?.map((d) => d.replace(".tif", "").replaceAll("_", " "))
          // .filter((d) => !d.includes("ENGLAND"))
          .indexOf(selectedRestriction)
      : undefined
  );
  $inspect(selectedRestrictionIndex);
  let renderUnique = $derived(selectedRestrictionIndex >= 0 ? true : false);
  $inspect({ renderUnique });
  const blendingProgress = writable(0);
  let geotiffFile = $state();
  let csvFile = $state();
  let zipFile = $state();

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const zip = await JSZip.loadAsync(file);
    for (const filename in zip.files) {
      const zipEntry = zip.files[filename];

      if (zipEntry.dir) continue;

      if (filename.endsWith(".csv") && !filename.startsWith("_")) {
        const csvText = await zipEntry.async("text");

        console.log("Parsed CSV:", csvText);

        startingPosition = parseMetadataCsv(csvText)
          .filter((d) => d.filename !== "ENGLAND_100M.tif")
          .map((d) => d.filename);
        console.log(startingPosition);
      }

      if (
        (filename.endsWith(".tif") || filename.endsWith(".tiff")) &&
        !filename.startsWith("_")
      ) {
        const arrayBuffer = await zipEntry.async("arraybuffer");
        // const tiff = await fromArrayBuffer(arrayBuffer);
        // const image = await tiff.getImage(); // Or loop through multiple images

        // const rasters = await image.readRasters(); // { width, height, data: [TypedArray] }
        // const width = image.getWidth();
        // const height = image.getHeight();
        // const bbox = image.getBoundingBox();

        const geotiff = await fromArrayBuffer(arrayBuffer);
        const image = await geotiff.getImage();
        width = image.getWidth();
        height = image.getHeight();
        bbox = image.getBoundingBox();
        const rasters = await image.readRasters();

        const result = new Uint8Array(width * height);

        console.log("GeoTIFF:", filename, result);
      }
    }
  }

  let csvLocation = $derived(
    //DERIVED 3
    csvFile?.length > 0 ? csvFile[0] : `${base}/bitpacking_metadata.csv`
  );

  function parseMetadataCsv(csvText) {
    const lines = csvText.trim().split("\n");
    const headers = lines[0].trim().split(",");

    return lines.slice(1).map((line) => {
      // console.log(line);
      const values = line.split(",");
      const row = {};
      headers.forEach((h, i) => (row[h] = values[i].replace("\r", "")));
      // console.log(row);
      return row;
    });
  }

  let geotiff = $state();

  // let unpackWorker;
  let blendWorker;

  $effect(() => {
    if (restrictionChanged) {
      console.log("effect 1 - restriction changed - update blending");
      done = false;
      // renderUnique = selectedRestrictionIndex >= 0 ? true : false;
      dataURLForUniques = undefined;
      dataURLForSelectedArea = undefined;
      restrictionChanged = !restrictionChanged;
      blendLayers();
    }
  });

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
      // selected = enrichedLayers
      //   .map((e) => e.filename)
      //   .filter((e) => e != "ENGLAND_100M.tif");

      // startingPosition = enrichedLayers
      //   .map((e) => e.filename)
      //   .filter((e) => e != "ENGLAND_100M.tif");

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

      startingPosition = parseMetadataCsv(metadataCsv)
        .filter((d) => d.filename !== "ENGLAND_100M.tif")
        .map((d) => d.filename);

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
      // const blendWorker = new Worker(
      //   new URL("$lib/workers/blendWorker.js", import.meta.url),
      //   { type: "module" }
      // );

      // // Select the active layers
      // const active = enrichedLayers.filter((l) =>
      //   selected.includes(l.filename)
      // );
      // currentBitArrays = active.map((l) => l.data);
      // // Ensure Uint8Arrays
      // const duplicateBitLayers = active.map((l) => new Uint8Array(l.data));

      // // Get the raw buffers
      // const buffers = duplicateBitLayers.map((arr) => arr.buffer);

      // // Post to the worker (transferring buffers)
      // blendWorker.postMessage(
      //   {
      //     bitArrays: buffers, // ✅ send raw ArrayBuffers
      //     englandLength, // e.g. 37371060
      //   },
      //   buffers // ✅ transfer buffers (zero-copy)
      // );

      // // Listen for messages
      // blendWorker.onmessage = (e) => {
      //   if (e.data.progress !== undefined) {
      //     blendingProgress.set(e.data.progress);
      //   } else if (e.data.type === "done") {
      //     blendedArrayLength = e.data.activeCount;
      //     blendedArray = new Uint8Array(e.data.result); // ✅ re-wrap transferred buffer
      //     occurrences = e.data.occurrences;
      //     blendingProgress.set(100);
      //     console.log("Blending complete:", blendedArrayLength);
      //     findTheOnes(
      //       enrichedLayers
      //         .filter((l) => selected.includes(l.filename))
      //         .map((l) => l.data)
      //     )?.then(({ finalArray, uniqueArray, occurrences, done }) => {
      //       console.log("Done processing.", done);
      //       console.log("Final result:", finalArray);
      //       console.log("Selected mask:", uniqueArray);
      //       console.log("Occurrences:", occurrences);
      //     });
      //   } else if (e.data.error) {
      //     console.error("Blend worker error:", e.data.error);
      //   }
      // };
      blendLayers();
    }
  });

  function blendLayers() {
    const blendWorker = new Worker(
      new URL("$lib/workers/blendWorker.js", import.meta.url),
      { type: "module" }
    );

    // Select the active layers
    const active = enrichedLayers.filter((l) => selected.includes(l.filename));
    currentBitArrays = active.map((l) => l.data);
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
        // occurrences = e.data.occurrences;
        blendingProgress.set(100);
        console.log("Blending complete:", blendedArrayLength);
        findTheOnes(
          enrichedLayers
            .filter((l) => selected.includes(l.filename))
            .map((l) => l.data)
        )?.then(({ finalArray, uniqueArray, occurrences, done }) => {
          console.log("Done processing.", done);
          console.log("Final result:", finalArray);
          console.log("Selected mask:", countOccurrences(uniqueArray));
          console.log("Occurrences:", occurrences);
          makeAndPaintCanvases();
        });
        // .then();
      } else if (e.data.error) {
        console.error("Blend worker error:", e.data.error);
      }
    };
  }

  function makeAndPaintCanvases() {
    done = false;
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
    imageData = ctx.createImageData(width, height);

    const totalPixels = new Uint32Array(imageData.data.buffer);
    for (let i = 0; i < blendedArray.length; i++) {
      const value = blendedArray[i];

      totalPixels[i] = value !== 0 ? TOTAL_ON_COLOR : TOTAL_OFF_COLOR;
    }

    if (canvas) {
      ctx.putImageData(imageData, 0, 0);

      // Convert canvas to data URL
      dataURL = canvas.toDataURL();
    }

    if (selectedRestrictionIndex >= 0) {
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

      // const renderUnique = true;
      // console.log(renderUnique);

      const pixels = new Uint32Array(imageDataForUniques?.data.buffer);
      console.log(countOccurrences(uniqueArray), countOccurrences(finalArray));
      for (let i = 0; i < uniqueArray.length; i++) {
        const valueUnique = renderUnique ? uniqueArray[i] : 0;
        pixels[i] = valueUnique == 1 ? UNIQUE_ON_COLOR : UNIQUE_OFF_COLOR;
      }

      // Draw to canvas
      if (canvasForUniques) {
        ctxForUniques.putImageData(imageDataForUniques, 0, 0);

        // Only convert to Data URL if needed (since it's expensive)
        dataURLForUniques = canvasForUniques.toDataURL();
      }

      const areaPixels = new Uint32Array(imageDataForSelectedArea?.data.buffer);

      // console.log(
      //   uniqueArray.length,
      //   currentBitArrays[selectedRestrictionIndex].length
      // );
      for (
        let i = 0;
        i < currentBitArrays[selectedRestrictionIndex].length;
        i++
      ) {
        const valueSelectedArea = renderUnique
          ? currentBitArrays[selectedRestrictionIndex][i]
          : 0;

        areaPixels[i] =
          valueSelectedArea !== 0 ? AREA_ON_COLOR : AREA_OFF_COLOR;
      }
      if (canvasForSelectedArea) {
        ctxForSelectedArea.putImageData(imageDataForSelectedArea, 0, 0);

        // Convert canvas to data URL
        dataURLForSelectedArea = canvasForSelectedArea.toDataURL();
      }
    }
    done = true;
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

  function findTheOnes(bitArrays) {
    if (!bitArrays.length) return;

    const NUM_WORKERS = 4;
    const length = bitArrays[0].length;
    const chunkSize = Math.ceil(length / NUM_WORKERS);

    finalArray = new Uint8Array(length);
    let interimUniqueArray = new Uint8Array(length);
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
          interimUniqueArray.set(uniqueResultArray, start);

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
      occurrences = countOccurrences(finalArray);
      uniqueArray = new Uint8Array(interimUniqueArray);
      const done = true;

      return {
        finalArray,
        uniqueArray,
        occurrences,
        done,
      };
    });
    // .then(makeAndPaintCanvases());
  }

  let message = $state("Processing layers...");
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

{#if $blendingProgress < 100}
  <p>Blending... {$blendingProgress.toFixed(1)}%</p>
  <progress max="100" value={$blendingProgress}></progress>
{:else}
  <p>
    Blending done, total area in England is {englandArea.toLocaleString()} ha.
    {#if blendedArrayLength > 0}
      {blendedArrayLength.toLocaleString()} ha is covered by the selected categories.
    {/if}
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

<div class="container">
  <div class="output">
    <div>
      <details>
        <summary>Use a local file (optional)</summary>
        <br />
        <!-- <label for="csv-file-upload">Use a local csv file:</label>
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
        <br /> -->
        <label for="zip-file-upload">Use a local zip file:</label>
        <input
          bind:files={zipFile}
          accept=".zip"
          id="file-upload"
          type="file"
          onchange={handleFileUpload}
        />
      </details>
    </div>

    {#if startingPosition}
      <!-- <ul>
    {#each enrichedLayers.filter((e) => e.filename != "ENGLAND_100M.tif") as layer, i}
      <li
        onclick={() => {
          console.log(i);
          selectedRestrictionIndex = i;
        }}
      >
        {layer.filename} - area: {layer.area.toLocaleString()} ha
      </li>
    {/each}
  </ul> -->
      <form
        method="POST"
        use:enhance={({ formData, cancel }) => {
          console.log(formData.getAll("categories[]"), selected);
          selected = [];
          formData.forEach((d) => selected.push(d));
          // selected = formData.getAll("categories[]");
          // Cancel server submission and process client-side
          cancel();

          // No server action needed
        }}
      >
        <FilterPanel
          sectionsData={filterSections}
          resultsCount={""}
          filterButtonText="Show filters"
          applyButtonText="Apply filters"
          ga4BaseEvent={{ event_name: "filter_items", type: "basic" }}
        />
      </form>
    {/if}

    <!-- {#if rasterLayers.length}
      <p>
        {LALookup[selectedArea - 1]?.LPA23NM ?? "England"} total:
        {englandArea ? englandArea.toLocaleString() : "..."} ha.
      </p>

      <fieldset>
        <legend>Layers to turn on/off:</legend>


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
                : {layer.area?.toLocaleString() ?? 0} ha
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
    {/if} -->
  </div>
  <div>
    {#if dataURL && bbox.length > 0}
      {console.log("Rendering the map!")}

      <div class={["os-map-container", { done }]}>
        <!-- {#key geotiffFile}
          <OsMap
            {dataURL}
            {dataURLForUniques}
            {dataURLForSelectedArea}
            {bbox}
            bind:selectedAreaName
          />
        {/key} -->
        <OsMap {dataURL} {dataURLForUniques} {dataURLForSelectedArea} {bbox} />
      </div>
    {/if}
  </div>
  <div class="table">
    {#if tableData.length > 0}
      <p>
        The total area covered by the selected categories is shown in <span
          class="totalHighlightText">grey</span
        > on the map.
      </p>
      <p>
        Select a row in the table to see areas that are covered by this category
        and no others, highlighted in <span class="uniqueHighlightText"
          >red</span
        >
        on the map, with the total area in this category shown in
        <span class="areaHighlightText">pink</span>.
      </p>
      {#key tableData}
        <Table
          caption={""}
          data={tableData.sort((a, b) => +b.unique - +a.unique)}
          metaData={tableMetadata}
          colourScale={"Off"}
          bind:sortState
          bind:selectedRestriction
          bind:restrictionChanged
          sortedColumn={"unique"}
        />
      {/key}
    {:else}
      <p>Select some categories to view the data.</p>
    {/if}
  </div>
</div>
<p>{message}</p>

<style>
  .container {
    display: grid;
    grid-template-columns: 23% 40% 37%;
    font-family: sans-serif;
    max-height: 85vh;
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
    height: 80vh;
  }
  :global(td.govuk-table__cell) {
    padding-right: 20px;
  }
  summary {
    cursor: pointer;
  }

  .totalHighlightText {
    font-weight: 700;
    color: dimgray;
  }

  .uniqueHighlightText {
    font-weight: 700;
    color: crimson;
  }

  .areaHighlightText {
    font-weight: 700;
    color: #e75480;
  }
  .os-map-container:not(.done) {
    background-color: grey;
    opacity: 0.5;
    transition: all 500ms ease-in-out;
  }

  .os-map-container:not(.done)::after {
    content: "Recalculating...";
  }
</style>
