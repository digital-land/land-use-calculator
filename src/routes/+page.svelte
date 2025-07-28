<script>
  import { onMount, tick } from "svelte";
  import { enhance } from "$app/forms";
  import { fromUrl, fromBlob, fromArrayBuffer } from "geotiff";
  import { writable } from "svelte/store";
  import { browser } from "$app/environment";
  import {
    CheckBox,
    PhaseBanner,
  } from "@communitiesuk/svelte-component-library";
  import Map from "$lib/map/Map.svelte";
  import FilterPanel from "$lib/FilterPanel.svelte";
  import Button from "$lib/Button.svelte";
  import Details from "$lib/Details.svelte";
  import OsMap from "$lib/map/OSMap.svelte";
  import proj4 from "proj4";
  import { base } from "$app/paths";
  import Table from "$lib/Table.svelte";
  import { csvParse } from "d3-dsv";
  // import LALookup from "$lib/LALookup.js";
  import JSZip from "jszip";

  let done = $state(false);
  $inspect({ done });
  let ones;
  let dataURL = $state();
  // $inspect(dataURL);
  let dataURLForUniques = $state();
  // $inspect(dataURLForUniques);
  let dataURLForSelectedArea = $state();
  let occurrences = $state();
  // $inspect(occurrences);
  let finalArray = $state();
  let width = $state(0),
    height = $state(0);
  let bbox = $state([]);
  // $inspect({ width, height, bbox });
  // let canvas = $state();
  // let canvasForUniques = $state();
  // let canvasForSelectedArea = $state();
  // let ctx = $state();
  // let ctxForUniques = $state();
  // let ctxForSelectedArea = $state();
  // let image = $state();
  // let imageData = $state();
  // let imageDataForUniques = $state();
  // let imageDataForSelectedArea = $state();
  // Define RGBA colors in little-endian format (most systems are little-endian)
  const UNIQUE_ON_COLOR = 0xff0000ff; // Red with full opacity (R=255, G=0, B=0, A=255)
  const UNIQUE_OFF_COLOR = 0x000000ff; // Red with 0 alpha (R=255, G=0, B=0, A=0)
  const AREA_ON_COLOR = 0xff0000ff;
  const AREA_OFF_COLOR = 0x000000ff;
  const TOTAL_ON_COLOR = 0xff000000;
  const TOTAL_OFF_COLOR = 0x00000000;

  const OFF_COLOR = 0x00000000; // Transparent
  const BLENDED_COLOR = 0x88000000; // Gray
  const BLENDED_AREA_COLOR = 0x0ff0100;
  const UNIQUE_AREA_COLOR = 0xff0000ff;

  // let rasterLayers = $state([]);
  // let lookup = [];
  let bitLayers = $state([]);
  // $inspect(bitLayers);
  let currentBitArrays = $state();
  // $inspect({ currentBitArrays });
  // let England = $state();
  // let englandLength = $derived(England?.length);

  let enrichedLayers = $state([]);

  // let englandArea = $derived(
  //   enrichedLayers?.find((d) => d.filename == "ENGLAND_100M.tif")?.area
  // );
  // $inspect(englandArea);

  let blendedArray = $state([]);
  // $inspect(blendedArray);
  let blendedArrayLength = $state(0);
  let selected = $state([]);
  let tableData = $derived(
    //DERIVED 6
    // if (englandArea && blendedArrayLength) {
    selected?.map((layer, i) => {
      return {
        name: layer.replace(".tif", "").replaceAll("_", " "),
        area: enrichedLayers?.find((d) => d.filename == layer)?.area
          ? enrichedLayers?.find((d) => d.filename == layer)?.area
          : "-",
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

  let filterSections = $derived(
    [...new Set(startingPosition?.map((d) => d.Tier))]?.map((section, i) => {
      const thisSectionData = startingPosition?.filter(
        (d) => d.Tier == section
      );
      return {
        tier: section,
        sections: [...new Set(thisSectionData?.map((d) => d.Category))]?.map(
          (category, j) => {
            return {
              id: `categories${section.replaceAll(" ", "_")}-${j}`,
              type: "checkboxes",
              title: category,
              ga4Section: "categories_filter",
              ga4IndexSection: 1,
              ga4IndexSectionCount: 2,
              name: `categories${i}-${j}[]`,
              legend: "",
              openByDefault: false,
              options: thisSectionData
                .filter((d) => d.Category == category)
                ?.map((layer) => {
                  return {
                    value: layer.filename,
                    label: layer.Data_layer,
                    exclusive: layer.Level == 2 ? true : false,
                    checked: layer.initially_checked === "y" ? true : false,
                  };
                }),
            };
          }
        ),
        // selectedValues: startingPosition, //If we want all selected initially
      };
    })
  );
  // $inspect(filterSections);

  let uniqueArray = $state([]);
  // let selectedRestrictionIndex = 0;
  let selectedRestriction = $state();
  // $inspect({ selectedRestriction });
  let restrictionChanged = $state(false);
  let selectedRestrictionIndex = $derived(
    selectedRestriction
      ? selected
          ?.map((d) => d.replace(".tif", "").replaceAll("_", " "))
          // .filter((d) => !d.includes("ENGLAND"))
          .indexOf(selectedRestriction)
      : undefined
  );
  // $inspect({ selectedRestrictionIndex });
  let renderUnique = $derived(
    selected
      .map((d) => d.replaceAll(".tif", "").replaceAll("_", " "))
      .includes(selectedRestriction)
      ? selectedRestrictionIndex >= 0
        ? true
        : false
      : false
  );
  // $inspect({ renderUnique });

  const blendingProgress = writable(0);
  let blending = $state(false);
  // let geotiffFile = $state();
  let csvFile = $state();
  let zipFile = $state();
  let tiffArrayBuffersFromZip = $state({});

  let layersToUnpack = $state();
  // $inspect(layersToUnpack);

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

        metadataCsv = csvText;

        startingPosition = parseMetadataCsv(csvText);
        // .filter(
        //   (d) => d.filename !== "ENGLAND_100M.tif"
        // );
        // .map((d) => d.filename);
        console.log(startingPosition);
      }

      if (
        (filename.endsWith(".tif") || filename.endsWith(".tiff")) &&
        !filename.startsWith("_")
      ) {
        const arrayBuffer = await zipEntry.async("arraybuffer");

        const cleanFilename =
          filename.split("/")[filename.split("/").length - 1];

        tiffArrayBuffersFromZip[cleanFilename] = arrayBuffer;
      }
    }
    if (startingPosition) {
      selected = startingPosition
        .filter((d) => d.initially_checked === "y")
        .map((d) => d.filename);
      if (selected.length > 0) {
        unpackZippedLayers();
      }
    }
  }

  let csvLocation = $derived(
    //DERIVED 3
    csvFile?.length > 0 ? csvFile[0] : `${base}/ultimate_land_metadata.csv`
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
  let metadataCsv = $state();
  // $inspect(metadataCsv);

  // let unpackWorker;
  let blendWorker;

  $effect(() => {
    if (restrictionChanged) {
      console.log("effect 1 - restriction changed - update blending");
      done = false;

      restrictionChanged = !restrictionChanged;
      blendLayers();
    }
  });

  onMount(async () => {
    try {
      const response = await fetch(csvLocation);
      if (!response.ok) throw new Error("Failed to fetch CSV");
      metadataCsv = await response.text();
      // console.log(metadataCsv);

      startingPosition = parseMetadataCsv(metadataCsv);
      // .filter(
      //   (d) => d.filename !== "ENGLAND_100M.tif"
      // );
      // .map((d) => d.filename);
    } catch (err) {
      message = `CSV Load Error: ${err.message}`;
    }

    if (startingPosition) {
      selected = startingPosition
        .filter((d) => d.initially_checked === "y")
        .map((d) => d.filename);
      unpackSelectedLayers();
    }
  });

  function prepareToUnpack() {
    message = "Processing layers...";
    // let selectedPlusEngland = [...selected];
    // // selectedPlusEngland.push("ENGLAND_100M.tif");
    // console.log(selected, selectedPlusEngland);
    layersToUnpack = selected.map((d) =>
      parseMetadataCsv(metadataCsv).find((layer) => layer.filename === d)
    );
  }

  function unpackSelectedLayers() {
    prepareToUnpack();

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
      bitLayers = e.data.rasterLayers.map((layer) => layer.data);
      enrichedLayers = e.data.rasterLayers;
      height = e.data.height;
      width = e.data.width;
      bbox = e.data.bbox;
      message = `Processed ${enrichedLayers.length} layers.`;

      // England = enrichedLayers.find(
      //   (l) => l.filename === "ENGLAND_100M.tif"
      // )?.data;
      blendLayers();
      simpleWorker.terminate();
    };

    simpleWorker.onerror = (e) => {
      console.error("Worker error:", e);
      message = `Error: ${e.message}`;
    };

    const safeLayersToUnpack = layersToUnpack.map((layer) => ({
      filename: layer.filename,
    }));

    simpleWorker.postMessage({
      layersToUnpack: safeLayersToUnpack,
      base,
    });
  }

  function unpackZippedLayers() {
    prepareToUnpack();

    dataURL = null;
    dataURLForUniques = null;
    dataURLForSelectedArea = null;

    const simpleZipWorker = new Worker(
      new URL("$lib/workers/simpleZipUnpackWorker.js", import.meta.url),
      { type: "module" }
    );

    simpleZipWorker.onmessage = (e) => {
      if (e.data.error) {
        message = `Worker error: ${e.data.error}`;
        return;
      }

      console.log("Processed data:", e.data);
      bitLayers = e.data.rasterLayers.map((layer) => layer.data);
      enrichedLayers = e.data.rasterLayers;
      height = e.data.height;
      width = e.data.width;
      bbox = e.data.bbox;
      message = `Processed ${enrichedLayers.length} layers.`;

      // England = enrichedLayers.find(
      //   (l) => l.filename === "ENGLAND_100M.tif"
      // )?.data;

      blendLayers();
      simpleZipWorker.terminate();
    };

    layersToUnpack.forEach(
      (layer) => (layer.arrayBuffer = tiffArrayBuffersFromZip[layer.filename])
    );

    simpleZipWorker.onerror = (e) => {
      console.error("Worker error:", e);
      message = `Error: ${e.message}`;
    };

    const clonedLayersToUnpack = layersToUnpack.map((layer) => {
      const clonedBuffer = layer.arrayBuffer.slice(0); // Makes a real copy
      return {
        filename: layer.filename,
        arrayBuffer: clonedBuffer,
      };
    });

    const transferables = clonedLayersToUnpack.map(
      (layer) => layer.arrayBuffer
    );

    simpleZipWorker.postMessage(
      { layersToUnpack: clonedLayersToUnpack },
      transferables
    );
  }

  function blendLayers() {
    console.time("blendLayers");
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
    console.log({ active });
    // Post to the worker (transferring buffers)
    blendWorker.postMessage(
      {
        bitArrays: buffers, // ✅ send raw ArrayBuffers
      },
      buffers // ✅ transfer buffers (zero-copy)
    );
    console.log({ duplicateBitLayers });
    // Listen for messages
    blendWorker.onmessage = (e) => {
      if (e.data.progress !== undefined) {
        blending = true;
        blendingProgress.set(e.data.progress);
      } else if (e.data.type === "done") {
        blendedArrayLength = e.data.activeCount;
        blendedArray = new Uint8Array(e.data.result); // ✅ re-wrap transferred buffer
        // occurrences = e.data.occurrences;
        blending = false;
        blendingProgress.set(100);
        // console.log("Blending complete:", blendedArrayLength);
        console.timeEnd("blendLayers");
        findTheOnes(
          // enrichedLayers
          //   .filter((l) => selected.includes(l.filename))
          //   .map((l) => l.data)
          currentBitArrays
        )?.then(({ finalArray, uniqueArray, occurrences, done }) => {
          // console.log("Done processing.", done);
          // console.log("Final result:", finalArray);
          // console.log("Selected mask:", countOccurrences(uniqueArray));
          // console.log("Occurrences:", occurrences);
          blendWorker.terminate();
          // makeAndPaintCanvases();
          makeAndPaintCombinedCanvas();
        });
        // .then();
      } else if (e.data.error) {
        console.error("Blend worker error:", e.data.error);
      }
    };
  }

  // function makeAndPaintCanvases() {
  //   console.time("canvas");
  //   done = false;

  //   // Helper to make a canvas and get context
  //   function createCanvas(w, h) {
  //     const c = document.createElement("canvas");
  //     c.width = w;
  //     c.height = h;
  //     return [c, c.getContext("2d")];
  //   }

  //   // === TOTAL LAYER ===
  //   let [canvas, ctx] = createCanvas(width, height);
  //   const imageData = ctx.createImageData(width, height);
  //   const totalPixels = new Uint32Array(imageData.data.buffer);

  //   for (let i = 0; i < blendedArray.length; i++) {
  //     const value = blendedArray[i];
  //     totalPixels[i] = value !== 0 ? TOTAL_ON_COLOR : TOTAL_OFF_COLOR;
  //   }

  //   ctx.putImageData(imageData, 0, 0);

  //   dataURL = canvas.toDataURL("image/png");
  //   canvas.width = 0;
  //   canvas.height = 0;
  //   canvas = null;
  //   ctx = null;

  //   // === UNIQUE + SELECTED AREA ===
  //   if (selectedRestrictionIndex >= 0) {
  //     let [canvasForUniques, ctxForUniques] = createCanvas(width, height);
  //     const imageDataForUniques = ctxForUniques.createImageData(width, height);
  //     const pixels = new Uint32Array(imageDataForUniques.data.buffer);

  //     if (renderUnique) {
  //       for (let i = 0; i < uniqueArray.length; i++) {
  //         const valueUnique = uniqueArray[i];
  //         pixels[i] = valueUnique === 1 ? UNIQUE_ON_COLOR : UNIQUE_OFF_COLOR;
  //       }
  //       ctxForUniques.putImageData(imageDataForUniques, 0, 0);

  //       dataURLForUniques = canvasForUniques.toDataURL("image/png");
  //       canvasForUniques.width = 0;
  //       canvasForUniques.height = 0;
  //       canvasForUniques = null;
  //       ctxForUniques = null;
  //     }

  //     let [canvasForSelectedArea, ctxForSelectedArea] = createCanvas(
  //       width,
  //       height
  //     );
  //     const imageDataForSelectedArea = ctxForSelectedArea.createImageData(
  //       width,
  //       height
  //     );
  //     const areaPixels = new Uint32Array(imageDataForSelectedArea.data.buffer);
  //     const currentBitArray = currentBitArrays[selectedRestrictionIndex];

  //     for (let i = 0; i < currentBitArray.length; i++) {
  //       const valueSelectedArea = renderUnique ? currentBitArray[i] : 0;
  //       areaPixels[i] =
  //         valueSelectedArea !== 0 ? AREA_ON_COLOR : AREA_OFF_COLOR;
  //     }
  //     if (renderUnique) {
  //       ctxForSelectedArea.putImageData(imageDataForSelectedArea, 0, 0);

  //       dataURLForSelectedArea = canvasForSelectedArea.toDataURL("image/png");

  //       canvasForSelectedArea.width = 0;
  //       canvasForSelectedArea.height = 0;
  //       canvasForSelectedArea = null;
  //       ctxForSelectedArea = null;
  //     }
  //   } else {
  //     dataURLForUniques = null;
  //     dataURLForSelectedArea = null;
  //   }

  //   done = true;

  //   console.timeEnd("canvas");
  // }

  // === Reusable resources (persistent between calls) ===
  const canvasPool = {
    total: null,
    unique: null,
    selected: null,
  };

  const ctxPool = {
    total: null,
    unique: null,
    selected: null,
  };

  const imageDataPool = {
    total: null,
    unique: null,
    selected: null,
  };

  const pixelBufferPool = {
    total: null,
    unique: null,
    selected: null,
  };

  // === Setup function (run once) ===
  // function setupReusableCanvas(name, width, height) {
  //   if (!canvasPool[name]) {
  //     const canvas = document.createElement("canvas");
  //     canvas.width = width;
  //     canvas.height = height;
  //     const ctx = canvas.getContext("2d");

  //     const imageData = ctx.createImageData(width, height);
  //     const pixels = new Uint32Array(imageData.data.buffer);

  //     canvasPool[name] = canvas;
  //     ctxPool[name] = ctx;
  //     imageDataPool[name] = imageData;
  //     pixelBufferPool[name] = pixels;
  //   }
  // }

  // === Main rendering function ===
  // function makeAndPaintCanvases() {
  //   console.time("canvas");
  //   done = false;

  //   // Ensure all reusable resources are initialized
  //   setupReusableCanvas("total", width, height);
  //   if (selectedRestrictionIndex >= 0) {
  //     setupReusableCanvas("unique", width, height);
  //     setupReusableCanvas("selected", width, height);
  //   }

  //   // === TOTAL LAYER ===
  //   const canvas = canvasPool.total;
  //   const ctx = ctxPool.total;
  //   const imageData = imageDataPool.total;
  //   const totalPixels = pixelBufferPool.total;

  //   for (let i = 0; i < blendedArray.length; i++) {
  //     const value = blendedArray[i];
  //     totalPixels[i] = value !== 0 ? TOTAL_ON_COLOR : TOTAL_OFF_COLOR;
  //   }

  //   ctx.putImageData(imageData, 0, 0);
  //   canvas.toBlob((blob) => {
  //     dataURL = URL.createObjectURL(blob);
  //   });

  //   // === UNIQUE + SELECTED AREA ===
  //   if (selectedRestrictionIndex >= 0) {
  //     if (renderUnique) {
  //       const ctxU = ctxPool.unique;
  //       const imageDataU = imageDataPool.unique;
  //       const pixelsU = pixelBufferPool.unique;

  //       for (let i = 0; i < uniqueArray.length; i++) {
  //         const valueUnique = uniqueArray[i];
  //         pixelsU[i] = valueUnique === 1 ? UNIQUE_ON_COLOR : UNIQUE_OFF_COLOR;
  //       }

  //       ctxU.putImageData(imageDataU, 0, 0);
  //       canvasPool.unique.toBlob((blob) => {
  //         dataURLForUniques = URL.createObjectURL(blob);
  //       });
  //       // dataURLForUniques = canvasPool.unique.toDataURL("image/png");
  //     }

  //     const ctxA = ctxPool.selected;
  //     const imageDataA = imageDataPool.selected;
  //     const areaPixels = pixelBufferPool.selected;
  //     const currentBitArray = currentBitArrays[selectedRestrictionIndex];

  //     for (let i = 0; i < currentBitArray.length; i++) {
  //       const valueSelectedArea = renderUnique ? currentBitArray[i] : 0;
  //       areaPixels[i] =
  //         valueSelectedArea !== 0 ? AREA_ON_COLOR : AREA_OFF_COLOR;
  //     }

  //     if (renderUnique) {
  //       ctxA.putImageData(imageDataA, 0, 0);
  //       canvasPool.selected.toBlob((blob) => {
  //         dataURLForUniques = URL.createObjectURL(blob);
  //       });
  //       // dataURLForSelectedArea = canvasPool.selected.toDataURL("image/png");
  //     }
  //   } else {
  //     dataURLForUniques = null;
  //     dataURLForSelectedArea = null;
  //   }

  //   done = true;
  //   console.timeEnd("canvas");
  // }

  function makeAndPaintCombinedCanvas() {
    console.time("canvas-combined");
    done = false;

    // Reuse or create canvas
    const canvas = canvasPool.combined || document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!canvasPool.combined) canvasPool.combined = canvas;

    // Create ImageData
    const imageData = ctx.createImageData(width, height);
    const pixels = new Uint32Array(imageData.data.buffer);

    // Get reference arrays
    const hasSelection = selectedRestrictionIndex >= 0 && renderUnique;
    const currentBitArray = hasSelection
      ? currentBitArrays[selectedRestrictionIndex]
      : null;

    for (let i = 0; i < blendedArray.length; i++) {
      const blended = blendedArray[i]; // 0 or 1
      const area = hasSelection ? currentBitArray[i] : 0;
      const unique = hasSelection ? uniqueArray[i] : 0;

      let color;

      if (blended === 0) {
        color = OFF_COLOR;
      } else if (area && unique) {
        color = UNIQUE_AREA_COLOR;
      } else if (area) {
        color = BLENDED_AREA_COLOR;
      } else {
        color = BLENDED_COLOR;
      }

      pixels[i] = color;
    }

    // Paint
    ctx.putImageData(imageData, 0, 0);
    dataURL = canvas.toDataURL("image/png");

    // Reset unused
    dataURLForUniques = null;
    dataURLForSelectedArea = null;

    done = true;
    console.timeEnd("canvas-combined");
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
    console.time("findTheOnes");
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

          worker.terminate();
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
      console.timeEnd("findTheOnes");
      return {
        finalArray,
        uniqueArray,
        occurrences,
        done,
      };
    });
  }

  let message = $state("");
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

<!-- <p>[potentially visualisations]</p> -->
<!-- <label for="area"
  >Select an area
  <select name="area" bind:value={selectedArea}>
    {#each LALookup.sort((a, b) => a.LPA23NM.localeCompare(b.LPA23NM)) as LA, i}
      <option value={LA.id}>{LA.LPA23NM}</option>
    {/each}
  </select></label
> -->
<div class="header">
  <div>
    <h1>MHCLG Land Investigator tool</h1>
    <p>
      Bringing together multiple land use, ownership, and infrastructure
      datasets to provide statistical insight on each hectare of land in England
    </p>
  </div>
  <div>
    <div class="header-right">
      <Details
        summaryText={"Use a local file (optional)"}
        detailedText={detailsContent}
      />

      <!-- <p>Get in touch...</p> -->
    </div>
    {#if blending && $blendingProgress < 100}
      <p>Blending... {$blendingProgress.toFixed(1)}%</p>
      <progress max="100" value={$blendingProgress}></progress>
    {:else if $blendingProgress == 100}
      <p>
        The total area in England is 13,046,002 ha.
        <!-- {#if blendedArrayLength > 0}
          {blendedArrayLength.toLocaleString()} ha is covered by the selected categories.
        {/if} -->
      </p>
    {/if}
  </div>
</div>

{#snippet detailsContent()}
  <!-- <br /> -->
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
{/snippet}

<div class="container">
  <div class="output">
    <!-- <div
      style="
    color: white;
    border: 8px solid green;
    border-radius: 16px;
    width: 16px;
    height: 16px;
    background: green;
    font-weight:  700;
    /* dominant-baseline: revert; */
    position: relative;
    top: 30px;
    text-align: center;
"
      
    >
      1
    </div> -->
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
          selected = [];
          formData.forEach((d) => selected.push(d));
          Object.keys(tiffArrayBuffersFromZip).length > 0
            ? unpackZippedLayers()
            : unpackSelectedLayers();
          // selected = formData.getAll("categories[]");
          // Cancel server submission and process client-side
          window.scroll({
            top: 0,
            left: 0,
            behavior: "smooth",
          });
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
        >
        on the map.
        {#if blendedArrayLength > 0}
          That's {blendedArrayLength.toLocaleString()} ha with the current selections,
          or about {((blendedArrayLength / 13046002) * 100).toFixed(0)}% of
          England.
        {/if}
      </p>
      <p>You can change the categories using the options on the left.</p>
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
        <Button
          buttonType="default"
          textContent="Download data (.csv)"
          onClickFunction={function () {
            function jsonToCsv(items) {
              const header = Object.keys(items[0]);
              const headerString = header.join(",");
              // handle null or undefined values here
              const replacer = (key, value) => value ?? "";
              const rowItems = items.map((row) =>
                header
                  .map((fieldName) => JSON.stringify(row[fieldName], replacer))
                  .join(",")
              );
              // join header and body, and break into separate lines
              const csv = [headerString, ...rowItems].join("\r\n");
              return csv;
            }

            // const jsonStr = JSON.stringify(wrapped, null, 2);
            const csvStr = jsonToCsv(tableData);
            const blob = new Blob([csvStr], { type: "text/csv" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "land-data.csv";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          }}
        ></Button>
      {/key}
    {:else}
      <p>Select some categories to view the data.</p>
    {/if}
  </div>
</div>

<!-- <p>{message}</p> -->

<style>
  .header {
    display: grid;
    grid-template-columns: 70% 30%;
    font-family: sans-serif;
    padding: 10px;
  }

  .header-right {
    margin-top: 21.44px;
    display: grid;
    /* grid-template-columns: 50% 50%; */
  }

  /* details {
    margin-top: 16px;
  } */

  .container {
    display: grid;
    grid-template-columns: 23% 40% 37%;
    font-family: sans-serif;
    /* max-height: 85vh; */
    /* overflow: scroll; */
  }
  .output {
    padding: 0px 10px;
    /* max-height: 700px; */
    /* overflow-y: auto; */
    /* overflow-x: scroll; */
    /* width: 100%; */
  }

  :global(.output div.app-c-filter-panel) {
    padding-top: 0px;
  }

  .table {
    padding: 0px 10px;
    /* max-height: 700px; */
  }

  .os-map-container {
    height: calc(100vh - 250px);
  }
  :global(td.govuk-table__cell) {
    padding-right: 20px;
  }
  /* summary {
    cursor: pointer;
  } */

  .totalHighlightText {
    font-weight: 700;
    color: white;
    background-color: dimgray;
    padding: 0 2px 2px;
    border-radius: 2px;
  }

  .uniqueHighlightText {
    font-weight: 700;
    color: white;
    background-color: crimson;
    padding: 0 2px 2px;
    border-radius: 2px;
  }

  .areaHighlightText {
    font-weight: 700;
    color: #0b0c0c;
    background-color: pink;
    padding: 0 2px 2px;
    border-radius: 2px;
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
