<script>
  //trigger deploy

  import init, {
    binary_and_unpack_simd,
    binary_buffer,
    categorical_count_masked,
    unpack_bitmask,
    categorical_matrix,
  } from "$lib/raster_ops/pkg/raster_ops";
  import { onMount, tick } from "svelte";
  import { enhance } from "$app/forms";
  import { fromUrl, fromBlob, fromArrayBuffer } from "geotiff";
  import { writable } from "svelte/store";
  import { MediaQuery } from "svelte/reactivity";
  import { browser } from "$app/environment";
  import {
    CheckBox,
    Select,
    Tooltip,
    ServiceNavigation,
  } from "@communitiesuk/svelte-component-library";
  // import Map from "$lib/map/Map.svelte";

  import FilterPanel from "$lib/FilterPanel.svelte";
  import Button from "$lib/Button.svelte";
  import Details from "$lib/Details.svelte";
  import OsMap from "$lib/map/OSMap.svelte";
  import Spinner from "$lib/Spinner.svelte";
  import proj4 from "proj4";
  import { base } from "$app/paths";
  import Table from "$lib/Table.svelte";
  import { csvParse } from "d3-dsv";
  // import LALookup from "$lib/LALookup.js";
  import JSZip from "jszip";
  import { parseCsv, jsonToCsv } from "$lib/utils";

  const mobile = new MediaQuery("max-width: 600px");
  // let pageLayout = $state("grid-template-columns: 23% 40% 37%");
  let currentMousePosition = $state();
  let hoveredArea = $state();
  let showFilters = $state(true);
  let mapSize = $state();
  // $inspect(mapSize);

  let done = $state(false);
  $inspect({ done });

  let dataURL = $state();

  let containerLayout = $derived(
    mobile.current
      ? ""
      : showFilters
        ? // ? "grid-template-columns: 23% 40% 37%;"
          `grid-template-columns: 23% 77%;`
        : `grid-template-columns: 100%;`
  );
  let pageLayout = $derived(
    mobile.current
      ? ""
      : // showFilters
        //   ? // ? "grid-template-columns: 23% 40% 37%;"
        //     `grid-template-columns: 23% ${0.77 * mapSize}% ${0.77 * (100 - mapSize)}%;`
        dataURL
        ? `grid-template-columns: ${mapSize}% ${100 - mapSize}%;`
        : "grid-template-columns: 50% 50%"
  );

  let ones;

  // $inspect(dataURL);
  // let dataURLForUniques = $state();
  // $inspect(dataURLForUniques);
  // let dataURLForSelectedArea = $state();
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
  // // Define RGBA colors in little-endian format (most systems are little-endian)
  // const UNIQUE_ON_COLOR = 0xff0000ff; // Red with full opacity (R=255, G=0, B=0, A=255)
  // const UNIQUE_OFF_COLOR = 0x000000ff; // Red with 0 alpha (R=255, G=0, B=0, A=0)
  // const AREA_ON_COLOR = 0xff0000ff;
  // const AREA_OFF_COLOR = 0x000000ff;
  // const TOTAL_ON_COLOR = 0xff000000;
  // const TOTAL_OFF_COLOR = 0x00000000;

  const NO_DATA_COLOR = 0x00000000; // Transparent
  const OFF_COLOR = 0x44ff00ff; // Pale pink
  const TOTAL_COLOR = 0x88000000; // Grey
  const SELECTED_AREA_COLOR = 0x990000ff; // Pink
  const UNIQUE_AREA_COLOR = 0xff0000ff; // Red

  let policyLensItems = [
    { value: "England", text: "The whole of England", sentenceText: "England" },
    {
      value: "Greenbelt.tif",
      text: "Only greenbelt land",
      sentenceText: "greenbelt land",
    },
    {
      value: "within_KM_of_BUA.tif",
      text: "Only land within 1km of built up areas",
      sentenceText: "the land within 1km of built up areas",
    },
  ];

  let policyLens = $state("England");

  let policyLensArea = $state();
  $inspect(policyLensArea);
  // let rasterLayers = $state([]);
  // let lookup = [];
  let bitLayers = $state([]);
  // $inspect(bitLayers);
  let currentBitArrays = $state();
  // $inspect({ currentBitArrays });
  // let England = $state();
  // let englandLength = $derived(England?.length);

  let enrichedLayers = $state([]);
  // $inspect(enrichedLayers);
  let policyLensLayer = $state();
  $inspect({ policyLensLayer });
  // let englandArea = $derived(
  //   enrichedLayers?.find((d) => d.filename == "ENGLAND_100M.tif")?.area
  // );
  // $inspect(englandArea);

  let blendedArray = $state([]);

  let breakdownData = $state(null);
  let breakdownLoading = $state(false);
  let breakdownError = $state(null);

  // function generateBreakdown() {
  //   // Don't run until blendedArray exists and has data
  //   if (!blendedArray || blendedArray.length === 0) return;

  //   breakdownLoading = true;
  //   breakdownError = null;

  //   // Run the async breakdown in the background
  //   getLABreakdown(`${base}/data/LAs/la_boundaries100.bin`, blendedArray)
  //     .then((result) => {
  //       breakdownData = result.json;
  //       console.log(blendedArrayLength);
  //       breakdownLoading = false;
  //       // makeAndPaintCombinedCanvas();
  //     })
  //     .catch((err) => {
  //       console.error("Breakdown error:", err);
  //       breakdownError = err.message;
  //       breakdownLoading = false;
  //     });
  // }

  // $inspect(blendedArray);
  let blendedArrayLength = $state(0);
  let selected = $state([]);
  $inspect({ selected });
  // $inspect({ enrichedLayers });

  let tableData = $derived(
    //DERIVED 6
    // if (englandArea && blendedArrayLength) {
    selected?.map((layer, i) => {
      return {
        name: layer.replace(".tif", "").replaceAll("_", " "),
        area: enrichedLayers?.find((d) => d.filename == layer)?.area
          ? enrichedLayers?.find((d) => d.filename == layer)?.area
          : "-",
        unique: occurrences && occurrences[i] ? occurrences[i] : "",
        subLayers: selectedSubLayers[layer],
      };
    })
  );
  // $inspect({ tableData });
  let tableMetadata = {
    name: {
      explainer: "Sort by restriction name",
      label: "Name",
      shortLabel: "Name",
    },
    area: {
      explainer:
        "Sort by the total area in England covered by this restriction",
      label: "Area (ha)",
      shortLabel: "Area (ha)",
    },
    unique: {
      explainer:
        "Sort by hectares where this is the only barrier to development",
      label: "Exclusive to this category (ha)",
      shortLabel: "Exclusive to this category (ha)",
    },
    subLayers: {
      explainer: "",
      label: "",
      shortLabel: "",
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
        sections: [
          ...new Set(
            thisSectionData
              ?.filter((d) => d.Level !== "1")
              ?.map((d) => d.Category)
          ),
        ]?.map((category, j) => {
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
                  parentCheckBoxName: section.replaceAll(" ", "_") + ".tif",
                  section: category,
                };
              }),
          };
        }),
        allOption: thisSectionData?.map((d) => d.Level)?.includes("1"),
        allChecked:
          thisSectionData?.find((d) => d.Level == 1)?.initially_checked === "y"
            ? true
            : false,

        // selectedValues: startingPosition, //If we want all selected initially
      };
    })
  );
  $inspect({ filterSections });

  let selectedSubLayers = $derived(
    selected?.reduce((acc, sel) => {
      const key = sel;
      const value = startingPosition
        .filter(
          (d) =>
            (d.Tier == sel.replaceAll("_", " ").replace(".tif", "") ||
              d.Category == sel.replaceAll("_", " ").replace(".tif", "")) &&
            d.Data_layer !== "All data layers"
        )
        .map((d) => d.Data_layer);

      acc[key] = value;
      return acc;
    }, {})
  );

  // $inspect(selectedSubLayers, startingPosition);

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
    dataURL = null;
    selected = null;

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

        startingPosition = parseCsv(csvText);
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
    // csvFile?.length > 0 ? csvFile[0] : `${base}/ultimate_land_metadata.csv`
    csvFile?.length > 0
      ? csvFile[0]
      : `${base}/data/PUBLIC_LAYERS/ultimate_land_metadata.csv`
  );

  // function parseCsv(csvText) {
  //   const lines = csvText.trim().split("\n");
  //   const headers = lines[0].trim().split(",");

  //   return lines.slice(1).map((line) => {
  //     // console.log(line);
  //     const values = line.split(",");
  //     const row = {};
  //     headers.forEach((h, i) => (row[h] = values[i].replace("\r", "")));
  //     // console.log(row);
  //     return row;
  //   });
  // }

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
    await init({
      module_or_path: new URL(
        "$lib/raster_ops/pkg/raster_ops_bg.wasm",
        import.meta.url
      ),
    });
    console.log("✅ WASM initialized");

    try {
      const response = await fetch(csvLocation);
      if (!response.ok) throw new Error("Failed to fetch CSV");
      metadataCsv = await response.text();
      // console.log(metadataCsv);

      startingPosition = parseCsv(metadataCsv);
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

    layersToUnpack = selected.map((d) =>
      parseCsv(metadataCsv).find((layer) => layer.filename === d)
    );
  }

  function unpackSelectedLayers() {
    dataURL = null;
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

      // console.log("Processed data:", e.data);
      bitLayers = e.data.rasterLayers.map((layer) => layer.data);
      enrichedLayers = e.data.rasterLayers;
      height = e.data.height;
      width = e.data.width;
      bbox = e.data.bbox;
      policyLensArea = e.data.policyLensArea;
      policyLensLayer = e.data.policyLensLayer;
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
      policyLens,
    });
  }

  function unpackZippedLayers() {
    prepareToUnpack();

    dataURL = null;

    const simpleZipWorker = new Worker(
      new URL("$lib/workers/simpleZipUnpackWorker.js", import.meta.url),
      { type: "module" }
    );

    simpleZipWorker.onmessage = (e) => {
      if (e.data.error) {
        message = `Worker error: ${e.data.error}`;
        return;
      }

      // console.log("Processed data:", e.data);
      bitLayers = e.data.rasterLayers.map((layer) => layer.data);
      enrichedLayers = e.data.rasterLayers;
      height = e.data.height;
      width = e.data.width;
      bbox = e.data.bbox;
      policyLensArea = e.data.policyLensArea;
      policyLensLayer = e.data.policyLensLayer;
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

    let policyLensLayerToUnpack = parseCsv(metadataCsv).find(
      (layer) => layer.filename === policyLens
    );

    let clonedPolicyLensLayerToUnpack;

    if (policyLensLayerToUnpack) {
      policyLensLayerToUnpack.arrayBuffer = tiffArrayBuffersFromZip[policyLens];
      clonedPolicyLensLayerToUnpack = structuredClone(policyLensLayerToUnpack);
      // console.log(policyLensLayerToUnpack, clonedPolicyLensLayerToUnpack);
    }

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
      {
        layersToUnpack: clonedLayersToUnpack,
        policyLensLayerToUnpack: clonedPolicyLensLayerToUnpack ?? "England",
      },
      transferables,
      clonedPolicyLensLayerToUnpack?.arrayBuffer ?? ""
    );
  }

  async function getLABreakdown(cRoutes, bitArray) {
    const urls = Array.isArray(cRoutes) ? cRoutes : [cRoutes];
    const width = 5728;

    let accumulatedResult = null;
    let rowOffset = 0;

    // Single persistent worker
    const breakdownWorker = new Worker(
      new URL("$lib/workers/breakdownWorker.js", import.meta.url),
      { type: "module" }
    );

    const processChunk = (cChunk, aChunk) =>
      new Promise((resolve, reject) => {
        breakdownWorker.onmessage = (e) => {
          const { json, error } = e.data;
          if (error) reject(new Error(error));
          else if (json) resolve(json);
          else console.log("Worker sent ignored message:", e.data);
        };
        breakdownWorker.onerror = (err) => reject(err);
        // main thread
        const csvUrl = `${base}/data/LAs/lad_may_2025_lookup.csv`;

        breakdownWorker.postMessage({
          categoricalArray: cChunk,
          bitArray: aChunk,
          csvUrl, // ✅ pass explicitly
        });
      });

    for (const url of urls) {
      console.log("Fetching chunk:", url);
      const catBuffer = await fetch(url).then((r) => r.arrayBuffer());
      const evenLength = catBuffer.byteLength & ~1; // drop 1 byte if odd
      const safeBuffer = catBuffer.slice(0, evenLength);
      const cChunk = new Uint16Array(safeBuffer);

      const chunkRows = cChunk.length / width;
      const bitStart = rowOffset * width;
      const bitEnd = bitStart + chunkRows * width;
      const aChunk = bitArray.subarray(bitStart, bitEnd);

      console.log("Sending chunk to worker:", cChunk.length, aChunk.length);

      const minLength = Math.min(cChunk.length, aChunk.length);
      const cChunkTrimmed = cChunk.subarray(0, minLength);
      const aChunkTrimmed = aChunk.subarray(0, minLength);

      const chunkResult = await processChunk(cChunkTrimmed, aChunkTrimmed);

      // Accumulate results
      if (!accumulatedResult) {
        accumulatedResult = chunkResult;
      } else {
        for (let i = 0; i < accumulatedResult.length; i++) {
          accumulatedResult[i].selected_area += chunkResult[i].selected_area;
          accumulatedResult[i].total_area += chunkResult[i].total_area;
          accumulatedResult[i].selected_area_as_a_proportion_of_total_area +=
            chunkResult[i].selected_area_as_a_proportion_of_total_area;
        }
      }

      rowOffset += chunkRows;
    }

    breakdownWorker.terminate();
    console.log("All chunks processed, worker terminated");

    return { json: accumulatedResult, bitArray };
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
    // console.log({ active });
    // Post to the worker (transferring buffers)
    blendWorker.postMessage(
      {
        bitArrays: buffers, // send raw ArrayBuffers
      },
      buffers // transfer buffers (zero-copy)
    );
    // console.log({ duplicateBitLayers });
    // Listen for messages
    blendWorker.onmessage = (e) => {
      if (e.data.progress !== undefined) {
        blending = true;
        blendingProgress.set(e.data.progress);
      } else if (e.data.type === "done") {
        blendedArrayLength = e.data.activeCount;
        blendedArray = new Uint8Array(e.data.result); // re-wrap transferred buffer

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
          mobile.current
            ? makeAndPaintCombinedCanvasMobile()
            : makeAndPaintCombinedCanvas();
        });
        // .then();
      } else if (e.data.error) {
        console.error("Blend worker error:", e.data.error);
      }
    };
  }

  function makeAndPaintCombinedCanvas() {
    console.time("canvas-combined");
    done = false;

    // Reuse or create canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Create ImageData
    const imageData = ctx.createImageData(width, height);
    const pixels = new Uint32Array(imageData.data.buffer);

    // Get reference arrays
    const hasSelection = selectedRestrictionIndex >= 0 && renderUnique;
    const currentBitArray = hasSelection
      ? currentBitArrays[selectedRestrictionIndex]
      : null;

    for (let i = 0; i < blendedArray.length; i++) {
      const lensValue = policyLensLayer ? policyLensLayer[i] : 0;
      const blended = blendedArray[i]; // 0 or 1
      const area = hasSelection ? currentBitArray[i] : 0;
      const unique = hasSelection ? (uniqueArray[i] === 1 ? 1 : 0) : 0;

      let color;

      if (blended === 0 && lensValue === 0) {
        color = NO_DATA_COLOR;
      } else if (blended === 0 && lensValue === 1) {
        color = OFF_COLOR;
      } else if (area && unique) {
        color = UNIQUE_AREA_COLOR;
      } else if (area) {
        color = SELECTED_AREA_COLOR;
      } else {
        color = TOTAL_COLOR;
      }

      pixels[i] = color;
    }

    // Paint
    ctx.putImageData(imageData, 0, 0);
    // dataURL = canvas.toDataURL("image/png");

    //Note: no longer a dataURL with this method - worth changing the names of things if we keep this solution
    canvas.toBlob((blob) => {
      dataURL = URL.createObjectURL(blob);
    });

    done = true;
    console.timeEnd("canvas-combined");
  }

  //iOS-safe version of the canvas but has some issues at the edges that need to worked out...

  async function makeAndPaintCombinedCanvasMobile() {
    console.time("canvas-combined");
    done = false;

    // --- CONFIG ---
    const MAX_TILE_PIXELS = 10_000_000; // ~3160×3160 per tile
    const MAX_FINAL_PIXELS = 16_000_000; // Safari hard limit
    // ---------------

    // Precompute tile grid
    const tileSize = Math.floor(Math.sqrt(MAX_TILE_PIXELS));
    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);

    // Determine if we must scale the final output
    let scale = 1;
    const totalPixels = width * height;
    if (totalPixels > MAX_FINAL_PIXELS) {
      scale = Math.sqrt(MAX_FINAL_PIXELS / totalPixels);
    }

    // --- Prepare per-tile rendering ---
    const tileBlobs = [];
    const hasSelection = selectedRestrictionIndex >= 0 && renderUnique;
    const currentBitArray = hasSelection
      ? currentBitArrays[selectedRestrictionIndex]
      : null;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x0 = col * tileSize;
        const y0 = row * tileSize;
        const w = Math.min(tileSize, width - x0);
        const h = Math.min(tileSize, height - y0);

        // ---- Render one tile ----
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        const imageData = ctx.createImageData(w, h);
        const pixels = new Uint32Array(imageData.data.buffer);

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y0 + y) * width + (x0 + x);
            const lensValue = policyLensLayer ? policyLensLayer[i] : 0;
            const blended = blendedArray[i];
            const area = hasSelection ? currentBitArray[i] : 0;
            const unique = hasSelection ? (uniqueArray[i] === 1 ? 1 : 0) : 0;

            let color;
            if (blended === 0 && lensValue === 0) color = NO_DATA_COLOR;
            else if (blended === 0 && lensValue === 1) color = OFF_COLOR;
            else if (area && unique) color = UNIQUE_AREA_COLOR;
            else if (area) color = SELECTED_AREA_COLOR;
            else color = TOTAL_COLOR;

            pixels[y * w + x] = color;
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // Export the tile to a blob (sequentially to save memory)
        const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
        tileBlobs.push({ row, col, blob, w, h });
      }
    }

    // --- Merge all tiles into one final canvas ---
    const finalW = Math.floor(width * scale);
    const finalH = Math.floor(height * scale);
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = finalW;
    finalCanvas.height = finalH;
    const finalCtx = finalCanvas.getContext("2d");

    finalCtx.imageSmoothingEnabled = scale !== 1;
    finalCtx.imageSmoothingQuality = "high";

    const drawTilePromises = tileBlobs.map(async ({ row, col, blob, w, h }) => {
      const img = await createImageBitmap(blob);

      // Use exact float positions—no Math.floor
      const x = col * tileSize * scale;
      const y = row * tileSize * scale;
      const drawW = w * scale;
      const drawH = h * scale;

      finalCtx.drawImage(img, x, y, drawW, drawH);
    });
    await Promise.all(drawTilePromises);

    // Export final PNG blob
    const finalBlob = await new Promise((r) =>
      finalCanvas.toBlob(r, "image/png")
    );
    dataURL = URL.createObjectURL(finalBlob);
    // console.log(dataURL);
    done = true;
    console.timeEnd("canvas-combined");

    return { dataURL, scale };
  }
  // $inspect({ dataURL });

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
<div class="header-section">
  <div>
    <!-- <h1>MHCLG Land Stats tool</h1> -->

    <div class="header-left">
      <div class="firstSelections">
        <Select
          id="policyLensInput"
          name="policyLensInput"
          items={policyLensItems}
          bind:value={policyLens}
          label={"Select area to explore"}
          onchange={() =>
            Object.keys(tiffArrayBuffersFromZip).length > 0
              ? unpackZippedLayers()
              : unpackSelectedLayers()}
        />
        <Details
          summaryText={"Use a local file (optional)"}
          detailedText={detailsContent}
        />
      </div>
      <div class="summaryStats">
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
        {#if policyLensArea && policyLens !== "England"}
          <p>
            The total area in England within {policyLensItems.find(
              (d) => d.value == policyLens
            ).sentenceText} is {policyLensArea.toLocaleString()}
            ha.
          </p>
          <div class="stacked-bar">
            <div
              class="stacked-bar-inner"
              style="width: {(policyLensArea / 13046002) * 100}%"
            ></div>
          </div>
        {/if}
      </div>
    </div>

    <div>
      <Button
        buttonType="secondary"
        textContent={(showFilters ? "Hide" : "Show") + " filters"}
        onClickFunction={() => {
          showFilters = !showFilters;
          // pageLayout = "grid-template-columns: 0% 50% 50%";
        }}
      />
    </div>
  </div>

  <div>
    <div class="header-right">
      <!-- <a href="./" target="_blank">Send feedback (opens in a new tab)</a> -->
    </div>
  </div>
</div>

{#snippet detailsContent()}
  <label for="zip-file-upload">Use a local zip file:</label>
  <input
    bind:files={zipFile}
    accept=".zip"
    id="file-upload"
    type="file"
    onchange={handleFileUpload}
  />
{/snippet}

<div class="container" style={containerLayout}>
  <div class="output" style={showFilters ? "" : "display: none"}>
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
      <form
        method="POST"
        use:enhance={({ formData, cancel }) => {
          selected = [];
          formData.forEach((d) => selected.push(d));
          Object.keys(tiffArrayBuffersFromZip).length > 0
            ? unpackZippedLayers()
            : unpackSelectedLayers();
          // selected = formData.getAll("categories[]");

          document.getElementById("map").scrollIntoView({
            behavior: "smooth",
          });

          // Cancel server submission and process client-side
          cancel();

          // No server action needed
        }}
      >
        {#key filterSections}
          <FilterPanel
            sectionsData={filterSections}
            resultsCount={""}
            filterButtonText="Show filters"
            applyButtonText="Apply filters"
            ga4BaseEvent={{ event_name: "filter_items", type: "basic" }}
          ></FilterPanel>
        {/key}
      </form>
      <Button
        buttonType="link"
        textContent="Clear all filters"
        onClickFunction={() => {
          selected = [];
          dataURL = null;
          startingPosition.forEach((d) => (d.initially_checked = false));
          bbox = null;
          console.log(startingPosition, selected);
        }}
      />
    {/if}
  </div>

  <div class="map-and-table" style={pageLayout}>
    <div class="slider">
      {#if !mobile.current && dataURL}
        <input
          type="range"
          min="0"
          max="100"
          id="size-slider"
          name="size-slider"
          bind:value={mapSize}
          title="Resize the map and table"
        />
      {/if}
    </div>

    <div class="map">
      {#if dataURL && bbox.length > 0}
        <!-- {console.log("Rendering the map!")} -->

        <div id="map" class={["os-map-container", { done }]}>
          <OsMap {dataURL} {bbox} />
        </div>
      {:else if bbox}
        <div id="map" style="height: calc(100vh - 150px);">
          <Spinner />
        </div>
      {:else}
        <div>Select some categories</div>
      {/if}
    </div>
    <div class="table">
      {#if done && dataURL}
        {#if policyLens !== "England"}
          <h2>
            Within <span class="lens-area"
              >{policyLensItems.find((d) => d.value == policyLens)
                .sentenceText}</span
            >
          </h2>
        {/if}
        {#if tableData?.length > 0}
          <p>
            The total area covered by the selected categories is shown in <span
              class="totalHighlightText">grey</span
            >
            on the map.
          </p>
          {#if blendedArrayLength > 0}
            <!-- That's {blendedArrayLength.toLocaleString()} ha with the current selections,
          or about {((blendedArrayLength / 13046002) * 100).toFixed(0)}% of
          England, which means that {(
            13046002 - blendedArrayLength
          ).toLocaleString()} ha ({(
            ((13046002 - blendedArrayLength) / 13046002) *
            100
          ).toFixed(0)}%) of England is not in the area covered by the current
          selections. -->
            <p>
              That's {blendedArrayLength.toLocaleString()} hectares with the current
              selections, or about
              <b>{((blendedArrayLength / policyLensArea) * 100).toFixed(0)}%</b>
              of
              {policyLensItems.find((d) => d.value == policyLens).sentenceText},
              which means that {(
                policyLensArea - blendedArrayLength
              ).toLocaleString()} hectares ({(
                ((policyLensArea - blendedArrayLength) / policyLensArea) *
                100
              ).toFixed(0)}%) of {policyLensItems.find(
                (d) => d.value == policyLens
              ).sentenceText} is not in the area covered by the current selections.
            </p>
            <!-- Un-snippet this if we want it back -->
            {#snippet stackedBar()}
              {#if tableData}
                <div style="display: flex; height: 2rem">
                  {#each Object.entries(tableData).sort((a, b) => b[1].unique - a[1].unique) as data, i}
                    {console.log(
                      100 - ((data[1].unique / policyLensArea) * 100).toFixed(0)
                    )}
                    <div
                      style={"width: " +
                        (data[1].unique / policyLensArea) * 100 +
                        "%; border: 1px solid black; background-color: " +
                        (selectedRestriction == data[1]?.name
                          ? "red"
                          : // : [
                            //     "#0000ff99",
                            //     "#0000ff77",
                            //     "#0000ff55",
                            //     "#0000ff33",
                            //     "#0000ff22",
                            //   ][i]
                            "#888888" +
                            (100 -
                              ((data[1].unique / policyLensArea) * 100).toFixed(
                                0
                              )))}
                      onmousemove={(e) => {
                        currentMousePosition = { x: e.x, y: e.y };
                        hoveredArea = data[1]?.name;
                        console.log(e);
                      }}
                      onmouseout={() => {
                        currentMousePosition = null;
                        hoveredArea = null;
                      }}
                    >
                      {#if currentMousePosition}
                        <Tooltip
                          {currentMousePosition}
                          {hoveredArea}
                          hoveredAreaData={""}
                          metric={""}
                        />
                      {/if}
                      <!-- <p>Just {data[1]?.name}</p> -->
                    </div>
                  {/each}
                  <div
                    style={"width: " +
                      ((blendedArrayLength -
                        tableData
                          .map((d) => d?.unique)
                          .reduce((acc, curr) => acc + curr, 0)) /
                        policyLensArea) *
                        100 +
                      "%; border: 1px solid black; background-color: grey"}
                  >
                    {console.log(
                      blendedArrayLength -
                        tableData
                          .map((d) => d?.unique)
                          .reduce((acc, curr) => acc + curr, 0)
                    )}
                    <p>Multiple categories</p>
                  </div>
                  <div
                    style={"width: " +
                      ((policyLensArea - blendedArrayLength) / policyLensArea) *
                        100 +
                      "%; border: 1px solid black; background-color: #ff00ff44"}
                  >
                    <p>
                      {policyLensItems.find((d) => d.value == policyLens)
                        .sentenceText}, but not covered by the selected
                      categories
                    </p>
                  </div>
                </div>
              {/if}
            {/snippet}
          {/if}

          <p>
            You can change the categories using the options {mobile.current
              ? "above."
              : "on the left."}
          </p>
          <p>
            Select a row in the table below to see areas that are covered by
            this category and no others, highlighted in <span
              class="uniqueHighlightText">red</span
            >
            on the map, with the total area in this category shown in
            <span class="areaHighlightText">pink</span>.
          </p>
          {#key tableData}
            {#if tableData && tableMetadata}
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
                  // function jsonToCsv(items) {
                  //   const footer =
                  //     "\r\n Notes: \r\n 1. All figures are in hectares. \r\n 2. This is an experimental product under development.";
                  //   const caveat =
                  //     "Figures relate to the area within " +
                  //     policyLensItems.find((d) => d.value == policyLens)
                  //       .sentenceText;
                  //   const header = Object.keys(items[0]);
                  //   const headerString = header.join(",");
                  //   // handle null or undefined values here
                  //   const replacer = (key, value) => value ?? "";
                  //   const rowItems = items.map((row) =>
                  //     header
                  //       .map((fieldName) =>
                  //         JSON.stringify(row[fieldName], replacer)
                  //       )
                  //       .join(",")
                  //   );
                  //   // join header and body, and break into separate lines
                  //   const csv = [
                  //     headerString,
                  //     ...rowItems,
                  //     footer,
                  //     caveat,
                  //   ].join("\r\n");
                  //   return csv;
                  // }

                  // const jsonStr = JSON.stringify(wrapped, null, 2);
                  const csvStr = jsonToCsv(
                    tableData,
                    policyLens,
                    policyLensItems,
                    selected
                  );
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
              <Button
                buttonType="default"
                textContent="Download Local Authority breakdown of data (.csv)"
                onClickFunction={function () {
                  // function jsonToCsv(items) {
                  //   const footer =
                  //     "\r\n Notes: \r\n 1. All figures are in hectares. \r\n 2. This is an experimental product under development.";
                  //   const caveat =
                  //     "Figures relate to the area within " +
                  //     policyLensItems.find((d) => d.value == policyLens)
                  //       .sentenceText;
                  //   const header = Object.keys(items[0]);
                  //   const headerString = header.join(",");
                  //   // handle null or undefined values here
                  //   const replacer = (key, value) => value ?? "";
                  //   const rowItems = items.map((row) =>
                  //     header
                  //       .map((fieldName) =>
                  //         JSON.stringify(row[fieldName], replacer)
                  //       )
                  //       .join(",")
                  //   );
                  //   // join header and body, and break into separate lines
                  //   const csv = [
                  //     headerString,
                  //     ...rowItems,
                  //     footer,
                  //     caveat,
                  //   ].join("\r\n");
                  //   return csv;
                  // }

                  if (!blendedArray || blendedArray.length === 0) return;

                  breakdownLoading = true;
                  breakdownError = null;

                  const baseUrl = `${base}/data/LAs/chunks/`;
                  const numChunks = 8; // update with actual number of chunks

                  const chunkUrls = Array.from(
                    { length: numChunks },
                    (_, i) => `${baseUrl}chunk_${i}.bin`
                  );

                  // Run the async breakdown in the background
                  getLABreakdown(chunkUrls, blendedArray)
                    .then((result) => {
                      breakdownData = result.json;
                      console.log(blendedArrayLength);
                      breakdownLoading = false;

                      // const jsonStr = JSON.stringify(wrapped, null, 2);
                      const csvStr = jsonToCsv(
                        breakdownData,
                        policyLens,
                        policyLensItems,
                        selected
                      );
                      const blob = new Blob([csvStr], { type: "text/csv" });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.download = "land-data-by-la.csv";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(link.href);
                    })
                    .catch((err) => {
                      console.error("Breakdown error:", err);
                      breakdownError = err.message;
                      breakdownLoading = false;
                    });
                }}
              ></Button>
            {/if}
          {/key}
        {:else}
          <p>Select some categories to view the data.</p>
        {/if}
      {:else if bbox}
        <Spinner />
      {:else}
        <p></p>
      {/if}
    </div>
  </div>
</div>

<!-- <p>{message}</p> -->

<style>
  div.header-left {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }

  div.firstSelections {
    background-color: #f3f2f1;
    /* max-width: 50%; */
    padding: 22px 26px;
    /* margin: 25px; */
  }

  div.summaryStats {
    margin: 25px;
    /* max-width: 50%; */
  }

  :global(div.header-section div.p-4) {
    max-height: 2rem;
    padding-top: 30px;
  }

  :global(div.app-c-filter-panel__actions div.p-4) {
    max-height: 2.5rem;
  }

  .header-section {
    display: grid;
    grid-template-columns: 67% 33%;
    font-family: sans-serif;
    padding: 10px;
    min-height: 200px;
  }

  @media (max-width: 600px) {
    .header-section {
      display: flex;
      flex-direction: column;
      font-family: sans-serif;
      padding: 10px;
      min-height: 200px;
    }
  }

  .header-right {
    margin-top: 21.44px;
    display: grid;
    /* grid-template-columns: 50% 50%; */
  }

  .container {
    display: grid;
    /* grid-template-columns: 23% 40% 37%; */
    font-family: sans-serif;
    /* max-height: 85vh; */
    /* overflow: scroll; */
    transition: all 500ms;
  }

  .map-and-table {
    display: grid;
    grid-template-rows: minmax(0, 0px) 1fr;
  }

  @media (max-width: 600px) {
    .container {
      display: flex;
      flex-direction: column;
      font-family: sans-serif;
    }

    .map-and-table {
      display: flex;
      flex-direction: column;
    }
  }

  .output {
    padding: 0px 10px;
    /* max-height: 700px; */
    /* overflow-y: auto; */
    /* overflow-x: scroll; */
    /* width: 100%; */
    transition: all 500ms;
  }

  .slider {
    /* display: grid; */
    /* grid-template-rows: minmax(0, 20px); */
    /* max-height: 20px; */
    grid-column: 1 / span 2;
    grid-row: 1;
  }

  .slider input {
    -webkit-appearance: none;
    appearance: none;
    width: calc(100% + 1rem);
    /* margin-left: 10px; */
    /* position: relative; */
    margin-left: -0.25rem;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    position: relative;
    top: 300px;
    margin-top: -12px; /* Centers the thumb */
    margin-left: -4px;
    background-color: #d9d9d9;
    background-image: url("/Vector.svg");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 50%;
    height: 80px;
    width: 20px;
    border-radius: 0.25rem;
    z-index: 1;
    /* cursor: pointer; */
  }

  input[type="range"]::-moz-range-thumb {
    background-color: #d9d9d9;
    background-image: url("/Vector.svg");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 50%;
    height: 80px;
    width: 20px;
    border-radius: 0.25rem;
    /* cursor: pointer; */
    /* position: relative; */
    /* top: 300px; */
    /* margin-top: -12px; */
    /* margin-left: -40px; */
    transform: translateY(300px) translateX(-0.45rem);
    z-index: 1;
  }

  .slider input {
    cursor: grab;
  }

  .slider input:active {
    cursor: grabbing;
  }

  .slider input::-moz-range-track {
    background: transparent;
    border-color: transparent;
    color: transparent;
  }

  .slider input::-webkit-slider-runnable-track {
    background: transparent;
    border-color: transparent;
    color: transparent;
  }

  .map {
    grid-column: 1;
    grid-row: 2;
    /* min-height: 700px; */
  }

  :global(.output div.app-c-filter-panel) {
    padding-top: 0px;
  }

  .table {
    padding: 0px 30px;
    /* max-height: 700px; */
    grid-column: 2;
    grid-row: 2;
  }

  .os-map-container {
    height: calc(100vh - 150px);
  }
  :global(td.govuk-table__cell) {
    padding-right: 20px;
  }
  /* summary {
    cursor: pointer;
  } */

  .lens-area {
    background-color: #ff00ff44;
    padding: 0 2px 2px;
    border-radius: 2px;
  }

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

  .stacked-bar {
    width: 100px;
    height: 1rem;
    background-color: #99988f74;
    border: 1px solid black;
    /* border-radius: 0.5rem; */
  }

  .stacked-bar-inner {
    /* width: 50px; */
    height: 1rem;
    background-color: #00625e;
  }
</style>
