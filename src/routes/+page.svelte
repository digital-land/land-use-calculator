<script lang="ts">
  //trigger deploy

  import init from "$lib/raster_ops/pkg/raster_ops"; // categorical_matrix, // unpack_bitmask, // categorical_count_masked, // binary_buffer, // binary_and_unpack_simd,
  import { onMount, tick } from "svelte";
  import { enhance } from "$app/forms";
  import { MediaQuery } from "svelte/reactivity";
  import { base } from "$app/paths";
  import { browser } from "$app/environment";
  import {
    // CheckBox,
    Select,
    // Tooltip,
    // ServiceNavigation,
    // Tabs,
  } from "@communitiesuk/svelte-component-library";
  import FilterPanel from "$lib/components/FilterPanel.svelte";
  import Button from "$lib/components/Button.svelte";
  import Details from "$lib/components/Details.svelte";
  import OsMap from "$lib/components/OSMap.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Table from "$lib/components/Table.svelte";
  import JSZip from "jszip";
  import {
    parseCsv,
    jsonToCsv,
    makeFileNameReadable,
    loadDensityTiff,
    // computeStats,
    // countOccurrences,
    convertPixelsToHectares,
    // createGroupLayer,
    indicesToBinaryMask,
    createDensityCanvas,
  } from "$lib/utils";
  import { computeDensityStats } from "$lib/densityStats";
  import { colors, width, height, bbox, sourceFolder } from "$lib/constants";
  import FilterChipParent from "$lib/components/FilterChipParent.svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import Histogram from "$lib/components/Histogram.svelte";
  import type { TableMetadata } from "$lib/utils";

  const mobile = new MediaQuery("max-width: 600px");
  // let pageLayout = $state("grid-template-columns: 23% 40% 37%");
  // let currentMousePosition = $state();
  // let hoveredArea = $state();
  let showFilters = $state(true);
  let mapSize: number = $state();
  // $inspect(mapSize);

  $effect(() => {
    document.documentElement.style.setProperty("--mapWidth", `${mapSize}%`);
    document.documentElement.style.setProperty(
      "--tw-translate-x",
      `${showFilters ? 0 : -100}%`,
    );
  });

  let done = $state(false);
  // $inspect({ done });

  let dataURL = $state();

  let containerLayout = $derived(
    mobile.current ? "" : `grid-template-columns: 100%;`,
  );
  let pageLayout = $derived(
    mobile.current
      ? ""
      : dataURL
        ? `grid-template-columns: ${mapSize}% ${100 - mapSize}%;`
        : "grid-template-columns: 50% 50%",
  );

  let densityArray = $state();
  let seeDensity = $state(false);
  // $inspect({ seeDensity });
  let seeArea = $state(true);
  // $inspect({ seeArea });
  // let densityGroup: MapGroup = $state();
  // $inspect({ densityGroup });

  let customArea: Uint32Array = $state();
  let customAreaBBox = $state();
  let drawnFeature = $state();
  let drawing = $state(false);
  let opacity: number = $state(0.8);

  let uniqueCounts = $state();

  // $inspect(uniqueCounts, uniqueIndices);

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

  const DENSITY_LUT = $derived.by(() => {
    const LUT = new Uint32Array(65536);
    for (let i = 0; i < 65536; i++) {
      // const normalized = normalizeDensity(i);
      let normalized;

      if (i <= 1) normalized = [253, 231, 37];
      else if (i <= 5) normalized = [189, 223, 38];
      else if (i <= 10) normalized = [122, 209, 81];
      else if (i <= 20) normalized = [47, 180, 124];
      else if (i <= 50) normalized = [30, 156, 137];
      else if (i <= 100) normalized = [37, 132, 142];
      else if (i <= 200) normalized = [47, 108, 142];
      else if (i <= 500) normalized = [65, 68, 135];
      else normalized = [68, 1, 84];
      const [r, g, b] = normalized;
      // console.log(interpolateViridis(1 - normalized));

      const a = Math.floor(opacity * 255);

      LUT[i] = (a << 24) | (b << 16) | (g << 8) | r;
    }
    return LUT;
  });
  // $inspect(DENSITY_LUT);

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
  // $inspect(policyLensArea);

  let currentBitArrays = $state();
  // $inspect({ currentBitArrays });

  let enrichedLayers = $state([]);
  // $inspect(enrichedLayers);
  let lensIndices = $state();
  // $inspect({ lensIndices });

  let blendedIndices = $state([]);

  let densityCanvas = $state();
  let densityDataURL = $state();
  // $inspect(densityDataURL);

  let breakdownData = $state(null);

  let blendedArrayLength = $derived(blendedIndices?.length);
  let selected = $state([]);
  // $inspect({ selected });

  let tableData = $derived(
    selected?.map((layer, i) => {
      return {
        name: makeFileNameReadable(layer),
        area: enrichedLayers?.find((d) => d.filename == layer)?.area
          ? convertPixelsToHectares(
              enrichedLayers?.find((d) => d.filename == layer)?.area,
            )
          : 0,
        unique:
          uniqueCounts && uniqueCounts[i]
            ? convertPixelsToHectares(uniqueCounts[i])
            : 0,
        subLayers: selectedSubLayers[layer],
      };
    }),
  );

  let tableMetadata: TableMetadata = {
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

  let startingPosition: object[] = $state();
  // $inspect({ startingPosition });

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
  // $inspect(selectedSubLayers);

  let uniqueArray = $state([]);

  let selectedRestriction: string = $state();
  // $inspect({ selectedRestriction });
  let selectedRestrictionIndex = $derived(
    selectedRestriction
      ? selected
          ?.map((d) => makeFileNameReadable(d))
          .indexOf(selectedRestriction)
      : undefined,
  );
  // $inspect({ selectedRestrictionIndex });

  let uniqueArrays = $state([]);
  // $inspect(uniqueArrays);
  let uniqueIndices = $derived(uniqueArrays[selectedRestrictionIndex]);

  let renderUnique = $derived(
    selected.map((d) => makeFileNameReadable(d)).includes(selectedRestriction)
      ? selectedRestrictionIndex >= 0
        ? true
        : false
      : false,
  );
  // $inspect({ renderUnique });

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
    csvFile?.length > 0
      ? csvFile[0]
      : `${base}/data/${sourceFolder}/ultimate_land_metadata.csv`,
  );

  let metadataCsv: string = $state();
  // $inspect(metadataCsv);

  onMount(async () => {
    densityCanvas = document.createElement("canvas");

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
      `${base}/range/hectare_counts_trimmed.tif`,
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
      enrichedLayers = e.data.rasterLayers;
      policyLensArea = e.data.policyLensArea;
      lensIndices = e.data.lensIndices;

      // console.log(enrichedLayers);

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

      enrichedLayers = e.data.rasterLayers;
      policyLensArea = e.data.policyLensArea;
      lensIndices = e.data.lensIndices;

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
    done = selected.length > 0 ? false : true;
    console.time("blendLayers");
    const blendWorker = new Worker(
      new URL("$lib/workers/wasmBlendWorker.js", import.meta.url),
      { type: "module" },
    );

    // Select the active layers
    const active = enrichedLayers.filter((l) => selected.includes(l.filename));
    currentBitArrays = active.map((l) => l.data);
    // console.log(currentBitArrays);
    // Ensure Uint32Arrays
    const duplicateBitLayers = active.map((l) => new Uint32Array(l.data));

    // Get the raw buffers
    const buffers = duplicateBitLayers.map((arr) => arr.buffer);
    // console.log({ active });
    // Post to the worker (transferring buffers)
    blendWorker.postMessage(
      {
        indexArrays: buffers, // send raw ArrayBuffers
      },
      buffers, // transfer buffers (zero-copy)
    );
    // console.log({ duplicateBitLayers });
    // Listen for messages
    blendWorker.onmessage = async (e) => {
      if (e.data.type === "done") {
        blendedArrayLength = e.data.activeCount;
        blendedIndices = new Uint32Array(e.data.result); // re-wrap transferred buffer
        // console.log(blendedArray, blendedArrayLength);
        if (seeDensity) {
          done = false;
          showDensity();
        }
        console.timeEnd("blendLayers");

        await findTheOnes([...currentBitArrays]);

        blendWorker.terminate();

        getLABreakdown(chunkUrls, indicesToBinaryMask(blendedIndices)).then(
          (result) => {
            breakdownData = result.json;
            // console.log("done breaking down: ", breakdownData);
          },
        );

        mobile.current
          ? makeAndPaintCombinedCanvasMobile()
          : makeAndPaintCanvasFromIndices();
      } else if (e.data.error) {
        console.error("Blend worker error:", e.data.error);
        blendedIndices = [];
        // blendedArrayIndices = [];
        done = false;
        showDensity();
        mobile.current
          ? makeAndPaintCombinedCanvasMobile()
          : makeAndPaintCanvasFromIndices();
      }
    };
  }

  // function makeAndPaintCombinedCanvas() {
  //   console.time("canvas-combined");
  //   done = false;

  //   const canvas = document.createElement("canvas");
  //   canvas.width = width;
  //   canvas.height = height;

  //   const ctx = canvas.getContext("2d");

  //   // Reuse ImageData if you want to go further later
  //   const imageData = ctx.createImageData(width, height);
  //   const pixels = new Uint32Array(imageData.data.buffer);

  //   const hasSelection = selectedRestrictionIndex >= 0 && renderUnique;
  //   const blendedArr = blendedArray;
  //   const lensArr = policyLensLayer;
  //   const areaArr = hasSelection
  //     ? currentBitArrays[selectedRestrictionIndex]
  //     : null;
  //   const uniqueArr = hasSelection ? uniqueArray : null;

  //   for (let i = 0; i < blendedArr.length; i++) {
  //     const key =
  //       (blendedArr[i] << 3) |
  //       ((lensArr ? lensArr[i] : 0) << 2) |
  //       ((areaArr ? areaArr[i] : 0) << 1) |
  //       (uniqueArr && uniqueArr[i] === 1 ? 1 : 0);

  //     pixels[i] = COLOR_LUT[key];
  //   }

  //   ctx.putImageData(imageData, 0, 0);

  //   canvas.toBlob((blob) => {
  //     dataURL = URL.createObjectURL(blob);
  //   });

  //   done = true;
  //   console.timeEnd("canvas-combined");
  // }

  function makeAndPaintCanvasFromIndices() {
    console.time("canvas-indices");
    done = false;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    const imageData = ctx.createImageData(width, height);

    const pixelCount = imageData.data.length / 4;
    const mask = new Uint8Array(pixelCount);

    const areaIndices = currentBitArrays[selectedRestrictionIndex];
    // blendedIndices, lensIndices, areaIndices, uniqueIndices
    // are Uint32Arrays of indices where value === 1

    for (let i = 0; i < blendedIndices.length; i++) {
      mask[blendedIndices[i]] |= 1 << 3;
    }

    if (lensIndices) {
      for (let i = 0; i < lensIndices.length; i++) {
        mask[lensIndices[i]] |= 1 << 2;
      }
    }

    if (areaIndices) {
      for (let i = 0; i < areaIndices.length; i++) {
        mask[areaIndices[i]] |= 1 << 1;
      }
    }

    if (uniqueIndices) {
      for (let i = 0; i < uniqueIndices.length; i++) {
        mask[uniqueIndices[i]] |= 1;
      }
    }

    const pixels = new Uint32Array(imageData.data.buffer);

    for (let i = 0; i < pixelCount; i++) {
      pixels[i] = COLOR_LUT[mask[i]];
    }

    // const pixels = new Uint32Array(imageData.data.buffer);

    // const hasSelection = selectedRestrictionIndex >= 0 && renderUnique;
    // const blendedArr = blendedArray;
    // const lensArr = policyLensLayer;
    // const areaArr = hasSelection
    //   ? currentBitArrays[selectedRestrictionIndex]
    //   : null;
    // const uniqueArr = hasSelection ? uniqueArray : null;

    // for (let i = 0; i < blendedArr.length; i++) {
    //   const key =
    //     (blendedArr[i] << 3) |
    //     ((lensArr ? lensArr[i] : 0) << 2) |
    //     ((areaArr ? areaArr[i] : 0) << 1) |
    //     (uniqueArr && uniqueArr[i] === 1 ? 1 : 0);

    //   pixels[i] = COLOR_LUT[key];
    // }

    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob((blob) => {
      dataURL = URL.createObjectURL(blob);
    });

    done = true;
    console.timeEnd("canvas-indices");
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
    const blendedArr = blendedIndices;
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

  function findTheOnes(indexArrays) {
    console.time("findTheOnes");

    if (!indexArrays.length) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const uniqueIndicesWorker = new Worker(
        new URL("../lib/workers/uniqueArraysWorker.js?worker", import.meta.url),
        { type: "module" },
      );

      uniqueIndicesWorker.onmessage = (e) => {
        if (e.data.error) {
          uniqueIndicesWorker.terminate();
          reject(new Error(e.data.error));
          return;
        }

        uniqueCounts = new Uint32Array(e.data.uniqueCounts);
        uniqueArrays = e.data.uniqueIndicesPerArray.map(
          (buf) => new Uint32Array(buf),
        );

        done = true;

        console.timeEnd("findTheOnes");

        uniqueIndicesWorker.terminate();
        resolve();
      };

      uniqueIndicesWorker.onerror = (err) => {
        uniqueIndicesWorker.terminate();
        reject(err);
      };

      const duplicateIndexArrays = indexArrays.map((l) => new Uint32Array(l));
      const buffers = duplicateIndexArrays.map((arr) => arr.buffer);

      uniqueIndicesWorker.postMessage(
        {
          arrays: buffers,
        },
        buffers,
      );
    });
  }

  function downloadUint32Array() {
    const filename = "data.bin";
    const blob = new Blob([blendedIndices.buffer], {
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

    // densityGroup = {
    //   name: "Selected area",
    //   paintedIndices: blendedIndices, //!
    //   gridConfig: { width, height, colOffset: 0 }, // uploaded files need offset
    //   stats: {},
    //   histogram: {},
    //   layer: null,
    // };
    // // computeStats(densityGroup, densityArray);
    // computeDensityStats(blendedIndices, densityArray, { width, height, colOffset: 0 });

    // densityGroup.layer = createGroupLayer(densityGroup, opacity, densityArray);

    densityDataURL = await createDensityCanvas(
      densityCanvas,
      blendedIndices,
      densityArray,
      DENSITY_LUT,
    );
    done = true;
    console.timeEnd("show-density");
  }

  const densityStats = $derived(
    computeDensityStats(blendedIndices, densityArray, {
      width,
      height,
      colOffset: 0,
    }),
  );

  function showArea() {
    seeDensity = false;
    seeArea = true;
    console.log("showing area");
  }

  let tableSectionHeight = $state();
  // $inspect(tableSectionHeight);
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
          onchange={() => {
            customAreaBBox = null;
            customArea = null;
            Object.keys(tiffArrayBuffersFromZip).length > 0
              ? unpackZippedLayers()
              : unpackSelectedLayers();
          }}
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
      <Button
        buttonType="link"
        textContent="Select all filters"
        onClickFunction={() => {
          startingPosition.forEach((d) =>
            d.Level == 3
              ? (d.initially_checked = "y")
              : (d.initially_checked = false),
          );

          selected = startingPosition
            .filter((d) => d.initially_checked === "y")
            .map((d) => d.filename);
          unpackSelectedLayers();
          showFilters = false;
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
      {#if dataURL}
        <!-- {console.log("Rendering the map!")} -->

        <div id="map" class={["os-map-container", { done }]}>
          <OsMap
            {dataURL}
            {densityDataURL}
            {bbox}
            {breakdownData}
            {blendedIndices}
            bind:seeDensity
            bind:seeArea
            {width}
            {height}
            bind:opacity
            {densityArray}
            bind:customArea
            bind:customAreaBBox
            bind:drawnFeature
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
        <!-- {#if done && dataURL} -->
        <div class="summaryStats">
          <!-- {#if blending && $blendingProgress < 100}
            <p>Blending... {$blendingProgress.toFixed(1)}%</p>
            <progress max="100" value={$blendingProgress}></progress>
          {:else if $blendingProgress == 100} -->
          <p>
            The total area in England is 13,046,002 ha.
            <!-- {#if blendedArrayLength > 0}
          {blendedArrayLength.toLocaleString()} ha is covered by the selected categories.
        {/if} -->
          </p>
          <!-- {/if} -->
          {#if policyLensArea && policyLens !== "England"}
            <p>
              The total area in England within {policyLensItems.find(
                (d) => d.value == policyLens,
              )?.sentenceText ?? '"' + makeFileNameReadable(policyLens) + '"'}
              is
              {convertPixelsToHectares(policyLensArea).toLocaleString()}
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
              That's {convertPixelsToHectares(
                blendedArrayLength,
              ).toLocaleString()} hectares with the current selections, or about
              <b>{((blendedArrayLength / policyLensArea) * 100).toFixed(0)}%</b>
              of
              {policyLensItems.find((d) => d.value == policyLens)
                ?.sentenceText ??
                'the "' + makeFileNameReadable(policyLens) + '" layer'}, which
              means that {convertPixelsToHectares(
                policyLensArea - blendedArrayLength,
              ).toLocaleString()} hectares ({(
                ((policyLensArea - blendedArrayLength) / policyLensArea) *
                100
              ).toFixed(0)}%) of {policyLensItems.find(
                (d) => d.value == policyLens,
              )?.sentenceText ??
                'the "' + makeFileNameReadable(policyLens) + '" layer'} is not in
              the area covered by the current selections.
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
            {#if tableData && tableMetadata && done}
              <Table
                caption={""}
                data={tableData.sort((a, b) => +b.unique - +a.unique)}
                metaData={tableMetadata}
                colourScale={"Off"}
                bind:sortState
                bind:selectedRestriction
                {makeAndPaintCanvasFromIndices}
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
                  if (!blendedIndices || blendedIndices.length === 0) return;

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
            {:else}
              <Spinner />
            {/if}
          {/key}
        {:else}
          <p>Select some categories to view the data.</p>
        {/if}
        <!-- {:else if bbox}
          <Spinner />
        {:else}
          <p></p>
        {/if} -->
      {/snippet}
      {#snippet densitySnippet()}
        {#if blendedIndices.length > 0}
          <p>Title density for the selected area.</p>
          {#if densityStats && done}
            <div class="font-semibold">
              <b>Selected area</b>
            </div>
            <div>
              The selected area measures {densityStats.stats.count.toLocaleString()}
              hectares
            </div>
            <div>
              It contains {(+densityStats.stats.sum.toFixed(
                0,
              )).toLocaleString()} title deeds
            </div>
            <div>
              Density is {densityStats.stats.mean.toFixed(2)} titles per hectare
            </div>
            <div>
              The median hectare's number of titles is {densityStats.stats.median.toFixed(
                0,
              )}
            </div>
            <div>
              Minimum number in a hectare: {densityStats.stats.min.toFixed(0)}
            </div>
            <div>
              Maximum number in a hectare : {(+densityStats.stats.max.toFixed(
                0,
              )).toLocaleString()}
            </div>

            <Histogram histogram={densityStats.histogram} />
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
