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
    // Tabs,
  } from "@communitiesuk/svelte-component-library";
  // import Map from "$lib/map/Map.svelte";

  import FilterPanel from "$lib/FilterPanel.svelte";
  import Button from "$lib/Button.svelte";
  import Details from "$lib/Details.svelte";
  import OsMap from "$lib/map/OSMap.svelte";
  import Spinner from "$lib/Spinner.svelte";
  // import proj4 from "proj4";
  import { base } from "$app/paths";
  import Table from "$lib/Table.svelte";
  // import { csvParse } from "d3-dsv";
  // import LALookup from "$lib/LALookup.js";
  import JSZip from "jszip";
  import {
    parseCsv,
    jsonToCsv,
    makeFileNameReadable,
    loadDensityTiff,
    computeStats,
    countOccurrences,
  } from "$lib/utils";
  import { colors, width, height, bbox } from "$lib/constants";
  import FilterChipParent from "$lib/components/FilterChipParent.svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import Histogram from "$lib/components/Histogram.svelte";

  const mobile = new MediaQuery("max-width: 600px");
  // let pageLayout = $state("grid-template-columns: 23% 40% 37%");
  let currentMousePosition = $state();
  let hoveredArea = $state();
  let showFilters = $state(true);
  let mapSize = $state();
  // $inspect(mapSize);

  $effect(() => {
    document.documentElement.style.setProperty("--mapWidth", `${mapSize}%`);
    document.documentElement.style.setProperty(
      "--tw-translate-x",
      `${showFilters ? 0 : -100}%`,
    );
  });

  let done = $state(false);
  $inspect({ done });

  let dataURL = $state();

  let containerLayout = $derived(
    mobile.current
      ? ""
      : // : showFilters
        //   ? // ? "grid-template-columns: 23% 40% 37%;"
        //     `grid-template-columns: 23% 77%;`
        `grid-template-columns: 100%;`,
  );
  let pageLayout = $derived(
    mobile.current
      ? ""
      : // showFilters
        //   ? // ? "grid-template-columns: 23% 40% 37%;"
        //     `grid-template-columns: 23% ${0.77 * mapSize}% ${0.77 * (100 - mapSize)}%;`
        dataURL
        ? `grid-template-columns: ${mapSize}% ${100 - mapSize}%;`
        : "grid-template-columns: 50% 50%",
  );

  let densityArray = $state();
  let seeDensity = $state(false);
  $inspect(seeDensity);
  let seeArea = $state(true);
  $inspect(seeArea);
  let densityGroup = $state();

  let customArea = $state();
  let drawing = $state(false);

  let ones;

  let occurrences = $state();
  $inspect(occurrences);
  let finalArray = $state();
  // let width = $state(0),
  //   height = $state(0);
  // let bbox = $state([]);
  $inspect({ width, height, bbox });

  const NO_DATA_COLOR = 0x00000000; // Transparent
  const LENS_HIGHLIGHT_COLOR = 0x44ff00ff; // Pale pink
  const TOTAL_COLOR = 0x88000000; // Grey
  const SELECTED_AREA_COLOR = 0x990000ff; // Pink
  const UNIQUE_AREA_COLOR = 0xff0000ff; // Red

  // Build once (module-level or cached)
  const COLOR_LUT = new Uint32Array(16);

  // Default everything to TOTAL_COLOR (safe fallback)
  COLOR_LUT.fill(TOTAL_COLOR);

  // Explicit mappings (mirrors your original logic)
  COLOR_LUT[0b0000] = NO_DATA_COLOR; // blended=0, lens=0
  COLOR_LUT[0b0100] = LENS_HIGHLIGHT_COLOR; // blended=0, lens=1

  // blended = 1 cases
  COLOR_LUT[0b1000] = TOTAL_COLOR; // blended only
  COLOR_LUT[0b1010] = SELECTED_AREA_COLOR; // blended + area
  COLOR_LUT[0b1011] = UNIQUE_AREA_COLOR; // blended + area + unique

  // Lens + blended
  COLOR_LUT[0b1100] = TOTAL_COLOR;

  // Lens + blended + area
  COLOR_LUT[0b1110] = SELECTED_AREA_COLOR;
  COLOR_LUT[0b1111] = UNIQUE_AREA_COLOR;

  let policyLensItems = [
    {
      value: "England",
      text: "The whole of England",
      sentenceText: "England",
    },
    {
      value: "Physically_restricted.bin",
      text: "Only physically restricted land",
      sentenceText: "physically restricted land",
    },
    {
      value: "Bodies_of_water.bin",
      text: "Only bodies of water",
      sentenceText: "bodies of water",
    },
    {
      value: "Built_infrastructure_constraints.bin",
      text: "Only built infrastructure constraints",
      sentenceText: "land with built infrastructure constraints",
    },
    {
      value: "Built_up_areas.bin",
      text: "Only built up areas",
      sentenceText: "built up areas",
    },
    {
      value: "National_Grid_infrastructure.bin",
      text: "Only national Grid infrastructure",
      sentenceText: "national Grid infrastructure",
    },
    {
      value: "Current_rail_network.bin",
      text: "Only current rail network",
      sentenceText: "current rail network",
    },
    {
      value: "Current_major_roads.bin",
      text: "Only current major roads",
      sentenceText: "current major roads",
    },
    {
      value: "Development_restricted.bin",
      text: "Only development restricted land",
      sentenceText: "land where development is restricted",
    },
    {
      value: "Wildlife_sites_of_national_and_international_importance_.bin",
      text: "Only wildlife sites of national and international importance",
      sentenceText: "wildlife sites of national and international importance",
    },
    {
      value: "Ramsar.bin",
      text: "Only Ramsar",
      sentenceText: "Ramsar sites",
    },
    {
      value: "Special_areas_of_conservation.bin",
      text: "Only special areas of conservation",
      sentenceText: "special areas of conservation",
    },
    {
      value: "Special_protection_areas.bin",
      text: "Only special protection areas",
      sentenceText: "special protection areas",
    },
    {
      value: "Sites_of_Special_Scientific_Interest.bin",
      text: "Only Sites of Special Scientific Interest",
      sentenceText: "Sites of Special Scientific Interest",
    },
    {
      value: "Heritage_constraint.bin",
      text: "Only heritage constraint",
      sentenceText: "land with heritage constraints",
    },
    {
      value: "Registered_parks_and_gardens.bin",
      text: "Only registered parks and gardens",
      sentenceText: "registered parks and gardens",
    },
    {
      value: "Registered_battlefields.bin",
      text: "Only registered battlefields",
      sentenceText: "registered battlefields",
    },
    {
      value: "Scheduled_monuments.bin",
      text: "Only scheduled monuments",
      sentenceText: "scheduled monuments",
    },
    {
      value: "World_Heritage_Sites.bin",
      text: "Only World Heritage Sites",
      sentenceText: "World Heritage Sites",
    },
    {
      value: "World_Heritage_Buffer_Zones.bin",
      text: "Only World Heritage Buffer Zones",
      sentenceText: "World Heritage Buffer Zones",
    },
    {
      value: "Greenbelt.bin",
      text: "Only greenbelt",
      sentenceText: "greenbelt land",
    },
    {
      value: "Development_limited.bin",
      text: "Only development limited land",
      sentenceText: "land where development is limited",
    },
    {
      value: "Protected_landscapes.bin",
      text: "Only protected landscapes",
      sentenceText: "protected landscapes",
    },
    {
      value: "national_parks.bin",
      text: "Only national parks",
      sentenceText: "national parks",
    },
    {
      value: "Wildlife_sites_.bin",
      text: "Only wildlife sites",
      sentenceText: "wildlife sites",
    },
    {
      value: "National_nature_reserves.bin",
      text: "Only national nature reserves",
      sentenceText: "national nature reserves",
    },
    {
      value: "Local_nature_reserves.bin",
      text: "Only local nature reserves",
      sentenceText: "local nature reserves",
    },
    {
      value: "Conservation_areas.bin",
      text: "Only conservation areas",
      sentenceText: "conservation areas",
    },
    {
      value: "Planned_infrastructure_sites.bin",
      text: "Only planned infrastructure sites",
      sentenceText: "planned infrastructure sites",
    },
    {
      value: "Nationally_Significant_Infrastructure_Projects.bin",
      text: "Only Nationally Significant Infrastructure Projects",
      sentenceText: "Nationally Significant Infrastructure Projects",
    },
    {
      value: "HS2.bin",
      text: "Only HS2",
      sentenceText: "HS2",
    },
    {
      value: "Flood_risk_.bin",
      text: "Only flood risk",
      sentenceText: "land where there is a flood risk",
    },
    {
      value: "Flood_zone_2.bin",
      text: "Only flood zone 2",
      sentenceText: "flood zone 2",
    },
    {
      value: "Flood_zone_3.bin",
      text: "Only flood zone 3",
      sentenceText: "flood zone 3",
    },
    {
      value: "within_KM_of_BUA.bin",
      text: "Only land within 1km of built up areas",
      sentenceText: "the land within 1km of built up areas",
    },
    {
      value: "customArea",
      text: "The custom area",
      sentenceText: "the custom area",
    },
  ];

  let policyLens = $state("England");

  let policyLensArea = $state();
  $inspect(policyLensArea);
  // let rasterLayers = $state([]);
  // let lookup = [];
  // let bitLayers = $state([]);
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
  let blendedArrayIndices = $state([]);

  let breakdownData = $state(null);
  let breakdownLoading = $state(false);
  let breakdownError = $state(null);

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
        name: makeFileNameReadable(layer),
        area: enrichedLayers?.find((d) => d.filename == layer)?.area
          ? enrichedLayers?.find((d) => d.filename == layer)?.area
          : "-",
        unique: occurrences && occurrences[i] ? occurrences[i] : "",
        subLayers: selectedSubLayers[layer],
      };
    }),
  );
  // $inspect({ enrichedLayers });
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

  let categoryToColor = $derived(
    [...new Set(startingPosition?.map((d) => d.Tier))].reduce(
      (acc, item, i) => {
        acc[item] = colors[i];
        return acc;
      },
      {},
    ),
  );

  // $inspect(categoryToColor);

  let filterSections = $derived(
    [...new Set(startingPosition?.map((d) => d.Tier))]?.map((section, i) => {
      const thisSectionData = startingPosition?.filter(
        (d) => d.Tier == section,
      );
      return {
        tier: section,
        sections: [
          ...new Set(
            thisSectionData
              ?.filter((d) => d.Level !== "1")
              ?.map((d) => d.Category),
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
                  parentCheckBoxName: section.replaceAll(" ", "_") + ".bin",
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
    }),
  );
  // $inspect({ filterSections });

  let selectedSubLayers = $derived.by(() => {
    const subLayersToInclude =
      policyLens === "England" ? selected : [...selected, policyLens];
    return subLayersToInclude?.reduce((acc, sel) => {
      const key = sel;
      const value = startingPosition
        .filter(
          (d) =>
            (d.Tier == makeFileNameReadable(sel) ||
              d.Category == makeFileNameReadable(sel)) &&
            d.Data_layer !== "All data layers",
        )
        .map((d) => d.Data_layer);

      acc[key] = value;
      return acc;
    }, {});
  });

  $inspect(selectedSubLayers);

  let uniqueArray = $state([]);
  // let selectedRestrictionIndex = 0;
  let selectedRestriction = $state();
  // $inspect({ selectedRestriction });
  let selectedRestrictionIndex = $derived(
    selectedRestriction
      ? selected
          ?.map((d) => makeFileNameReadable(d))
          // .filter((d) => !d.includes("ENGLAND"))
          .indexOf(selectedRestriction)
      : undefined,
  );
  // $inspect({ selectedRestrictionIndex });
  let renderUnique = $derived(
    selected.map((d) => makeFileNameReadable(d)).includes(selectedRestriction)
      ? selectedRestrictionIndex >= 0
        ? true
        : false
      : false,
  );
  // $inspect({ renderUnique });

  const blendingProgress = writable(0);
  let blending = $state(false);

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
        // console.log(startingPosition);
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

    csvFile?.length > 0
      ? csvFile[0]
      : `${base}/data/PUBLIC_BIN_LAYERS/ultimate_land_metadata.csv`,
  );

  let geotiff = $state();
  let metadataCsv = $state();
  // $inspect(metadataCsv);

  // let unpackWorker;
  let blendWorker;

  onMount(async () => {
    await init({
      module_or_path: new URL(
        "$lib/raster_ops/pkg/raster_ops_bg.wasm",
        import.meta.url,
      ),
    });
    console.log("✅ WASM initialized");

    try {
      const response = await fetch(csvLocation);
      if (!response.ok) throw new Error("Failed to fetch CSV");
      metadataCsv = await response.text();
      // console.log(metadataCsv);

      startingPosition = parseCsv(metadataCsv);
    } catch (err) {
      console.error(err.message);
    }

    if (startingPosition) {
      selected = startingPosition
        .filter((d) => d.initially_checked === "y")
        .map((d) => d.filename);
      unpackSelectedLayers();
    }

    const tiffData = await loadDensityTiff(
      `${base}/range/hectare_counts_adjusted_nox.tif`,
    );
    densityArray = tiffData.densityArray;
  });

  function prepareToUnpack() {
    layersToUnpack = selected.map((d) =>
      parseCsv(metadataCsv).find((layer) => layer.filename === d),
    );
  }

  function unpackSelectedLayers() {
    dataURL = null;
    prepareToUnpack();

    const simpleWorker = new Worker(
      new URL("$lib/workers/wasmSimpleUnpackWorker.js", import.meta.url),
      { type: "module" },
    );

    simpleWorker.onmessage = (e) => {
      if (e.data.error) {
        console.warn(e.data.error);
        return;
      }

      // console.log("Processed data:", e.data);
      // bitLayers = e.data.rasterLayers.map((layer) => layer.data);
      enrichedLayers = e.data.rasterLayers;
      // height = e.data.height;
      // width = e.data.width;
      // bbox = e.data.bbox;
      policyLensArea = e.data.policyLensArea;
      policyLensLayer = e.data.policyLensLayer;

      // England = enrichedLayers.find(
      //   (l) => l.filename === "ENGLAND_100M.tif"
      // )?.data;
      blendLayers();
      simpleWorker.terminate();
    };

    simpleWorker.onerror = (e) => {
      console.error("Worker error:", e);
    };

    const safeLayersToUnpack = layersToUnpack.map((layer) => ({
      filename: layer.filename,
    }));

    simpleWorker.postMessage({
      layersToUnpack: safeLayersToUnpack,
      base,
      policyLens,
      customArea: new Uint32Array(customArea).buffer,
    });
  }

  function unpackZippedLayers() {
    prepareToUnpack();

    dataURL = null;

    const simpleZipWorker = new Worker(
      new URL("$lib/workers/simpleZipUnpackWorker.js", import.meta.url),
      { type: "module" },
    );

    simpleZipWorker.onmessage = (e) => {
      if (e.data.error) {
        console.warn(e.data.error);
        return;
      }

      // console.log("Processed data:", e.data);
      // bitLayers = e.data.rasterLayers.map((layer) => layer.data);
      enrichedLayers = e.data.rasterLayers;
      // height = e.data.height;
      // width = e.data.width;
      // bbox = e.data.bbox;
      policyLensArea = e.data.policyLensArea;
      policyLensLayer = e.data.policyLensLayer;

      // England = enrichedLayers.find(
      //   (l) => l.filename === "ENGLAND_100M.tif"
      // )?.data;

      blendLayers();
      simpleZipWorker.terminate();
    };

    layersToUnpack.forEach(
      (layer) => (layer.arrayBuffer = tiffArrayBuffersFromZip[layer.filename]),
    );

    let policyLensLayerToUnpack = parseCsv(metadataCsv).find(
      (layer) => layer.filename === policyLens,
    );

    let clonedPolicyLensLayerToUnpack;

    if (policyLensLayerToUnpack) {
      policyLensLayerToUnpack.arrayBuffer = tiffArrayBuffersFromZip[policyLens];
      clonedPolicyLensLayerToUnpack = structuredClone(policyLensLayerToUnpack);
      // console.log(policyLensLayerToUnpack, clonedPolicyLensLayerToUnpack);
    }

    simpleZipWorker.onerror = (e) => {
      console.error("Worker error:", e);
    };

    const clonedLayersToUnpack = layersToUnpack.map((layer) => {
      const clonedBuffer = layer.arrayBuffer.slice(0); // Makes a real copy
      return {
        filename: layer.filename,
        arrayBuffer: clonedBuffer,
      };
    });

    const transferables = clonedLayersToUnpack.map(
      (layer) => layer.arrayBuffer,
    );

    simpleZipWorker.postMessage(
      {
        layersToUnpack: clonedLayersToUnpack,
        policyLensLayerToUnpack: clonedPolicyLensLayerToUnpack ?? "England",
      },
      transferables,
      clonedPolicyLensLayerToUnpack?.arrayBuffer ?? "",
    );
  }

  //Constants used for getting the LA breakdown
  const baseUrl = `${base}/data/LAs/chunks/`;
  const numChunks = 8; // update with actual number of chunks

  const chunkUrls = Array.from(
    { length: numChunks },
    (_, i) => `${baseUrl}chunk_${i}.bin`,
  );

  async function getLABreakdown(cRoutes, bitArray) {
    const urls = Array.isArray(cRoutes) ? cRoutes : [cRoutes];
    // const width = 5728;

    let accumulatedResult = null;
    let rowOffset = 0;

    // Single persistent worker
    const breakdownWorker = new Worker(
      new URL("$lib/workers/breakdownWorker.js", import.meta.url),
      { type: "module" },
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
          csvUrl,
        });
      });

    for (const url of urls) {
      // console.log("Fetching chunk:", url);
      const catBuffer = await fetch(url).then((r) => r.arrayBuffer());
      const evenLength = catBuffer.byteLength & ~1; // drop 1 byte if odd
      const safeBuffer = catBuffer.slice(0, evenLength);
      const cChunk = new Uint16Array(safeBuffer);

      const chunkRows = cChunk.length / width;
      const bitStart = rowOffset * width;
      const bitEnd = bitStart + chunkRows * width;
      const aChunk = bitArray.subarray(bitStart, bitEnd);

      // console.log("Sending chunk to worker:", cChunk.length, aChunk.length);

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
          accumulatedResult[i].total_area = chunkResult[i].total_area; //Don't accumulate total area!
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
    // if (tableSectionHeight) {
    //   console.log($state.snapshot(tableSectionHeight));
    //   document.getElementById("table").style["min-height"] =
    //     tableSectionHeight - 100 + "px";
    // }
    done = selected.length > 0 ? false : true;
    console.time("blendLayers");
    const blendWorker = new Worker(
      new URL("$lib/workers/wasmBlendWorker.js", import.meta.url),
      { type: "module" },
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
      buffers, // transfer buffers (zero-copy)
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
        if (seeDensity) {
          done = false;
          showDensity();
        }
        // occurrences = e.data.occurrences;
        blending = false;
        blendingProgress.set(100);
        // console.log("Blending complete:", blendedArrayLength);
        console.timeEnd("blendLayers");
        findTheOnes(currentBitArrays)?.then(
          ({ finalArray, uniqueArray, occurrences, done }) => {
            // console.log("Done processing.", done);
            console.log("Final result:", finalArray, uniqueArray);
            // console.log("Selected mask:", countOccurrences(uniqueArray));
            // console.log("Occurrences:", occurrences);
            blendWorker.terminate();
            getLABreakdown(chunkUrls, blendedArray).then((result) => {
              breakdownData = result.json;
              // console.log("done breaking down: ", breakdownData);
              breakdownLoading = false;
            });
            mobile.current
              ? makeAndPaintCombinedCanvasMobile()
              : makeAndPaintCombinedCanvas();
          },
        );
        // .then();
      } else if (e.data.error) {
        console.error("Blend worker error:", e.data.error);
        blendedArray = [];
        // blendedArrayIndices = [];
        done = false;
        showDensity();
        mobile.current
          ? makeAndPaintCombinedCanvasMobile()
          : makeAndPaintCombinedCanvas();
      }
    };
  }

  function makeAndPaintCombinedCanvas() {
    console.time("canvas-combined");
    done = false;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    // Reuse ImageData if you want to go further later
    const imageData = ctx.createImageData(width, height);
    const pixels = new Uint32Array(imageData.data.buffer);

    const hasSelection = selectedRestrictionIndex >= 0 && renderUnique;
    const blendedArr = blendedArray;
    const lensArr = policyLensLayer;
    const areaArr = hasSelection
      ? currentBitArrays[selectedRestrictionIndex]
      : null;
    const uniqueArr = hasSelection ? uniqueArray : null;

    for (let i = 0; i < blendedArr.length; i++) {
      const key =
        (blendedArr[i] << 3) |
        ((lensArr ? lensArr[i] : 0) << 2) |
        ((areaArr ? areaArr[i] : 0) << 1) |
        (uniqueArr && uniqueArr[i] === 1 ? 1 : 0);

      pixels[i] = COLOR_LUT[key];
    }

    ctx.putImageData(imageData, 0, 0);

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
    const MAX_TILE_PIXELS = 10_000_000;
    const MAX_FINAL_PIXELS = 16_000_000;
    // ---------------

    const tileSize = Math.floor(Math.sqrt(MAX_TILE_PIXELS));
    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);

    let scale = 1;
    const totalPixels = width * height;
    if (totalPixels > MAX_FINAL_PIXELS) {
      scale = Math.sqrt(MAX_FINAL_PIXELS / totalPixels);
    }

    const tileBlobs = [];

    const hasSelection = selectedRestrictionIndex >= 0 && renderUnique;
    const blendedArr = blendedArray;
    const lensArr = policyLensLayer;
    const areaArr = hasSelection
      ? currentBitArrays[selectedRestrictionIndex]
      : null;
    const uniqueArr = hasSelection ? uniqueArray : null;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x0 = col * tileSize;
        const y0 = row * tileSize;
        const w = Math.min(tileSize, width - x0);
        const h = Math.min(tileSize, height - y0);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");

        const imageData = ctx.createImageData(w, h);
        const pixels = new Uint32Array(imageData.data.buffer);

        for (let y = 0; y < h; y++) {
          let base = (y0 + y) * width + x0;
          let rowOffset = y * w;

          for (let x = 0; x < w; x++) {
            const i = base + x;

            const key =
              (blendedArr[i] << 3) |
              ((lensArr ? lensArr[i] : 0) << 2) |
              ((areaArr ? areaArr[i] : 0) << 1) |
              (uniqueArr && uniqueArr[i] === 1 ? 1 : 0);

            pixels[rowOffset + x] = COLOR_LUT[key];
          }
        }

        ctx.putImageData(imageData, 0, 0);

        const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));

        tileBlobs.push({ row, col, blob, w, h });
      }
    }

    // --- Merge tiles ---
    const finalW = Math.floor(width * scale);
    const finalH = Math.floor(height * scale);
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = finalW;
    finalCanvas.height = finalH;
    const finalCtx = finalCanvas.getContext("2d");

    finalCtx.imageSmoothingEnabled = scale !== 1;
    finalCtx.imageSmoothingQuality = "high";

    await Promise.all(
      tileBlobs.map(async ({ row, col, blob, w, h }) => {
        const img = await createImageBitmap(blob);
        finalCtx.drawImage(
          img,
          col * tileSize * scale,
          row * tileSize * scale,
          w * scale,
          h * scale,
        );
      }),
    );

    const finalBlob = await new Promise((r) =>
      finalCanvas.toBlob(r, "image/png"),
    );

    dataURL = URL.createObjectURL(finalBlob);
    done = true;
    console.timeEnd("canvas-combined");

    return { dataURL, scale };
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
        { type: "module" },
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
          [...chunkSlices.map((a) => a.buffer)], // Transfer input buffers
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

  function downloadUint32Array() {
    let biggerBlendedArray = new Uint32Array(blendedArray);
    // console.log(biggerBlendedArray.BYTES_PER_ELEMENT);
    blendedArrayIndices = biggerBlendedArray
      .map((d, i) => (d === 1 ? i : 4294967295))
      .filter((d) => d !== 4294967295);

    // Use the underlying ArrayBuffer (no copy)
    const filename = "data.bin";
    const blob = new Blob([blendedArrayIndices.buffer], {
      type: "application/octet-stream",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function showDensity() {
    console.time("show-density");
    done = false;
    await tick();
    seeDensity = true;
    seeArea = false;
    let biggerBlendedArray = new Uint32Array(blendedArray);

    blendedArrayIndices = biggerBlendedArray
      .map((d, i) => (d === 1 ? i : 4294967295))
      .filter((d) => d !== 4294967295)
      .map((d) => d + 1);

    densityGroup = {
      name: "Selected area",
      paintedIndices: new Set(blendedArrayIndices),
      gridConfig: { width, height, colOffset: 0 }, // uploaded files need offset
      stats: {},
      histogram: {},
      layer: null,
    };
    computeStats(densityGroup, densityArray);
    done = true;
    console.timeEnd("show-density");
  }

  function showArea() {
    seeDensity = false;
    seeArea = true;
    console.log("showing area");
  }

  let tableSectionHeight = $state();
  $inspect(tableSectionHeight);
</script>

<svelte:head>
  <title>Development Land Analysis Platform</title>
  <meta
    name="description"
    content="This tool brings together datasets on land use and development constraints to provide statistical insight into land supply in England. It is designed to show how physical constraints, planning restrictions and land use trade-offs overlap and impact the overall supply of land for various uses."
  />
</svelte:head>

<div class="header-section">
  <div>
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
        <Button
          buttonType="secondary"
          textContent="Draw an area to explore"
          onClickFunction={() => {
            drawing = true;
          }}
        />
        <Details
          summaryText={"Use a local file (optional)"}
          detailedText={detailsContent}
        >
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
        </Details>
      </div>
    </div>
  </div>

  <div>
    <div class="header-right">
      {#key startingPosition}
        <FilterChipParent
          {startingPosition}
          {selectedSubLayers}
          bind:selected
          bind:policyLens
          {categoryToColor}
          on:itemRemoved={() => {
            // console.log(startingPosition);
            startingPosition.forEach((d) =>
              // selected.includes(d.filename) || policyLens === d.filename
              selected.includes(d.filename) // Fix for the above line, which was including the policyLens in any new selections
                ? (d.initially_checked = "y")
                : (d.initially_checked = false),
            );
            startingPosition; // Trigger $state() reactivity update
            // done = false;
            blendLayers();
          }}
          on:lensChanged={() => {
            // console.log(startingPosition);
            startingPosition.forEach((d) =>
              selected.includes(d.filename) || policyLens === d.filename
                ? (d.initially_checked = "y")
                : (d.initially_checked = false),
            );
            Object.keys(tiffArrayBuffersFromZip).length > 0
              ? unpackZippedLayers()
              : unpackSelectedLayers();
          }}
        />
      {/key}
    </div>
  </div>
</div>

<div class="container" style={containerLayout}>
  <div
    class="absolute {showFilters
      ? '-translate-x-0'
      : '-translate-x-full'} z-10 h-dvh w-[90%] transform bg-white transition-transform duration-200 ease-in-out md:w-[45%] lg:w-[40%]
            xl:w-[35%]"
    id="side-panel"
  >
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
          showFilters = !showFilters;
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
          // bbox = null;
          // console.log(startingPosition, selected);
        }}
      />
    {/if}
    <div class="collapse-filters-div">
      <button
        class="collapse-filters-button"
        onclick={() => (showFilters = !showFilters)}
        aria-expanded={showFilters}
        aria-label={showFilters ? "Close side panel" : "Open side panel"}
        aria-controls="side-panel"
      >
        {#if showFilters}
          <div class="text-gray-700">
            <!-- Close icon - arrow pointing in direction of panel -->
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
          </div>
        {:else}
          <div class="flex items-center px-2">
            <!-- Menu icon -->
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </div>
        {/if}
      </button>
    </div>
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
          <OsMap
            {dataURL}
            {bbox}
            {breakdownData}
            {blendedArrayIndices}
            bind:seeDensity
            bind:seeArea
            {width}
            {height}
            {densityArray}
            bind:customArea
            bind:policyLens
            bind:drawing
            {unpackSelectedLayers}
          />
        </div>
      {:else if bbox}
        <div id="map" style="height: calc(100vh - 150px);">
          <Spinner />
        </div>
      {:else}
        <div>Select some categories</div>
      {/if}
    </div>

    <div class="table" bind:clientHeight={tableSectionHeight}>
      <Tabs
        title="Summary"
        selectedTabId="table"
        tabs={[
          {
            id: "table",
            label: "Results",
            content: tableSnippet,
          },
          {
            id: "density",
            label: "Density",
            content: densitySnippet,
          },
        ]}
        {showDensity}
        {showArea}
        forceTabBehavior={true}
      />
      {#snippet tableSnippet()}
        {#if done && dataURL}
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
                  (d) => d.value == policyLens,
                )?.sentenceText ?? '"' + makeFileNameReadable(policyLens) + '"'}
                is
                {policyLensArea.toLocaleString()}
                ha.
              </p>
            {/if}
          </div>
          {#if policyLens !== "England"}
            <h2>
              Within <span class="lens-area"
                >{policyLensItems.find((d) => d.value == policyLens)
                  ?.sentenceText ??
                  'the "' + makeFileNameReadable(policyLens) + '" layer'}</span
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
              <p>
                That's {blendedArrayLength.toLocaleString()} hectares with the current
                selections, or about
                <b
                  >{((blendedArrayLength / policyLensArea) * 100).toFixed(
                    0,
                  )}%</b
                >
                of
                {policyLensItems.find((d) => d.value == policyLens)
                  ?.sentenceText ??
                  'the "' + makeFileNameReadable(policyLens) + '" layer'}, which
                means that {(
                  policyLensArea - blendedArrayLength
                ).toLocaleString()} hectares ({(
                  ((policyLensArea - blendedArrayLength) / policyLensArea) *
                  100
                ).toFixed(0)}%) of {policyLensItems.find(
                  (d) => d.value == policyLens,
                )?.sentenceText ??
                  'the "' + makeFileNameReadable(policyLens) + '" layer'} is not
                in the area covered by the current selections.
              </p>
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
                  {blendLayers}
                  sortedColumn={"unique"}
                />
                <Button
                  buttonType="default"
                  textContent="Download data (.csv)"
                  onClickFunction={function () {
                    const csvStr = jsonToCsv(
                      tableData,
                      policyLens,
                      policyLensItems,
                      selected,
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
                    if (!blendedArray || blendedArray.length === 0) return;

                    const csvStr = jsonToCsv(
                      breakdownData,
                      policyLens,
                      policyLensItems,
                      selected,
                    );
                    const blob = new Blob([csvStr], { type: "text/csv" });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = "land-data-by-la.csv";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);
                  }}
                ></Button>
                <Button
                  buttonType="secondary"
                  textContent="Download the selected area shape (.bin)"
                  onClickFunction={downloadUint32Array}
                />
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
      {/snippet}
      {#snippet densitySnippet()}
        {#if blendedArray.length > 0}
          <p>Title density for the selected area.</p>
          {#if densityGroup && done}
            <div class="font-semibold">
              <b> {densityGroup.name}</b>
            </div>
            <div>
              {densityGroup.name} measures {densityGroup.stats.count.toLocaleString()}
              hectares
            </div>
            <div>
              It contains {(+densityGroup.stats.sum.toFixed(
                0,
              )).toLocaleString()} title deeds
            </div>
            <div>
              Density is {densityGroup.stats.mean.toFixed(2)} titles per hectare
            </div>
            <div>
              The median hectare's number of titles is {densityGroup.stats.median.toFixed(
                0,
              )}
            </div>
            <div>
              Minimum number in a hectare: {densityGroup.stats.min.toFixed(0)}
            </div>
            <div>
              Maximum number in a hectare : {(+densityGroup.stats.max.toFixed(
                0,
              )).toLocaleString()}
            </div>

            <Histogram histogram={densityGroup.histogram} />
          {:else}
            <Spinner />
          {/if}
        {/if}
      {/snippet}
    </div>
  </div>
</div>

<style>
</style>
