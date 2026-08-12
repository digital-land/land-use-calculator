<script lang="ts">
  import init from "$lib/raster_ops/pkg/raster_ops"; // categorical_matrix, // unpack_bitmask, // categorical_count_masked, // binary_buffer, // binary_and_unpack_simd,
  import { onMount, tick, untrack } from "svelte";
  import { enhance } from "$app/forms";
  import { MediaQuery } from "svelte/reactivity";
  import { asset, base, resolve } from "$app/paths";
  import ImageLayer from "ol/layer/Image";
  import ImageStatic from "ol/source/ImageStatic";
  import LayerGroup from "ol/layer/Group";
  import { GeoJSON } from "ol/format";
  import type { GeoJSONFeatureCollection } from "ol/format/GeoJSON";
  import {
    // CheckBox,
    Select,
    Radios,
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
  import DoughnutChart from "$lib/components/DoughnutChart.svelte";
  import JSZip from "jszip";
  import {
    parseCsv,
    jsonToCsv,
    makeFileNameReadable,
    makeFileNameDatasetKey,
    // loadDensityTiff,
    // computeStats,
    // countOccurrences,
    convertPixelsToHectares,
    // createGroupLayer,
    indicesToBinaryMask,
    // joinTiles,
    createDensityCanvas,
    createDensityLayerMobile,
    // originX,
    // originY,
    geometryToGridHitsScanline,
    indexToCoord,
    getTheInverse,
    getBBoxFromTileCodes,
    tileIndex,
    tilesForBBox,
    loadIndexedArray,
    loadIndexedArrayUint16,
    capitaliseFirst,
    loadTiledCategoricalDatasetGlobal,
    loadTiledBinaryDatasetGlobal,
    computeGlobalTileFrameFromTileCodes,
    downloadCsv,
    binaryMaskToIndices,
  } from "$lib/utils";
  import { computeDensityStats } from "$lib/densityStats";
  import {
    colors,
    // mhclgPaletteRGB,
    // shortCategoricalColorPaletteRgb,
    hectareBbox,
    hectareSettings,
    tenMetreSettings,
    policyLensItems,
    COLOR_LUT,
    CODES,
    tableMetadata,
    // uniqueTileCodes,
  } from "$lib/constants";
  import FilterChipParent from "$lib/components/FilterChipParent.svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import Histogram from "$lib/components/Histogram.svelte";
  import { indicesToGeoJSON } from "$lib/downloadGeoJSON";
  import type { PageData, PageProps } from "./$types";
  import type { Feature } from "ol";
  import type {
    DataLayerItem,
    DoughnutData,
    EnrichedLayer,
    TileIndex,
    GlobalFrame,
  } from "$lib/utils";

  let analysisRunId = 0;
  let breakdownRunId = 0;
  let densityRunId = 0;
  // let bootstrapRunId = 0;
  let breakdownArrayLoadRunId = 0;
  let breakdownOverlayRunId = 0;

  let metadataReady = $state(false);
  let englandAreaReady = $state(false);
  let wasmReady = $state(false);

  let bootstrapReady = $derived(metadataReady && englandAreaReady && wasmReady);

  type VisualTab = "table" | "density" | "breakdown";
  // let activeVisualTab = $state<VisualTab>("density");

  let selectedTabId = $state<VisualTab>("table");
  // $inspect({ selectedTabId });

  let LAGeoJSON: GeoJSONFeatureCollection | undefined = $state(undefined);
  // $inspect(LAGeoJSON);
  let selectedLA: string | undefined = $state();
  // $inspect(selectedLA);

  let gridType: string = $state("hectare");
  // $inspect(gridType);

  let { gridSize, sourceFolder } = $derived(
    gridType === "hectare" ? hectareSettings : tenMetreSettings,
  );
  $inspect(gridSize, sourceFolder);

  // let globalFrame = $state();

  let { data }: PageProps = $props();

  let {
    grid10mVariables,
    urlParams,
    urlParamsString,
    urlSelected,
    urlPolicyLens,
    ...rest
  } = $derived(data);
  $inspect({ grid10mVariables });
  // let grid10mVariables = data.grid10mVariables;
  const mobile = new MediaQuery("max-width: 600px");
  // let pageLayout = $state("grid-template-columns: 23% 40% 37%");
  // let currentMousePosition = $state();
  // let hoveredArea = $state();
  let showFilters: boolean = $state(true);
  let mapSize: number = $state(50);
  // $inspect(mapSize);
  let sidePanelWidth: number = $state(250);
  let sidePanelEffectiveWidth: number = $derived(
    showFilters ? sidePanelWidth : 8,
  );

  $effect(() => {
    document.documentElement.style.setProperty("--mapWidth", `${mapSize}%`);
    document.documentElement.style.setProperty(
      "--tw-translate-x",
      `${showFilters ? 0 : -100}%`,
    );
    document.documentElement.style.setProperty(
      "--zoom-control-position",
      `${sidePanelEffectiveWidth}px`,
    );
  });

  let done: boolean = $state(false);
  // $inspect({ done });

  let dataURL: string | LayerGroup | null = $state(null);

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

  let densityArray: Uint16Array = $state(new Uint16Array(0));

  const densityMetricLookup = {
    dwellings: asset(
      `/data/categorised-land/dwellings-and-businesses/dwelling_counts_100m.bin`,
    ),
    // titles: "",
    "business addresses": asset(
      `/data/categorised-land/dwellings-and-businesses/commercial_address_counts_100m.bin`,
    ),
    "population 2025-26": asset(
      `/data/categorised-land/population/population_25-26_100m.bin`,
    ),
    "population 2049-50": asset(
      `/data/categorised-land/population/population_49-50_100m.bin`,
    ),
    water: asset(`/data/categorised-land/water/baseline_sdb_2024.bin`),
    "water-wrz": asset(
      `/data/categorised-land/water/baseline_sdb_2024_wrz.bin`,
    ),
    "water-wrz-2049": asset(
      `/data/categorised-land/water/baseline_sdb_2049_wrz.bin`,
    ),
  };

  type DensityMetric = keyof typeof densityMetricLookup;

  let densityMetric = $state<DensityMetric>("dwellings");

  let densityFile: string = $derived(densityMetricLookup[densityMetric]);

  $effect(() => {
    done = false;
    loadIndexedArrayUint16(
      // `${base}/data/categorised-land/ownership_cats_260520.bin`,
      // `${base}/data/categorised-land/dwellings-and-businesses/dwelling_counts_100m.bin`,
      densityFile,
    ).then((result) => {
      densityArray = result;
      done = true;
    });
  });

  let seeDensity: boolean = $state(false);
  // $inspect({ seeDensity });
  let seeArea: boolean = $state(true);
  // $inspect({ seeArea });
  let seeBreakdown: boolean = $state(false);
  let seeMarker: boolean = $state(false);

  let drawing: boolean = $state(false);
  let opacity: number = $state(0.8);

  let uniqueCounts: Uint32Array = $state(new Uint32Array(0));
  // $inspect({ uniqueCounts });

  let usingGeoTiff: boolean = $state(false);

  const DENSITY_LUT: Uint32Array = $derived.by(() => {
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

  type RGB = [number, number, number];

  function hslToRgb(h: number, s: number, l: number): RGB {
    // h: [0..360), s/l: [0..1]
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r1 = 0,
      g1 = 0,
      b1 = 0;

    if (0 <= hp && hp < 1) [r1, g1, b1] = [c, x, 0];
    else if (1 <= hp && hp < 2) [r1, g1, b1] = [x, c, 0];
    else if (2 <= hp && hp < 3) [r1, g1, b1] = [0, c, x];
    else if (3 <= hp && hp < 4) [r1, g1, b1] = [0, x, c];
    else if (4 <= hp && hp < 5) [r1, g1, b1] = [x, 0, c];
    else if (5 <= hp && hp < 6) [r1, g1, b1] = [c, 0, x];

    const m = l - c / 2;
    return [
      Math.round((r1 + m) * 255),
      Math.round((g1 + m) * 255),
      Math.round((b1 + m) * 255),
    ];
  }

  function makeShades(
    hue: number,
    n: number,
    s = 0.62,
    l0 = 0.35,
    l1 = 0.72,
  ): RGB[] {
    if (n <= 1) return [hslToRgb(hue, s, (l0 + l1) / 2)];
    const out: RGB[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const l = l0 + t * (l1 - l0);
      out.push(hslToRgb(hue, s, l));
    }
    return out;
  }

  function packRGBA([r, g, b]: RGB, opacity: number) {
    const a = Math.round(opacity * 255) & 0xff;
    // ABGR packing (matches your existing LUT packing)
    return (a << 24) | (b << 16) | (g << 8) | r;
  }

  function groupKey(label: string): string {
    if (label === "private_individual") return "private_individual";

    if (label.startsWith("overseas_corporate")) return "overseas_corporate";

    if (label === "UK_corporate") return "UK_corporate_root";
    if (label.startsWith("UK_corporate.Crown Estate"))
      return "UK_corporate_crown";
    if (label.startsWith("UK_corporate.non_profit"))
      return "UK_corporate_non_profit";
    if (label.startsWith("UK_corporate.private_sector"))
      return "UK_corporate_private_sector";
    if (label.startsWith("UK_corporate.public_sector.central_government"))
      return "UK_corporate_central_gov";
    if (label.startsWith("UK_corporate.public_sector.local_government"))
      return "UK_corporate_local_gov";
    if (label.startsWith("UK_corporate.public_sector.public_agency"))
      return "UK_corporate_public_agency";
    if (label.startsWith("UK_corporate.university"))
      return "UK_corporate_university";
    if (label.startsWith("UK_corporate.other")) return "UK_corporate_other";

    // fallback
    return "other";
  }

  const GROUP_HUES: Record<string, { hue?: number; fixed?: RGB }> = {
    private_individual: { hue: 0 }, // red
    overseas_corporate: { hue: 285 }, // purple

    UK_corporate_root: { hue: 210 }, // blue (root)
    UK_corporate_crown: { hue: 50 }, // gold
    UK_corporate_non_profit: { hue: 140 }, // green
    UK_corporate_private_sector: { hue: 195 }, // cyan/blue
    UK_corporate_central_gov: { hue: 15 }, // red/orange
    UK_corporate_local_gov: { hue: 95 }, // olive/yellow-green
    UK_corporate_public_agency: { hue: 165 }, // teal
    UK_corporate_university: { hue: 250 }, // indigo
    UK_corporate_other: { fixed: [135, 135, 135] }, // neutral grey

    other: { fixed: [180, 180, 180] },
  };

  const BREAKDOWN_LUT: Uint32Array = $derived.by(() => {
    const LUT = new Uint32Array(65536);

    // default: transparent
    LUT.fill(packRGBA([0, 0, 0], 0));

    // group items
    const byGroup = new Map<string, Array<[number, string]>>();
    for (const [code, label] of CODES) {
      const g = groupKey(label);
      const arr = byGroup.get(g) ?? [];
      arr.push([code & 0xffff, label]);
      byGroup.set(g, arr);
    }

    // assign colours within each group
    for (const [g, items] of byGroup) {
      const spec = GROUP_HUES[g] ?? GROUP_HUES.other;

      // Stable ordering so colours don't “shuffle” between builds:
      // sort by label (or by code if you prefer)
      items.sort((a, b) => a[1].localeCompare(b[1]));

      if (spec.fixed) {
        // single fixed colour for the whole group
        for (const [code] of items) LUT[code] = packRGBA(spec.fixed, opacity);
      } else {
        const shades = makeShades(spec.hue!, items.length, 0.62, 0.35, 0.72);

        for (let i = 0; i < items.length; i++) {
          const [code] = items[i];
          LUT[code] = packRGBA(shades[i], opacity);
        }
      }
    }

    return LUT;
  });
  // $inspect(BREAKDOWN_LUT);

  const breakdownMetricLookup = {
    LPA: {
      csvUrl: asset(`/data/LPAs/LPA_100m.csv`),
      baseUrl: `${base}/data/LPAs`,
      numChunks: 1,
      chunkUrls: asset(`/data/LPAs/LPA_100m.bin`),
      LUT: DENSITY_LUT,
    },
    // LAD: "",
    ownership: {
      csvUrl: asset(
        `/data/categorised-land/ownership_lookup_fine_franklin.csv`,
      ),
      baseUrl: `${base}/data/categorised-land`,
      numChunks: 1,
      chunkUrls: asset(`/data/categorised-land/Category_All.bin`),
      LUT: BREAKDOWN_LUT,
    },
  };

  type BreakdownMetric = keyof typeof breakdownMetricLookup;

  let breakdownMetric = $state<BreakdownMetric>("LPA");

  let csvUrl = $derived(breakdownMetricLookup[breakdownMetric].csvUrl);
  let chunkUrls = $derived(breakdownMetricLookup[breakdownMetric].chunkUrls);
  let numChunks = $derived(breakdownMetricLookup[breakdownMetric].numChunks);
  let currentLUT: Uint32Array = $derived(
    breakdownMetricLookup[breakdownMetric].LUT,
  );

  let breakdownArray: Uint16Array = $state(new Uint16Array(0));
  $inspect({ breakdownArray });

  // async function refreshBreakdownArray(args: {
  //   runId: number;
  //   chunkUrls: string | string[];
  // }) {
  //   const { runId, chunkUrls } = args;

  //   try {
  //     const result =
  //       gridType === "hectare"
  //         ? await loadIndexedArrayUint16(chunkUrls)
  //         : await loadTiledCategoricalDatasetGlobal({
  //             tileCodes: tileCodes,
  //             globalFrame: globalFrame,
  //             tileWidth: 5000,
  //             tileIndex: tileIndex,
  //             sourceFolder: `${base}/data/categorised-land/ownership/10m/`,
  //           });

  //     if (runId !== breakdownArrayLoadRunId) return;

  //     breakdownArray = result;
  //   } catch (err) {
  //     if (runId === breakdownArrayLoadRunId) {
  //       console.error("Failed to load breakdown array:", err);
  //     }
  //   }
  // }

  // $effect(() => {
  //   const chunkUrlsSnapshot = chunkUrls;
  //   const runId = ++breakdownArrayLoadRunId;

  //   void refreshBreakdownArray({
  //     runId,
  //     chunkUrls: chunkUrlsSnapshot,
  //   });
  // });

  $effect(() => {
    const gridTypeSnapshot = gridType;
    const chunkUrlsSnapshot = chunkUrls;

    const tileCodesSnapshot = [...tileCodes];
    const globalFrameSnapshot = { ...globalFrame };
    const tileIndexSnapshot = tileIndex;
    const sourceFolderSnapshot = `${base}/data/categorised-land/ownership/10m/`;

    const runId = ++breakdownArrayLoadRunId;

    void refreshBreakdownArray({
      runId,
      gridType: gridTypeSnapshot,
      chunkUrls: chunkUrlsSnapshot,
      tileCodes: tileCodesSnapshot,
      globalFrame: globalFrameSnapshot,
      tileWidth: 5000,
      tileIndex: tileIndexSnapshot,
      sourceFolder: sourceFolderSnapshot,
    });
  });

  async function refreshBreakdownArray(args: {
    runId: number;
    gridType: "hectare" | "10m" | string;
    chunkUrls: string | string[];
    tileCodes: string[];
    globalFrame: GlobalFrame;
    tileWidth: number;
    tileIndex: TileIndex;
    sourceFolder: string;
  }) {
    const {
      runId,
      gridType,
      chunkUrls,
      tileCodes,
      globalFrame,
      tileWidth,
      tileIndex,
      sourceFolder,
    } = args;

    try {
      const result =
        gridType === "hectare"
          ? await loadIndexedArrayUint16(chunkUrls)
          : await loadTiledCategoricalDatasetGlobal({
              tileCodes,
              globalFrame,
              tileWidth,
              tileIndex,
              sourceFolder,
            });

      if (runId !== breakdownArrayLoadRunId) return;

      breakdownArray = result;
    } catch (err) {
      if (runId === breakdownArrayLoadRunId) {
        console.error("Failed to load breakdown array:", err);
      }
    }
  }

  async function refreshBreakdownOverlay(args: {
    runId: number;
    breakdownArray: Uint16Array;
    blendedIndices: Uint32Array;
    customArea: Uint32Array;
    breakdownChartSortValue: string;
    currentLUT: Uint32Array;
    width: number;
    height: number;
    bbox: [number, number, number, number];
    opacity: number;
    mobileCurrent: boolean;
  }) {
    const {
      runId,
      breakdownArray,
      blendedIndices,
      customArea,
      breakdownChartSortValue,
      currentLUT,
      width,
      height,
      bbox,
      opacity,
      mobileCurrent,
    } = args;

    if (!breakdownArray?.length) {
      if (runId === breakdownOverlayRunId) {
        breakdownDataURL = null;
        done = true;
      }
      return;
    }

    if (!width || !height) {
      if (runId === breakdownOverlayRunId) {
        breakdownDataURL = null;
        done = true;
      }
      return;
    }

    const activeIndices =
      breakdownChartSortValue === "total"
        ? customArea
        : breakdownChartSortValue === "inverse"
          ? getTheInverse(customArea, blendedIndices)
          : blendedIndices;

    if (!activeIndices?.length) {
      if (runId === breakdownOverlayRunId) {
        breakdownDataURL = null;
        done = true;
      }
      return;
    }

    try {
      const result = !mobileCurrent
        ? await createDensityCanvas(
            breakdownCanvas,
            activeIndices,
            breakdownArray,
            currentLUT,
            height,
            width,
          )
        : await createDensityLayerMobile(
            activeIndices,
            breakdownArray,
            currentLUT,
            bbox,
            opacity,
            height,
            width,
          );

      if (runId !== breakdownOverlayRunId) return;

      breakdownDataURL = result;
      done = true;
    } catch (err) {
      if (runId === breakdownOverlayRunId) {
        console.error("Failed to create breakdown overlay:", err);
        done = true;
      }
    }
  }

  $effect(() => {
    const selectedTabIdSnapshot = selectedTabId;
    if (selectedTabIdSnapshot !== "breakdown") return;

    const breakdownArraySnapshot = breakdownArray;
    const blendedIndicesSnapshot = blendedIndices;
    const customAreaSnapshot =
      policyLensValue === "England" || policyLensValue === "customArea"
        ? customArea
        : lensIndices;
    const sortValueSnapshot = breakdownChartSortValue;
    const currentLUTSnapshot = currentLUT;
    const widthSnapshot = width;
    const heightSnapshot = height;
    const bboxSnapshot = bbox;
    const opacitySnapshot = opacity;
    const mobileCurrentSnapshot = mobile.current;

    const runId = ++breakdownOverlayRunId;
    done = false;

    void refreshBreakdownOverlay({
      runId,
      breakdownArray: breakdownArraySnapshot,
      blendedIndices: blendedIndicesSnapshot,
      customArea: customAreaSnapshot,
      breakdownChartSortValue: sortValueSnapshot,
      currentLUT: currentLUTSnapshot,
      width: widthSnapshot,
      height: heightSnapshot,
      bbox: bboxSnapshot,
      opacity: opacitySnapshot,
      mobileCurrent: mobileCurrentSnapshot,
    });
  });

  let policyLensValue: string = $state("England");
  $inspect({ policyLensValue });
  let policyLens = $derived.by(() => {
    const mutatedSourceFolder = sourceFolder.split("_");

    gridType === "hectare"
      ? (mutatedSourceFolder[2] = policyLensValue)
      : mutatedSourceFolder.splice(2, 0, policyLensValue);

    // mutatedSourceFolder[2] = policyLensValue;
    return policyLensValue === "England"
      ? "England"
      : policyLensValue === "customArea"
        ? "customArea"
        : gridType === "hectare"
          ? mutatedSourceFolder.join("_") + ".bin"
          : // : mutatedSourceFolder.slice(1).join("_") + ".bin";
            policyLensValue;
  });

  if (urlPolicyLens) {
    policyLens = urlPolicyLens;
  }
  // $inspect(policyLens);

  // let tileCodes = $state(["STNE", "STSW"]);
  // $inspect(tileCodes);

  // let customArea: Uint32Array = $state();

  let drawnFeature: Feature | undefined = $state();
  $inspect({ drawnFeature });

  let customAreaGeometry = $derived(drawnFeature?.getGeometry());
  $inspect({ customAreaGeometry });
  let customAreaBBox: number[] | undefined = $derived(
    customAreaGeometry?.getExtent(),
  );

  let tileCodes = $derived(
    customAreaBBox
      ? tilesForBBox(customAreaBBox, tileIndex, 50000)
      : ["SSSE", "SSSW"],
  );

  let bbox: [number, number, number, number] = $derived(
    gridType === "hectare"
      ? hectareBbox
      : getBBoxFromTileCodes(tileCodes, gridSize, 5000),
  );

  let width = $derived((bbox[2] - bbox[0]) / gridSize);
  let height = $derived((bbox[3] - bbox[1]) / gridSize);
  // $inspect(bbox, width, height);

  let globalFrame = $derived(computeGlobalTileFrameFromTileCodes(tileCodes));

  const format = new GeoJSON();
  let geojsonString = $derived(
    drawnFeature
      ? format.writeFeatures([drawnFeature], {
          featureProjection: "EPSG:27700",
          dataProjection: "EPSG:4326",
        })
      : "",
  );
  // $inspect({ geojsonString });

  async function loadSSSW(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return new Uint32Array(0); // ← key change
      return new Uint32Array(await res.arrayBuffer());
    } catch {
      return new Uint32Array(0); // network errors too
    }
  }

  let englandAreaHectare = $state(new Uint32Array(0));
  let englandAreaSSSW = $state(new Uint32Array(0));

  let englandArea10m = $state<Uint32Array>(new Uint32Array(0));
  let englandArea10mLoading = $state(false);

  $effect(() => {
    const codes = tileCodes;
    const frame = globalFrame;

    if (!codes.length || !frame) {
      englandArea10m = new Uint32Array(0);
      return;
    }

    let cancelled = false;
    englandArea10mLoading = true;

    loadTiledBinaryDatasetGlobal({
      tileCodes: codes,
      globalFrame: frame,
      tileWidth: 5000,
      tileIndex,
      sourceFolder: "England_10m",
    })
      .then((result) => {
        if (!cancelled) {
          englandArea10m = result;
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed loading England 10m area", err);
          englandArea10m = new Uint32Array(0);
        }
      })
      .finally(() => {
        if (!cancelled) {
          englandArea10mLoading = false;
        }
      });

    return () => {
      cancelled = true;
    };
  });

  // loadSSSW(
  //   asset("/data/categorised-land/SSSW_10m_of_England_Boundaries_2024.br"),
  // ).then((value) => {
  //   englandAreaSSSW = binaryMaskToIndices(value);
  // });

  // $inspect({ englandAreaSSSW });
  $effect(() => {
    if (selectedLA && LAGeoJSON) {
      // console.log(
      //   { selectedLA },
      //   LAGeoJSON?.features?.find((d) => d.properties.LAD25CD === selectedLA),
      // );
      // drawnFeature = LAGeoJSON
      //   ?.features.find((d) => d.properties.LAD25CD === selectedLA);

      drawnFeature = format.readFeatures(
        LAGeoJSON?.features?.find(
          (d) =>
            d.properties?.LAD25CD === selectedLA ||
            d.properties?.LPA23CD === selectedLA,
        ),
        {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:27700",
        },
      )[0];
      // console.log({ drawnFeature });

      // async () => {
      // console.log("setting tileCodes from selectedLA effect");
      // tileCodes = await tilesForBBox(customAreaBBox, tileIndex, 50000);
      // };

      // console.log({ customArea, tileCodes });
      policyLensValue = "customArea";

      closePanelAndScrollToMap();
    }

    // customAreaGeometry = features[0].getGeometry();

    //!!! Bug - need to fix this for areas that have multiple features
    // drawnFeature = features[0];
  });

  let customArea = $derived(
    customAreaGeometry
      ? new Uint32Array(
          geometryToGridHitsScanline(customAreaGeometry, bbox, width, height),
        )
      : policyLensValue === "England" && gridType === "hectare"
        ? englandAreaHectare
        : policyLensValue === "England" && gridType !== "hectare"
          ? englandArea10m
          : new Uint32Array(0),
  );
  $inspect({ customArea });

  async function onCustomAreaChange() {
    console.log("effect changing customArea");
    const runId = ++analysisRunId;

    if (!bootstrapReady) return;
    if (!startingPosition?.length) return;
    if (!selected?.length) return;
    if (!customArea?.length) return;

    if (usingGeoTiff) {
      unpackZippedLayers();
    } else {
      await unpackAndBlendLayers();
    }

    if (runId !== analysisRunId) return;
  }

  $effect(() => {
    const ready = bootstrapReady;
    const area = customArea;
    const selectedCount = selected?.length ?? 0;
    const metadataCount = startingPosition?.length ?? 0;

    if (!ready) return;
    if (!metadataCount) return;
    if (!selectedCount) return;
    if (!area?.length) return;

    untrack(() => {
      void onCustomAreaChange();
    });
  });

  let policyLensArea: number | null = $state(
    (13_046_002 * 10_000) / (gridSize * gridSize),
  );
  // $inspect(policyLensArea);

  let currentBitArrays: Uint32Array[] = $state([]);
  // $inspect({ currentBitArrays });

  let enrichedLayers: EnrichedLayer[] = $state([]);
  // $inspect(enrichedLayers);
  let lensIndices: Uint32Array = $state(new Uint32Array(0));
  // $inspect({ lensIndices });

  let blendedIndices: Uint32Array = $state(new Uint32Array(0));
  // $inspect(blendedIndices)

  let densityCanvas: HTMLCanvasElement | undefined = $state();
  let densityDataURL = $state();

  let breakdownCanvas: HTMLCanvasElement | undefined = $state();
  let breakdownDataURL = $state();
  // $inspect({ breakdownDataURL });

  type BreakdownDatum = {
    area_code: string;
    area_name: string;
    selected_area: number;
    total_area: number;
    selected_area_as_a_proportion_of_total_area: number;
    color: string;
  };

  let breakdownData: BreakdownDatum[] = $state([]);
  $inspect(
    breakdownData?.map((d) => {
      return { [d.area_name]: d.total_area };
    }),
  );

  function categoryKey(areaName: string) {
    const cleaned = areaName ?? ""; /*.replace(/[^a-z0-9]/gi, "");*/
    // return cleaned ? cleaned[0].toUpperCase() : "#"; // "#" bucket for “no key”
    return cleaned;
  }

  function summariseByCategory(data: BreakdownDatum[]) {
    return (data ?? [])
      .filter((d) => (d.area_code ?? "").startsWith("E"))
      .reduce((acc, d) => {
        const key = categoryKey(d.area_name);

        if (!acc[key]) acc[key] = { total: 0, selected: 0, color: null };

        acc[key].total += d.total_area ?? 0;
        acc[key].selected += d.selected_area ?? 0;
        acc[key].color = d.color ?? null;

        return acc;
      }, {});
  }
  let breakdownChartSortValue: string = $state("total");
  // $inspect(breakdownChartSortValue);
  let summaryByCategory = $derived(
    Object.entries(summariseByCategory(breakdownData)).sort((a, b) => {
      if (breakdownChartSortValue === "total") {
        return b[1].total - a[1].total;
      } else if (breakdownChartSortValue === "selected") {
        return b[1].selected - a[1].selected;
      } else {
        const ratio = ({ selected, total }) =>
          total > 0 ? selected / total : 0;
        return ratio(b[1]) - ratio(a[1]);
      }
    }),
  );

  let summaryByCategoryMaxValue = $derived({
    total: Math.max(...summaryByCategory?.map((d) => d[1].total)),
    selected: Math.max(...summaryByCategory?.map((d) => d[1].selected)),
  });

  let doughnutChartData: DoughnutData[] = $derived(
    Object.entries(summariseByCategory(breakdownData))
      .map(([name, values]) => ({
        name,
        ...values,
      }))
      .sort((a, b) => {
        if (breakdownChartSortValue === "total") {
          return b.total - a.total;
        } else if (breakdownChartSortValue === "selected") {
          return b.selected - a.selected;
        } else {
          const ratio = ({ selected, total }) =>
            total > 0 ? selected / total : 0;
          return ratio(b) - ratio(a);
        }
      }),
  );

  let blendedArrayLength: number | null = $derived(blendedIndices?.length);
  // $inspect({blendedArrayLength})
  let selected: string[] = $state([]);
  $inspect({ selected });

  let tableData = $derived(
    selected?.map((layer, i) => {
      if (enrichedLayers?.length === 0) return;
      const matchedLayer = enrichedLayers.find(
        (d) => makeFileNameDatasetKey(d.filename) === layer,
      );

      return {
        name: makeFileNameReadable(layer, gridType, usingGeoTiff),
        area: matchedLayer
          ? convertPixelsToHectares(matchedLayer.area, gridSize)
          : 0,
        unique:
          uniqueCounts?.[i] !== undefined
            ? convertPixelsToHectares(uniqueCounts[i], gridSize)
            : 0,
        subLayers: selectedSubLayers?.[layer],
      };
    }),
  );

  let sortState = $state({ column: "unique", order: "descending" });

  let startingPosition: DataLayerItem[] = $state([]);
  // $inspect({ startingPosition });

  let categoryToColor: object = $derived(
    [...new Set(startingPosition?.map((d) => d.tier))].reduce(
      (acc, item, i) => {
        acc[item] = colors[i];
        return acc;
      },
      {},
    ),
  );
  $inspect(categoryToColor);

  let filterSections = $derived(
    [...new Set(startingPosition?.map((d) => d.tier))]?.map((section, i) => {
      const thisSectionData = startingPosition?.filter(
        (d) => d.tier == section,
      );
      return {
        tier: section,
        sections: [
          ...new Set(
            thisSectionData
              ?.filter((d) => d.level !== 1)
              ?.map((d) => d.category),
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
              .filter((d) => d.category == category)
              ?.map((layer) => {
                return {
                  value: makeFileNameDatasetKey(layer.filename),
                  // label: layer.dataLayer,
                  label: makeFileNameReadable(
                    layer.filename,
                    gridType,
                    usingGeoTiff,
                  ),
                  exclusive: layer.level == 2 ? true : false,
                  checked: layer.initiallyChecked,
                  parentCheckBoxName:
                    section.replaceAll(" ", "_") +
                    (usingGeoTiff ? ".tif" : ".bin"),
                  section: category,
                };
              }),
          };
        }),
        allOption: thisSectionData?.map((d) => d.level)?.includes(1),
        allChecked: thisSectionData?.find((d) => d.level == 1)
          ?.initiallyChecked,
      };
    }),
  );
  // $inspect({ filterSections });

  let selectedSubLayers: object = $derived.by(() => {
    const subLayersToInclude =
      policyLens === "England" ? selected : [...selected, policyLens];
    return subLayersToInclude?.reduce((acc, sel) => {
      const key = sel;
      // console.log(key);
      const value = startingPosition
        ?.filter(
          (d) =>
            (d.tier == makeFileNameReadable(sel, gridType, usingGeoTiff) ||
              d.category ==
                makeFileNameReadable(sel, gridType, usingGeoTiff)) &&
            d.dataLayer !== "All data layers",
        )
        .map((d) => d.dataLayer);

      acc[key] = value;
      return acc;
    }, {});
  });
  // $inspect({ selectedSubLayers });

  // let uniqueArray = $state([]);

  let selectedRestriction: string | undefined = $state();
  $inspect({ selectedRestriction });
  let selectedRestrictionIndex: number | undefined = $derived(
    selectedRestriction
      ? selected
          ?.map((d) => makeFileNameReadable(d, gridType, usingGeoTiff))
          .indexOf(selectedRestriction)
      : undefined,
  );
  // $inspect({ selectedRestrictionIndex });

  let uniqueArrays: Uint32Array[] = $state([]);
  // $inspect({ uniqueArrays });
  let uniqueIndices = $derived(
    selectedRestrictionIndex !== undefined
      ? uniqueArrays[selectedRestrictionIndex]
      : [],
  );
  $inspect({ uniqueIndices });

  async function updateCanvas() {
    if (!blendedIndices?.length) return;
    mobile.current
      ? (dataURL = await makeAndPaintCanvasFromIndicesMobile())
      : makeAndPaintCanvasFromIndices();
  }

  $effect(() => {
    // When selectedRestriction changes update the map,
    // but don't update each time any of the reactive values read within updateCanvas changes
    selectedRestriction;
    untrack(() => {
      updateCanvas();
    });
  });

  // let csvFile = $state();
  let zipFile: FileList | undefined = $state();
  // $inspect(zipFile);
  // let geoJSONFile: FileList = $state();
  // $inspect(geoJSONFile);
  let uploadedGeoJSON: GeoJSON | undefined = $state();
  // $inspect(uploadedGeoJSON);

  let tiffArrayBuffersFromZip = $state({});

  let layersToUnpack = $state();
  $inspect({ layersToUnpack });

  async function handleFileUpload() {
    if (typeof dataURL === "string") URL.revokeObjectURL(dataURL);
    dataURL = null;
    selected = [];
    usingGeoTiff = true;

    // const file: FileList | null = event?.target?.files[0];
    if (!zipFile) return;

    const zip = await JSZip.loadAsync(zipFile[0]);
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
        .filter((d) => d.initiallyChecked)
        .map((d) => makeFileNameDatasetKey(d.filename));
      if (selected.length > 0) {
        unpackZippedLayers();
      }
    }
  }

  async function handleGeoJSONFileUpload(event) {
    uploadedGeoJSON = await event.target.files[0].text();
    const format = new GeoJSON();

    const features = format.readFeatures(uploadedGeoJSON, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:27700",
    });

    //!!! Bug - need to fix this for areas that have multiple features
    drawnFeature = features[0];

    selectedLA = undefined;

    // console.log("in the geo file upload handler, customArea: ", customArea);
    policyLensValue = "customArea";
  }

  let csvLocation = $derived(
    asset(`/data/${sourceFolder}/ultimate_land_metadata.csv`),
  );

  let metadataCsv: string = $state();
  // $inspect(metadataCsv);

  $effect(async () => {
    gridType;
    metadataReady = false;
    try {
      const response = await fetch(csvLocation);
      if (!response.ok) throw new Error("Failed to fetch CSV");
      metadataCsv = await response.text();
      // console.log(metadataCsv);

      startingPosition = parseCsv(metadataCsv);
      // console.log(startingPosition);
      metadataReady = true;
    } catch (err) {
      metadataReady = false;
      console.error(err.message);
    }

    if (startingPosition) {
      if (urlSelected?.length > 0) {
        startingPosition.forEach((d) =>
          // selected.includes(d.filename) || policyLens === d.filename
          urlSelected?.includes(makeFileNameDatasetKey(d.filename)) // Fix for the above line, which was including the policyLens in any new selections
            ? (d.initiallyChecked = true)
            : (d.initiallyChecked = false),
        );
        selected = urlSelected;
      } else {
        selected = startingPosition
          .filter((d) => d.initiallyChecked === true)
          .map((d) => makeFileNameDatasetKey(d.filename));
      }

      policyLensArea = null;
      blendedArrayLength = null;
      // unpackSelectedLayers();
      await unpackAndBlendLayers();
      // closePanelAndScrollToMap();

      if (selectedTabId === "table") {
        seeArea = true;
        seeDensity = false;
        seeBreakdown = false;
      } else if (selectedTabId === "density") {
        seeArea = false;
        seeDensity = true;
        seeBreakdown = false;
      } else {
        seeArea = false;
        seeDensity = false;
        seeBreakdown = true;
      }
    }
  });

  onMount(async () => {
    densityCanvas = document.createElement("canvas");
    breakdownCanvas = document.createElement("canvas");

    englandAreaHectare = await loadIndexedArray(
      asset(`/data/categorised-land/ENGLAND_100M_OS_GRID_COMPATIBLE.bin`),
      // "/blob/a-dlap/ENGLAND_100M_OS_GRID_COMPATIBLE.bin.br" + SAS-token,
    );
    englandAreaReady = true;

    await init({
      module_or_path: new URL(
        "$lib/raster_ops/pkg/raster_ops_bg.wasm",
        import.meta.url,
      ),
    });
    wasmReady = true;
    console.log("✅ WASM initialized");

    // const res = await fetch("/LAD_MAY_2025_UK_BGC_England.geojson");
    const res = await fetch(asset("/LPA_APR_2023_England_BGC_V2.geojson"));

    if (!res.ok) {
      console.error("Failed to load GeoJSON");
      return;
    }
    LAGeoJSON = await res.json();
    // console.log(LAGeoJSON);
  });

  // $effect(async () => {
  //   englandAreaSSSW = await loadTiledBinaryDatasetGlobal({
  //     tileCodes,
  //     globalFrame,
  //     tileWidth: 5000,
  //     tileIndex,
  //     sourceFolder: `${base}/data/categorised-land/`,
  //   });
  // });

  function prepareToUnpack() {
    layersToUnpack = selected?.map((d) =>
      parseCsv(metadataCsv).find(
        (layer) => makeFileNameDatasetKey(layer?.filename) === d,
      ),
    );
  }

  async function unpackZippedLayers() {
    const runId = ++analysisRunId;

    prepareToUnpack();
    if (typeof dataURL === "string") URL.revokeObjectURL(dataURL);
    dataURL = null;

    const worker = new Worker(
      new URL("$lib/workers/simpleZipUnpackWorker.js", import.meta.url),
      { type: "module" },
    );

    return new Promise((resolve, reject) => {
      worker.onmessage = async (e) => {
        if (runId !== analysisRunId) {
          worker.terminate();
          resolve(false);
          return;
        }

        if (e.data.error) {
          worker.terminate();
          reject(new Error(e.data.error));
          return;
        }

        enrichedLayers = e.data.rasterLayers;
        policyLensArea = e.data.policyLensArea;
        lensIndices = e.data.lensIndices
          ? new Uint32Array(e.data.lensIndices)
          : null;

        if (runId !== analysisRunId) {
          worker.terminate();
          resolve(false);
          return;
        }

        worker.terminate();

        // follow-on work must also be guarded
        if (runId === analysisRunId) {
          blendLayers();
        }

        resolve(true);
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };

      const layersWithBuffers = layersToUnpack
        .map((layer) => {
          const buffer = tiffArrayBuffersFromZip[layer.filename];

          if (!buffer) {
            console.warn("Missing buffer for:", layer.filename);
            return null;
          }

          return {
            filename: layer.filename,
            arrayBuffer: buffer,
          };
        })
        .filter(Boolean);

      let policyLensLayerToUnpack = parseCsv(metadataCsv).find(
        (layer) => layer.filename === policyLens.replace(".bin", ".tif"),
      );

      let clonedPolicyLensLayerToUnpack;

      if (policyLensLayerToUnpack) {
        policyLensLayerToUnpack.arrayBuffer =
          tiffArrayBuffersFromZip[policyLens.replace(".bin", ".tif")];
        clonedPolicyLensLayerToUnpack = structuredClone(
          policyLensLayerToUnpack,
        );
        // console.log(policyLensLayerToUnpack, clonedPolicyLensLayerToUnpack);
      }

      // simpleZipWorker.onerror = (e) => {
      //   console.error("Worker error:", e);
      // };

      const transferables = layersWithBuffers.map((l) => l.arrayBuffer);

      if (clonedPolicyLensLayerToUnpack?.arrayBuffer) {
        transferables.push(clonedPolicyLensLayerToUnpack.arrayBuffer);
      }

      worker.postMessage(
        {
          layersToUnpack: layersWithBuffers,
          policyLensLayerToUnpack:
            policyLens == "customArea"
              ? "customArea"
              : (clonedPolicyLensLayerToUnpack ?? "England"),
          customArea: new Uint32Array(customArea ? customArea : []).buffer,
          width,
          height,
        },
        // transferables,
      );
    });
  }

  //Constants used for getting the LA breakdown
  // const baseUrl = `${base}/data/LAs/chunks/`;
  // const numChunks = 8; // update with actual number of chunks
  // const baseUrl = `${base}/data/LPAs`;
  // const numChunks = 1; // update with actual number of chunks

  // const chunkUrls = Array.from(
  //   { length: numChunks },
  //   // (_, i) => `${baseUrl}chunk_${i}.bin`,
  //   // (_, i) => `${baseUrl}/Simply_categorised_land_uint16.bin`,
  //   (_, i) => `${baseUrl}/LPA_100m.bin`,
  //   // (_, i) => `${baseUrl}/ownership_cats_260520.bin`,
  // );

  async function getLABreakdown(
    breakdownArray: Uint16Array,
    bitArray: Uint8Array,
    customArea: Uint32Array | null,
    width: number,
    height: number,
  ) {
    const areaMask = customArea?.length
      ? indicesToBinaryMask(customArea, width, height)
      : null;

    const breakdownWorker = new Worker(
      new URL("$lib/workers/breakdownWorker.js", import.meta.url),
      { type: "module" },
    );

    try {
      const json = await new Promise((resolve, reject) => {
        const onMessage = (e) => {
          const { json, error } = e.data;

          if (error) {
            reject(new Error(error));
          } else {
            resolve(json);
          }
        };

        breakdownWorker.addEventListener("message", onMessage, {
          once: true,
        });

        breakdownWorker.postMessage({
          categoricalArray: breakdownArray,
          selectionMask: bitArray,
          areaMask,
          csvUrl,
          numCats: 64465,
          BREAKDOWN_LUT: currentLUT,
        });
      });

      return {
        json,
        bitArray,
      };
    } finally {
      breakdownWorker.terminate();
    }
  }

  function blendLayers() {
    done = selected.length > 0 ? false : true;
    if (selected.length === 0) {
      if (typeof dataURL === "string") URL.revokeObjectURL(dataURL);
      dataURL = null;
    }

    console.time("blendLayers");
    const blendWorker = new Worker(
      new URL("$lib/workers/wasmBlendWorker.js", import.meta.url),
      { type: "module" },
    );

    // Select the active layers
    const active = enrichedLayers.filter((l) =>
      selected.includes(makeFileNameDatasetKey(l.filename)),
    );
    currentBitArrays = active.map((l) => l.data);
    //console.log("CBA---",currentBitArrays);
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

        mobile.current
          ? (dataURL = await makeAndPaintCanvasFromIndicesMobile())
          : makeAndPaintCanvasFromIndices();
      } else if (e.data.error) {
        console.error("Blend worker error:", e.data.error);
        blendedIndices = new Uint32Array(0);
      }
    };
  }

  async function refreshBreakdownSummary(args: {
    runId: number;
    gridType: string;
    chunkUrls: string | string[];
    blendedIndices: Uint32Array;
    customArea: Uint32Array;
    width: number;
    height: number;
  }) {
    const {
      runId,
      gridType,
      chunkUrls,
      blendedIndices,
      customArea,
      width,
      height,
    } = args;
    console.log({ runId, width, height });
    // if (gridType !== "hectare") return;
    if (!width || !height) return;

    // No area of interest -> no breakdown
    if (!customArea?.length) {
      if (runId === breakdownRunId) {
        breakdownData = [];
      }
      return;
    }

    // No filtered cells -> empty breakdown
    if (!blendedIndices?.length) {
      if (runId === breakdownRunId) {
        breakdownData = [];
      }
      return;
    }

    try {
      const selectionMask = indicesToBinaryMask(blendedIndices, width, height);

      const breakdownResult = await getLABreakdown(
        // chunkUrls,
        breakdownArray,
        selectionMask,
        customArea,
        width,
        height,
      );

      if (runId !== breakdownRunId) return;

      breakdownData = breakdownResult.json;
    } catch (err) {
      if (runId === breakdownRunId) {
        console.error("Breakdown refresh failed:", err);
      }
    }
  }

  async function refreshDensityVisual(args: {
    runId: number;
    gridType: string;
    blendedIndices: Uint32Array;
    customArea: Uint32Array;
    width: number;
    height: number;
    densityArray: Uint16Array;
    DENSITY_LUT: Uint32Array;
    breakdownChartSortValue: string;
    mobileCurrent: boolean;
    bbox: [number, number, number, number];
    opacity: number;
  }) {
    const {
      runId,
      gridType,
      blendedIndices,
      customArea,
      width,
      height,
      densityArray,
      DENSITY_LUT,
      breakdownChartSortValue,
      mobileCurrent,
      bbox,
      opacity,
    } = args;

    if (gridType !== "hectare") return;
    if (!width || !height) return;
    if (!densityArray?.length) return;
    if (!customArea?.length) return;

    const activeIndices =
      breakdownChartSortValue === "total"
        ? customArea
        : breakdownChartSortValue === "inverse"
          ? getTheInverse(customArea, blendedIndices)
          : blendedIndices;

    if (!activeIndices?.length) {
      if (runId === densityRunId) {
        densityDataURL = null;
      }
      return;
    }

    try {
      const densityResult = !mobileCurrent
        ? await createDensityCanvas(
            densityCanvas,
            activeIndices,
            densityArray,
            DENSITY_LUT,
            height,
            width,
          )
        : await createDensityLayerMobile(
            activeIndices,
            densityArray,
            DENSITY_LUT,
            bbox,
            opacity,
            height,
            width,
          );

      if (runId !== densityRunId) return;

      densityDataURL = densityResult;
    } catch (err) {
      if (runId === densityRunId) {
        console.error("Density refresh failed:", err);
      }
    }
  }

  $effect(() => {
    const gridTypeSnapshot = gridType;
    const chunkUrlsSnapshot = chunkUrls;
    const blendedIndicesSnapshot = blendedIndices;
    const customAreaSnapshot =
      policyLensValue === "England" || policyLensValue === "customArea"
        ? customArea
        : lensIndices;
    const widthSnapshot = width;
    const heightSnapshot = height;

    const runId = ++breakdownRunId;

    void refreshBreakdownSummary({
      runId,
      gridType: gridTypeSnapshot,
      chunkUrls: chunkUrlsSnapshot,
      blendedIndices: blendedIndicesSnapshot,
      customArea: customAreaSnapshot,
      width: widthSnapshot,
      height: heightSnapshot,
    });
  });

  $effect(() => {
    const selectedTabIdSnapshot = selectedTabId;
    if (selectedTabIdSnapshot !== "density") return;

    const gridTypeSnapshot = gridType;
    const blendedIndicesSnapshot = blendedIndices;
    const customAreaSnapshot =
      policyLensValue === "England" || policyLensValue === "customArea"
        ? customArea
        : lensIndices;
    const widthSnapshot = width;
    const heightSnapshot = height;
    const densityArraySnapshot = densityArray;
    const densityLUTSnapshot = DENSITY_LUT;
    const sortValueSnapshot = breakdownChartSortValue;
    const mobileCurrentSnapshot = mobile.current;
    const bboxSnapshot = bbox;
    const opacitySnapshot = opacity;

    const runId = ++densityRunId;

    void refreshDensityVisual({
      runId,
      gridType: gridTypeSnapshot,
      blendedIndices: blendedIndicesSnapshot,
      customArea: customAreaSnapshot,
      width: widthSnapshot,
      height: heightSnapshot,
      densityArray: densityArraySnapshot,
      DENSITY_LUT: densityLUTSnapshot,
      breakdownChartSortValue: sortValueSnapshot,
      mobileCurrent: mobileCurrentSnapshot,
      bbox: bboxSnapshot,
      opacity: opacitySnapshot,
    });
  });

  function makeAndPaintCanvasFromIndices() {
    if (!blendedIndices?.length) return;
    console.time("canvas-indices");
    done = false;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    // console.log(width, height);
    const imageData = ctx.createImageData(width, height);

    const pixelCount = imageData.data.length / 4;
    const mask = new Uint8Array(pixelCount);

    const areaIndices =
      selectedRestrictionIndex !== undefined
        ? currentBitArrays[selectedRestrictionIndex]
        : undefined;
    // blendedIndices, lensIndices, areaIndices, uniqueIndices
    // are Uint32Arrays of indices where value === 1

    if (blendedIndices) {
      for (let i = 0; i < blendedIndices.length; i++) {
        mask[blendedIndices[i]] |= 1 << 3;
      }
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

    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob((blob) => {
      if (typeof dataURL === "string") URL.revokeObjectURL(dataURL);
      dataURL = URL.createObjectURL(blob);
    });

    done = true;
    console.timeEnd("canvas-indices");
  }

  async function makeAndPaintCanvasFromIndicesMobile() {
    console.time("canvas-indices-mobile-tiles");

    const MAX_TILE_PIXELS = 10_000_000;
    const tileSize = Math.floor(Math.sqrt(MAX_TILE_PIXELS));

    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);

    const pixelCount = width * height;

    // --- Build FULL mask once (critical for performance) ---
    const mask = new Uint8Array(pixelCount);

    const areaIndices =
      selectedRestrictionIndex !== undefined
        ? currentBitArrays[selectedRestrictionIndex]
        : undefined;

    if (blendedIndices) {
      for (let i = 0; i < blendedIndices.length; i++) {
        mask[blendedIndices[i]] |= 1 << 3;
      }
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

    const [minX, minY, maxX, maxY] = bbox;
    const pixelWidth = (maxX - minX) / width;
    const pixelHeight = (maxY - minY) / height;

    const layers: ImageLayer<ImageStatic>[] = [];

    // --- Tile rendering ---
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x0 = col * tileSize;
        const y0 = row * tileSize;

        const w = Math.min(tileSize, width - x0);
        const h = Math.min(tileSize, height - y0);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d")!;
        const imageData = ctx.createImageData(w, h);
        const pixels = new Uint32Array(imageData.data.buffer);

        // Copy subsection from full mask
        for (let ty = 0; ty < h; ty++) {
          const globalRow = (y0 + ty) * width;
          const localRow = ty * w;

          for (let tx = 0; tx < w; tx++) {
            const globalIndex = globalRow + (x0 + tx);
            const localIndex = localRow + tx;

            pixels[localIndex] = COLOR_LUT[mask[globalIndex]];
          }
        }

        ctx.putImageData(imageData, 0, 0);

        const blob = await new Promise<Blob>((r) =>
          canvas.toBlob(r, "image/png"),
        );

        const tileURL = URL.createObjectURL(blob);

        // --- Spatial extent ---
        const tileMinX = minX + x0 * pixelWidth;
        const tileMaxX = minX + (x0 + w) * pixelWidth;

        const tileMaxY = maxY - y0 * pixelHeight;
        const tileMinY = maxY - (y0 + h) * pixelHeight;

        const tileExtent: [number, number, number, number] = [
          tileMinX,
          tileMinY,
          tileMaxX,
          tileMaxY,
        ];

        const layer = new ImageLayer({
          source: new ImageStatic({
            url: tileURL,
            imageExtent: tileExtent,
            projection: "EPSG:27700",
            interpolate: false,
          }),
          opacity,
        });

        layers.push(layer);
      }
    }

    console.timeEnd("canvas-indices-mobile-tiles");

    return new LayerGroup({ layers });
  }

  function findTheOnes(indexArrays) {
    console.time("findTheOnes");

    if (!indexArrays.length) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const uniqueArraysWorker = new Worker(
        new URL("$lib/workers/uniqueArraysWorker.js?worker", import.meta.url),
        { type: "module" },
      );

      uniqueArraysWorker.onmessage = (e) => {
        if (e.data.error) {
          uniqueArraysWorker.terminate();
          reject(new Error(e.data.error));
          return;
        }

        uniqueCounts = new Uint32Array(e.data.uniqueCounts);
        uniqueArrays = e.data.uniqueIndicesPerArray.map(
          (buf) => new Uint32Array(buf),
        );

        done = true;

        console.timeEnd("findTheOnes");

        uniqueArraysWorker.terminate();
        resolve();
      };

      uniqueArraysWorker.onerror = (err) => {
        uniqueArraysWorker.terminate();
        reject(err);
      };

      const duplicateIndexArrays = indexArrays.map((l) => new Uint32Array(l));
      const buffers = duplicateIndexArrays.map((arr) => arr.buffer);

      uniqueArraysWorker.postMessage(
        {
          arrays: buffers,
        },
        buffers,
      );
    });
  }

  function renderTileGrid(layerDebug, tileIndex) {
    const coords = layerDebug.expected.map((code) => tileIndex[code]);

    const minX = Math.min(...coords.map((c) => c.grid_x));
    const maxX = Math.max(...coords.map((c) => c.grid_x));
    const minY = Math.min(...coords.map((c) => c.grid_y));
    const maxY = Math.max(...coords.map((c) => c.grid_y));

    const grid = [];

    for (let y = minY; y <= maxY; y++) {
      let row = "";
      for (let x = minX; x <= maxX; x++) {
        const tile = coords.find((c) => c.grid_x === x && c.grid_y === y);
        if (!tile) {
          row += "   ";
          continue;
        }

        const code = tile.code;

        if (layerDebug.loaded.includes(code)) row += "🟩";
        else if (layerDebug.missing.includes(code)) row += "🟥";
        else row += "⬜";
      }
      grid.push(row);
    }

    console.log("\n" + grid.join("\n"));
  }

  async function unpackAndBlendLayers() {
    const runId = ++analysisRunId;

    done = false;
    if (typeof dataURL === "string") URL.revokeObjectURL(dataURL);
    dataURL = null;
    prepareToUnpack();

    const worker = new Worker(
      new URL("$lib/workers/pipelineWorker.js", import.meta.url),
      { type: "module" },
    );

    return new Promise((resolve, reject) => {
      worker.onmessage = async (e) => {
        if (runId !== analysisRunId) {
          worker.terminate();
          resolve(false); // stale run ignored
          return;
        }

        if (e.data.error) {
          console.error("Worker error:", e.data);
          worker.terminate();
          reject(new Error(e.data.error));
          return;
        }

        enrichedLayers = e.data.rasterLayers;
        // console.log({ enrichedLayers });
        currentBitArrays = e.data.rasterLayers.map(
          (l) => new Uint32Array(l.data.buffer),
        );
        blendedArrayLength = e.data.blendedArrayLength;
        policyLensArea = e.data.policyLensArea;
        lensIndices = e.data.lensIndices
          ? new Uint32Array(e.data.lensIndices)
          : null;
        blendedIndices = new Uint32Array(e.data.blendedIndices);
        uniqueCounts = new Uint32Array(e.data.uniqueCounts);
        uniqueArrays = e.data.uniqueArrays.map(
          (buf: ArrayBuffer) => new Uint32Array(buf),
        );

        if (e.data.canvasWidth) {
          width = e.data.canvasWidth;
        }
        if (e.data.canvasHeight) {
          height = e.data.canvasHeight;
        }
        // const debug = e.data.debug;
        // const tileIndex = e.data.tileIndex;
        // globalFrame = e.data.globalFrame;
        // console.log(globalFrame);
        // debug.layers.forEach((layer) => {
        //   console.group(`Layer: ${layer.layer}`);
        //   console.log("Expected:", layer.expected.length);
        //   console.log("Loaded:", layer.loaded.length);
        //   console.log("Missing:", layer.missing.length);
        //   console.log("Missing tiles:", layer.missing);
        //   console.groupEnd();
        //   console.log(`Grid for ${layer.layer}`);
        //   renderTileGrid(layer, tileIndex);
        // });

        // const signature = debug.layers
        //   .map((l) => l.loaded.sort().join(","))
        //   .join("|");

        // console.log("Run signature:", signature);

        worker.terminate();

        if (runId !== analysisRunId) {
          resolve(false);
          return;
        }

        done = true;
        resolve(true);

        if (mobile.current) {
          const rendered = await makeAndPaintCanvasFromIndicesMobile();
          if (runId === analysisRunId) dataURL = rendered;
        } else {
          makeAndPaintCanvasFromIndices();
        }
      };

      worker.onerror = (err) => {
        if (runId === analysisRunId) {
          console.error("Worker failed", err);
        }
        worker.terminate();
        reject(err);
      };

      const safeLayers = layersToUnpack?.map((l) => ({ filename: l.filename }));

      worker.postMessage({
        layersToUnpack: safeLayers,
        base,
        policyLens,
        customArea: new Uint32Array(customArea ? customArea : []).buffer,
        settingsObject:
          gridType === "hectare" ? hectareSettings : tenMetreSettings,
        grid10mVariables,
        transformToGlobal: gridType === "hectare" ? false : true,
        tileCodes: [...tileCodes],
      });
    });
  }

  function downloadUint32Array() {
    const filename = "data.bin";
    if (blendedIndices) {
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
  }

  function downloadSelectedAreaGeoJSON() {
    const filename = "selectedArea.geojson";

    const geojson = new Blob(
      [
        JSON.stringify(
          indicesToGeoJSON(
            blendedIndices,
            width,
            height,
            [bbox[0], bbox[1] + gridSize * height],
            [gridSize, -gridSize],
          ),
        ),
      ],
      {
        type: "application/json",
      },
    );

    const url = URL.createObjectURL(geojson);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  function downloadCustomAreaGeoJSON() {
    const filename = "customArea.geojson";

    const geojson = new Blob([geojsonString], {
      type: "application/json",
    });

    const url = URL.createObjectURL(geojson);

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
    seeBreakdown = false;

    done = true;
    console.timeEnd("show-density");
  }

  const densityStats = $derived.by(() => {
    // $inspect.trace("calculating densityStats");
    return gridType === "hectare"
      ? computeDensityStats(
          breakdownChartSortValue === "total"
            ? policyLensValue === "England" || policyLensValue === "customArea"
              ? customArea
              : lensIndices
            : breakdownChartSortValue === "inverse"
              ? getTheInverse(
                  policyLensValue === "England" ||
                    policyLensValue === "customArea"
                    ? customArea
                    : lensIndices,
                  blendedIndices,
                )
              : blendedIndices,
          densityArray,
          {
            width,
            height,
            colOffset: 0,
          },
        )
      : {
          stats: {
            count: 0,
            sum: 0,
            mean: 0,
            median: 0,
            min: 0,
            max: 0,
            indexOfMaxValue: null,
          },
          histogram: {},
        };
  });

  function showArea() {
    seeDensity = false;
    seeBreakdown = false;
    seeArea = true;
    // breakdownMetric = "LPA";
    console.log("showing area");
  }

  function showBreakdown() {
    seeDensity = false;
    seeBreakdown = true;
    seeArea = false;
    console.log("showing breakdown");
  }

  let tableSectionHeight = $state();
  // $inspect(tableSectionHeight);

  async function closePanelAndScrollToMap() {
    await tick();
    document?.getElementById("map")?.scrollIntoView({
      behavior: "smooth",
    });
    showFilters = false;
  }

  async function openPanelAndScrollToMap() {
    await tick();
    document?.getElementById("map")?.scrollIntoView({
      behavior: "smooth",
    });
    showFilters = true;
  }

  let markerLocation = $derived(
    Object.values(
      indexToCoord(densityStats?.stats?.indexOfMaxValue, {
        width,
        height,
      }),
    ).map((d, i) => d + (i === 0 ? gridSize / 2 : -gridSize / 2)),
  );

  function showMarker() {
    seeMarker = !seeMarker;
  }
  // $effect(() => {
  //   if (currentBitArrays) {
  //     console.log(
  //       getTheInverse(
  //         currentBitArrays[currentBitArrays.length - 1],
  //         currentBitArrays[0],
  //       ),
  //     );
  //   }
  // });
  let LAselectOptions = $derived.by(() => {
    let interim = LAGeoJSON?.features
      .map((d) => d.properties)
      .map((d) => {
        return { value: d.LAD25CD || d.LPA23CD, text: d.LAD25NM || d.LPA23NM };
      })
      .sort((a, b) => a.text.localeCompare(b.text));
    interim?.unshift({ text: "", value: "" });
    return interim;
  });
  $inspect({ LAselectOptions });

  let selectedAreaWording = $derived(
    selectedLA
      ? LAselectOptions.find((d) => d.value === selectedLA)?.["text"]
      : (policyLensItems.find((d) => d.value == policyLensValue)
          ?.sentenceText ??
          '"' + makeFileNameReadable(policyLens, gridType, usingGeoTiff) + '"'),
  );

  type BreakdownDataRow = {
    area_name: string;
    total_area: number;
    [key: string]: string | number | boolean | null | undefined;
  };

  type FeatureBreakdownResult = {
    featureName: string;
    breakdownData: BreakdownDataRow[];
  };

  async function runMultiFeatureBreakdownCsv(
    geojson: GeoJSON.FeatureCollection,
  ): Promise<string> {
    const features = extractValidFeatures(geojson);

    const results: FeatureBreakdownResult[] = [];

    for (const [index, feature] of features.entries()) {
      const featureName = getFeatureName(feature, index);

      downloadingCsvProgress = index / features.length;

      const singleFeatureGeojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [feature],
      };

      const localFeatureGeometry = feature.getGeometry();
      const featureBBox = localFeatureGeometry.getExtent();

      const localTileCodes = tilesForBBox(featureBBox, tileIndex, 50000);
      const localBBox = getBBoxFromTileCodes(localTileCodes, gridSize, 5000);
      const localWidth = (localBBox[2] - localBBox[0]) / gridSize;
      const localHeight = (localBBox[3] - localBBox[1]) / gridSize;

      const localCustomArea = new Uint32Array(
        geometryToGridHitsScanline(
          localFeatureGeometry,
          localBBox,
          localWidth,
          localHeight,
        ),
      );

      const breakdownArray = await loadTiledCategoricalDatasetGlobal({
        tileCodes: localTileCodes,
        globalFrame: computeGlobalTileFrameFromTileCodes(localTileCodes),
        tileWidth: 5000,
        tileIndex,
        sourceFolder: `${base}/data/categorised-land/ownership/10m/`,
      });

      // const breakdownData = refreshBreakdownSummaryForArray({
      //   breakdownArray,
      //   datasetConfig,
      // });

      const selectionMask = indicesToBinaryMask(
        localCustomArea,
        localWidth,
        localHeight,
      );

      const breakdownResult = await getLABreakdown(
        // chunkUrls,
        breakdownArray,
        selectionMask,
        localCustomArea,
        localWidth,
        localHeight,
      );

      const breakdownData: BreakdownDataRow[] = breakdownResult.json.map(
        (d) => {
          return {
            area_name: d.area_name,
            total_area: d.total_area,
            [d.area_name]: d.total_area,
          };
        },
      );

      results.push({
        featureName,
        breakdownData,
      });
    }

    return buildBreakdownCsv(results);
  }

  function extractValidFeatures(geojson: GeoJSON.GeoJSON): GeoJSON.Feature[] {
    const format = new GeoJSON();

    const features = format.readFeatures(geojson, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:27700",
    });

    // if (geojson.type === "FeatureCollection") {
    //   return geojson.features.filter((feature) => feature.geometry !== null);
    // }

    // if (geojson.type === "Feature" && geojson.geometry !== null) {
    //   return [geojson];
    // }

    return [...features];

    throw new Error("Uploaded GeoJSON must be a Feature or FeatureCollection.");
  }

  function getFeatureName(feature: GeoJSON.Feature, index: number): string {
    const props = feature.getProperties() ?? {};

    const rawName =
      props.name ??
      props.Name ??
      props.area_name ??
      props["Location Name"] ??
      feature.id ??
      `Feature ${index + 1}`;

    return props.value
      ? String(rawName).trim() + " (" + props.value + ")"
      : String(rawName).trim() || `Feature ${index + 1}`;
  }

  function buildBreakdownCsv(results: FeatureBreakdownResult[]): string {
    const rawFeatureNames = results.map((result) => result.featureName);
    const featureNames = makeUniqueNames(rawFeatureNames);

    const rowsByAreaName = new Map<string, Record<string, string | number>>();

    for (const [featureIndex, result] of results.entries()) {
      const featureName = featureNames[featureIndex];

      for (const row of result.breakdownData) {
        const areaName = row.area_name;
        const totalArea = row.total_area ?? 0;

        if (!rowsByAreaName.has(areaName)) {
          rowsByAreaName.set(areaName, {
            area_name: areaName,
          });
        }

        rowsByAreaName.get(areaName)![featureName] = convertPixelsToHectares(
          totalArea,
          gridSize,
        );
      }
    }

    const header = ["area_name", ...featureNames];

    const csvRows = [...rowsByAreaName.values()].map((row) => {
      return header
        .map((column) => {
          const value = row[column] ?? 0;
          return escapeCsvValue(value);
        })
        .join(",");
    });

    return [header.map(escapeCsvValue).join(","), ...csvRows].join("\n");
  }

  function escapeCsvValue(value: unknown): string {
    const text = String(value ?? "");

    if (
      text.includes(",") ||
      text.includes('"') ||
      text.includes("\n") ||
      text.includes("\r")
    ) {
      return `"${text.replaceAll('"', '""')}"`;
    }

    return text;
  }

  function makeUniqueNames(names: string[]): string[] {
    const seen = new Map<string, number>();

    return names.map((name) => {
      const count = seen.get(name) ?? 0;
      seen.set(name, count + 1);

      if (count === 0) return name;

      return `${name} (${count + 1})`;
    });
  }

  let downloadingCsv = $state(false);
  let downloadingCsvProgress = $state(0);
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
        <Radios
          legend="Select grid size"
          name="grid-options"
          options={[
            { value: "hectare", label: "hectare" },
            { value: "10m", label: "10m (experimental)" },
          ]}
          bind:selectedValue={gridType}
          legendSize="s"
          small={true}
        />
        <Details
          summaryText={"Refine your area"}
          detailedText={policyLensContent}
        >
          {#snippet policyLensContent()}
            <!-- {#if gridType === "hectare"} -->
            <Select
              id="policyLensInput"
              name="policyLensInput"
              items={policyLensItems.map((d) =>
                startingPosition
                  .map(
                    (e) =>
                      e.filename.split("_")[gridType === "hectare" ? 2 : 1],
                  )
                  .includes(d.value) || d.value === "England"
                  ? { ...d, disabled: false }
                  : { ...d, disabled: true },
              )}
              bind:value={policyLensValue}
              label={"Select area to explore"}
              onchange={async () => {
                // customAreaBBox = undefined;
                // customArea = null;
                drawnFeature = undefined;
                selectedLA = undefined;
                Object.keys(tiffArrayBuffersFromZip).length > 0
                  ? unpackZippedLayers()
                  : // : unpackSelectedLayers();
                    await unpackAndBlendLayers();
                closePanelAndScrollToMap();
              }}
            />
            <p class="or">~ or ~</p>
            <!-- {/if} -->

            <Button
              buttonType="secondary"
              textContent="Draw an area to explore"
              onClickFunction={() => {
                drawing = true;
              }}
            />
            <p class="or">~ or ~</p>
            <label for="geojson-file-upload">Use a local GeoJSON file:</label>
            <input
              accept=".geojson,.json"
              id="geojson-file-upload"
              type="file"
              onchange={async (e) => {
                handleGeoJSONFileUpload(e).then(async () => {
                  Object.keys(tiffArrayBuffersFromZip).length > 0
                    ? unpackZippedLayers()
                    : // : unpackSelectedLayers();
                      await unpackAndBlendLayers();

                  closePanelAndScrollToMap();
                });
              }}
            />
            <p class="or">~ or ~</p>
            <!-- <label for="geojson-area-select">Select a local authority:</label> -->
            {#if LAGeoJSON}
              <!-- <select
                name="geojson-area-select"
                id="geojson-area-select"
                bind:value={selectedLA}
                onchange={async () => await unpackAndBlendLayers()}
              >
                <option></option>
                {#each LAGeoJSON?.features.map((d) => d.properties) as LA}
                  <option value={LA.LAD25CD}>{LA.LAD25NM}</option>
                {/each}
              </select> -->
              <Select
                id="svelte-geojson-area-select"
                name="svelte-geojson-area-select"
                items={LAselectOptions}
                label={"Select a local planning authority:"}
                bind:value={selectedLA}
                onchange={async () => await unpackAndBlendLayers()}
              />
            {/if}
          {/snippet}
        </Details>
        {#if gridType === "hectare"}
          <Details
            summaryText={"Use a local file (optional)"}
            detailedText={detailsContent}
          >
            {#snippet detailsContent()}
              <label for="zip-file-upload">Use a local zip file:</label>
              <input
                bind:files={zipFile}
                accept=".zip"
                id="zip-file-upload"
                type="file"
                onchange={handleFileUpload}
              />
            {/snippet}
          </Details>
        {/if}
      </div>
    </div>
  </div>

  <div>
    <div class="header-right">
      {#key startingPosition}
        <FilterChipParent
          {gridType}
          {usingGeoTiff}
          {startingPosition}
          {selectedSubLayers}
          bind:selected
          bind:policyLens
          {openPanelAndScrollToMap}
          {categoryToColor}
          {tableData}
          on:itemRemoved={() => {
            // console.log(startingPosition);
            startingPosition.forEach((d) =>
              // selected.includes(d.filename) || policyLens === d.filename
              selected.includes(makeFileNameDatasetKey(d.filename)) // Fix for the above line, which was including the policyLens in any new selections
                ? (d.initiallyChecked = true)
                : (d.initiallyChecked = false),
            );
            startingPosition; // Trigger $state() reactivity update
            // done = false;
            blendLayers();
          }}
          on:lensChanged={async () => {
            // console.log(startingPosition);
            startingPosition.forEach((d) =>
              selected.includes(makeFileNameDatasetKey(d.filename)) ||
              policyLens === d.filename
                ? (d.initiallyChecked = true)
                : (d.initiallyChecked = false),
            );
            Object.keys(tiffArrayBuffersFromZip).length > 0
              ? unpackZippedLayers()
              : // : unpackSelectedLayers();
                await unpackAndBlendLayers();
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
    bind:clientWidth={sidePanelWidth}
  >
    {#if startingPosition}
      <form
        method="POST"
        use:enhance={async ({ formData, cancel }) => {
          selected = [];
          formData.forEach((d) => selected.push(makeFileNameDatasetKey(d)));

          closePanelAndScrollToMap();

          Object.keys(tiffArrayBuffersFromZip).length > 0
            ? unpackZippedLayers()
            : // : unpackSelectedLayers();
              await unpackAndBlendLayers();
          // selected = formData.getAll("categories[]");

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
          // dataURL = null;
          // if (oldDataURL) {
          if (typeof dataURL === "string") URL.revokeObjectURL(dataURL);
          // }
          dataURL = null;

          startingPosition.forEach((d) => (d.initiallyChecked = false));
          // bbox = null;
          // console.log(startingPosition, selected);
        }}
      />
      <Button
        buttonType="link"
        textContent="Select all filters"
        onClickFunction={async () => {
          startingPosition.forEach((d) =>
            d.level == 3
              ? (d.initiallyChecked = true)
              : (d.initiallyChecked = false),
          );

          selected = startingPosition
            .filter((d) => d.initiallyChecked === true)
            .map((d) => makeFileNameDatasetKey(d.filename));

          closePanelAndScrollToMap();

          Object.keys(tiffArrayBuffersFromZip).length > 0
            ? unpackZippedLayers()
            : // : unpackSelectedLayers();
              await unpackAndBlendLayers();
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
        {console.log("Rendering the map!")}

        <div id="map" class={["os-map-container", { done }]}>
          {#key mobile.current}
            <OsMap
              {dataURL}
              {densityDataURL}
              {breakdownDataURL}
              {densityMetric}
              {bbox}
              {breakdownData}
              {breakdownMetric}
              blendedIndices={breakdownChartSortValue === "total"
                ? policyLensValue === "England" ||
                  policyLensValue === "customArea"
                  ? customArea
                  : lensIndices
                : breakdownChartSortValue === "inverse"
                  ? getTheInverse(
                      policyLensValue === "England" ||
                        policyLensValue === "customArea"
                        ? customArea
                        : lensIndices,
                      blendedIndices,
                    )
                  : blendedIndices}
              {seeDensity}
              {seeArea}
              {seeBreakdown}
              {width}
              {height}
              bind:opacity
              {densityArray}
              {breakdownArray}
              {customAreaBBox}
              bind:drawnFeature
              bind:selectedLA
              bind:policyLensValue
              bind:drawing
              {mobile}
              {gridType}
              {markerLocation}
              {seeMarker}
              {tileCodes}
              {tileIndex}
              {sidePanelEffectiveWidth}
            />
          {/key}
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
        bind:selectedTabId
        tabs={gridType === "hectare"
          ? [
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
              {
                id: "breakdown",
                label: "Breakdown",
                content: breakdownSnippet,
              },
            ]
          : [
              {
                id: "table",
                label: "Results",
                content: tableSnippet,
              },
              {
                id: "breakdown",
                label: "Breakdown",
                content: breakdownSnippet,
              },
            ]}
        {showDensity}
        {showArea}
        {showBreakdown}
        forceTabBehavior={true}
      />
      <!-- {#snippet namedAreaSnippet()}
        {selectedLA
          ? LAselectOptions.find((d) => d.value === selectedLA)["text"]
          : (policyLensItems.find((d) => d.value == policyLens)?.sentenceText ??
            '"' + makeFileNameReadable(policyLens, gridType) + '"')}
      {/snippet} -->
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
              The total area in England within {selectedAreaWording}
              is
              {convertPixelsToHectares(
                policyLensArea,
                gridSize,
              ).toLocaleString()}
              ha.
            </p>
          {/if}
        </div>
        {#if policyLens !== "England"}
          <h2>
            Within <span class="lens-area">{selectedAreaWording}</span>
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
                gridSize,
              ).toLocaleString()} hectares with the current selections, or about
              <b>{((blendedArrayLength / policyLensArea) * 100).toFixed(0)}%</b>
              of
              {selectedAreaWording}, which means that {convertPixelsToHectares(
                policyLensArea - blendedArrayLength,
                gridSize,
              ).toLocaleString()} hectares ({(
                ((policyLensArea - blendedArrayLength) / policyLensArea) *
                100
              ).toFixed(0)}%) of {selectedAreaWording} is not in the area covered
              by the current selections.
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
                {mobile}
              />
              <Button
                buttonType="default"
                textContent="Download data (.csv)"
                onClickFunction={function () {
                  const csvStr = jsonToCsv(
                    tableData,
                    // policyLens,
                    // policyLensItems,
                    selectedAreaWording,
                    selected,
                    gridType,
                    usingGeoTiff,
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
              {#if gridType === "hectare"}
                <Button
                  buttonType="default"
                  textContent="Download Local Authority breakdown of data (.csv)"
                  onClickFunction={function () {
                    if (blendedIndices.length === 0) return;

                    const csvStr = jsonToCsv(
                      breakdownData,
                      // policyLens,
                      // policyLensItems,
                      selectedAreaWording,
                      selected,
                      gridType,
                      usingGeoTiff,
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
              {/if}

              <Button
                buttonType="secondary"
                textContent="Download the selected area shape (.bin)"
                onClickFunction={downloadUint32Array}
              />
              <Button
                buttonType="secondary"
                textContent="Download the selected area shape (.geojson)"
                onClickFunction={downloadSelectedAreaGeoJSON}
              />
              <Button
                buttonType="secondary"
                textContent="Download the custom area shape (.geojson)"
                onClickFunction={downloadCustomAreaGeoJSON}
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
        <Select
          id="densitySelect"
          name="density select"
          items={[
            // { value: "titles", text: "titles" },
            { value: "dwellings", text: "Dwellings" },
            { value: "business addresses", text: "Business addresses" },
            { value: "population 2025-26", text: "Population 2025-26" },
            { value: "population 2049-50", text: "Population 2049-50" },
            {
              value: "water",
              text: "Water, baseline supply demand balance 2024",
            },
            {
              value: "water-wrz",
              text: "Water by WRZ, baseline supply demand balance 2024",
            },
            {
              value: "water-wrz-2049",
              text: "Water by WRZ, baseline supply demand balance 2049",
            },
          ]}
          label={"Select the dataset"}
          bind:value={densityMetric}
        />
        <Radios
          legend={"View the breakdown " +
            (policyLens !== "England"
              ? "(within " + selectedAreaWording + ")"
              : "") +
            " by:"}
          legendSize="s"
          name="density-value"
          bind:selectedValue={breakdownChartSortValue}
          small
          options={[
            { value: "total", label: "Total area" },
            {
              value: "selected",
              label: "Area covered by the selected categories",
            },
            {
              value: "inverse",
              label: "Area NOT covered by the selected categories",
            },
          ]}
        ></Radios>
        {#if blendedIndices.length > 0}
          <p>{capitaliseFirst(densityMetric)} density for the selected area.</p>
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
              )).toLocaleString()}
              {densityMetric}
            </div>
            <div>
              Density is {densityStats.stats.mean.toFixed(2)}
              {densityMetric} per hectare
            </div>
            <div>
              The median hectare's number of {densityMetric} is {densityStats.stats.median.toFixed(
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
            <div>
              <Button
                buttonType="secondary"
                textContent={seeMarker ? "Hide where" : "Show me where"}
                onClickFunction={showMarker}
              />
            </div>

            <Histogram histogram={densityStats.histogram} {DENSITY_LUT} />
          {:else}
            <Spinner />
          {/if}
        {/if}
      {/snippet}
      {#snippet breakdownSnippet()}
        <Select
          id="breakdownSelect"
          name="breakdown select"
          items={[
            // { value: "titles", text: "titles" },
            { value: "LPA", text: "LPAs" },
            { value: "ownership", text: "Land ownership" },
          ]}
          label={"Select the dataset"}
          bind:value={breakdownMetric}
        />
        <Radios
          legend={"View the breakdown " +
            (policyLens !== "England"
              ? "(within " + selectedAreaWording + ")"
              : "") +
            " by:"}
          legendSize="s"
          name="breakdown-chart"
          bind:selectedValue={breakdownChartSortValue}
          small
          options={[
            { value: "total", label: "Total area" },
            {
              value: "selected",
              label: "Area covered by the selected categories",
            },
            {
              value: "inverse",
              label: "Area NOT covered by the selected categories",
            },
            {
              value: "proportion",
              label:
                "Percentage of the total that is covered by the selected categories",
            },
          ]}
        ></Radios>
        {#if breakdownChartSortValue === "proportion"}
          <div class="split-bar-header">
            <div>Owner</div>
            <div>Percentage restricted</div>
          </div>
          {#each summaryByCategory as [key, value]}
            {@const barWidth =
              breakdownChartSortValue === "selected"
                ? value.selected / summaryByCategoryMaxValue.selected
                : breakdownChartSortValue === "total"
                  ? value.total / summaryByCategoryMaxValue.total
                  : (value.selected / value.total ?? 0)}
            {#if value.selected}
              <div class="mosaic-row">
                <div class="mosaic-row-label">
                  {key
                    .split(".")
                    [key.split(".").length - 1].replaceAll("_", " ")}
                </div>
                <div class="mosaic-row-bar">
                  <div
                    class="mosaic-row-bar-inner"
                    style:width="{barWidth * 100}%"
                    style:background-color={value.color}
                  >
                    <!-- {barWidth} -->
                  </div>
                </div>
                {breakdownChartSortValue === "selected"
                  ? value.selected.toLocaleString() + " ha"
                  : breakdownChartSortValue === "total"
                    ? value.total.toLocaleString() + " ha"
                    : ((value.selected / value.total) * 100).toFixed(1) + "%"}
              </div>
            {/if}
          {:else}
            <p>{summaryByCategory}</p>
          {/each}
        {/if}
        {#if doughnutChartData.length > 0 && breakdownChartSortValue !== "proportion"}
          <DoughnutChart
            data={doughnutChartData}
            title={breakdownChartSortValue}
            {gridSize}
          />
        {/if}
        <!-- <Button
          buttonType="secondary"
          textContent="Get breakdown from geoJSON"
        /> -->
        {#if gridType !== "hectare"}
          <label for="multi-geojson-file-upload"
            >Get breakdown from geoJSON:</label
          >
          <!-- <input
            accept=".geojson,.json"
            id="multi-geojson-file-upload"
            type="file"
            onchange={async (e) => {
              const multiFeatureGeoJSON = await e.target.files[0].text();
              downloadingCsv = true;
              console.log(e.target.files[0].name.split(".")[0]);
              const fileName = e.target.files[0].name.split(".")[0];
              runMultiFeatureBreakdownCsv(multiFeatureGeoJSON).then(
                (result) => {
                  downloadCsv(result, fileName);
                  downloadingCsv = false;
                },
              );
            }}
          /> -->
          <input
            accept=".geojson,.json"
            id="multi-geojson-file-upload"
            type="file"
            multiple
            onchange={async (e) => {
              downloadingCsv = true;

              try {
                const files = Array.from(e.target.files);

                for (const file of files) {
                  console.log(file.name);

                  const multiFeatureGeoJSON = await file.text();
                  const fileName = file.name.split(".")[0];

                  const result =
                    await runMultiFeatureBreakdownCsv(multiFeatureGeoJSON);

                  downloadCsv(result, fileName);
                }
              } finally {
                downloadingCsv = false;
              }
            }}
          />
          <br />
          {#if downloadingCsv}
            <label for="creating-breakdown-csv">Downloading progress:</label>
            <progress
              id="creating-breakdown-csv"
              value={downloadingCsvProgress}
              max="1">{downloadingCsvProgress * 100}%</progress
            >
          {/if}
        {/if}
      {/snippet}
    </div>
  </div>
</div>

<!-- <iframe
  src="https://www.ons.gov.uk/visualisations/customprofiles/embed/#/?name=&comp=RW5nbGFuZA==&tabs=W3siY29kZSI6InBvcHVsYXRpb25fbXllIiwiZGF0YSI6W3siYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJBbGwgQWdlcyIsInZhbHVlIjoxMDAsIm9yaWdpbmFsVmFsdWUiOjMxNSwiY291bnQiOjMxNSwicGVyY2VudGFnZSI6MTAwfSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJBbGwgQWdlcyIsInZhbHVlIjoxMDAsIm9yaWdpbmFsVmFsdWUiOjU4NjIwMTAxLCJjb3VudCI6NTg2MjAxMDEsInBlcmNlbnRhZ2UiOjEwMH1dfSx7ImNvZGUiOiJob3VzZWhvbGRzIiwiZGF0YSI6W3siYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJOdW1iZXIgb2YgaG91c2Vob2xkcyIsInZhbHVlIjoxMjYsImNvdW50IjoxMjYsIm9yaWdpbmFsVmFsdWUiOjEyNn0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiTnVtYmVyIG9mIGhvdXNlaG9sZHMiLCJ2YWx1ZSI6MjM0MzYwODUsImNvdW50IjoyMzQzNjA4NSwib3JpZ2luYWxWYWx1ZSI6MjM0MzYwODV9XX0seyJjb2RlIjoicmVzaWRlbnRfYWdlX215ZSIsImRhdGEiOlt7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiQWdlIDAgLSA0IiwidmFsdWUiOjEuMywib3JpZ2luYWxWYWx1ZSI6NCwiY291bnQiOjQsInBlcmNlbnRhZ2UiOjEuM30seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IkFnZWQgNS05IiwidmFsdWUiOjQuOCwib3JpZ2luYWxWYWx1ZSI6MTUsImNvdW50IjoxNSwicGVyY2VudGFnZSI6NC44fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiQWdlZCAxMC0xNCIsInZhbHVlIjo1LjEsIm9yaWdpbmFsVmFsdWUiOjE2LCJjb3VudCI6MTYsInBlcmNlbnRhZ2UiOjUuMX0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IkFnZWQgMTUtMTkiLCJ2YWx1ZSI6Ny45LCJvcmlnaW5hbFZhbHVlIjoyNSwiY291bnQiOjI1LCJwZXJjZW50YWdlIjo3Ljl9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJBZ2VkIDIwLTI0IiwidmFsdWUiOjUuMSwib3JpZ2luYWxWYWx1ZSI6MTYsImNvdW50IjoxNiwicGVyY2VudGFnZSI6NS4xfSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiQWdlZCAyNS0yOSIsInZhbHVlIjo1LjQsIm9yaWdpbmFsVmFsdWUiOjE3LCJjb3VudCI6MTcsInBlcmNlbnRhZ2UiOjUuNH0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IkFnZWQgMzAtMzQiLCJ2YWx1ZSI6Mi45LCJvcmlnaW5hbFZhbHVlIjo5LCJjb3VudCI6OSwicGVyY2VudGFnZSI6Mi45fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiQWdlZCAzNS0zOSIsInZhbHVlIjozLjIsIm9yaWdpbmFsVmFsdWUiOjEwLCJjb3VudCI6MTAsInBlcmNlbnRhZ2UiOjMuMn0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IkFnZWQgNDAtNDQiLCJ2YWx1ZSI6NC4xLCJvcmlnaW5hbFZhbHVlIjoxMywiY291bnQiOjEzLCJwZXJjZW50YWdlIjo0LjF9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJBZ2VkIDQ1LTQ5IiwidmFsdWUiOjkuNSwib3JpZ2luYWxWYWx1ZSI6MzAsImNvdW50IjozMCwicGVyY2VudGFnZSI6OS41fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiQWdlZCA1MC01NCIsInZhbHVlIjoxMS43LCJvcmlnaW5hbFZhbHVlIjozNywiY291bnQiOjM3LCJwZXJjZW50YWdlIjoxMS43fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiQWdlZCA1NS01OSIsInZhbHVlIjoxMi4xLCJvcmlnaW5hbFZhbHVlIjozOCwiY291bnQiOjM4LCJwZXJjZW50YWdlIjoxMi4xfSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiQWdlZCA2MC02NCIsInZhbHVlIjo4LjksIm9yaWdpbmFsVmFsdWUiOjI4LCJjb3VudCI6MjgsInBlcmNlbnRhZ2UiOjguOX0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IkFnZWQgNjUtNjkiLCJ2YWx1ZSI6NC44LCJvcmlnaW5hbFZhbHVlIjoxNSwiY291bnQiOjE1LCJwZXJjZW50YWdlIjo0Ljh9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJBZ2VkIDcwLTc0IiwidmFsdWUiOjIuNSwib3JpZ2luYWxWYWx1ZSI6OCwiY291bnQiOjgsInBlcmNlbnRhZ2UiOjIuNX0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IkFnZWQgNzUtNzkiLCJ2YWx1ZSI6Niwib3JpZ2luYWxWYWx1ZSI6MTksImNvdW50IjoxOSwicGVyY2VudGFnZSI6Nn0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IkFnZWQgODAtODQiLCJ2YWx1ZSI6Mi45LCJvcmlnaW5hbFZhbHVlIjo5LCJjb3VudCI6OSwicGVyY2VudGFnZSI6Mi45fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiQWdlZCA4NSsiLCJ2YWx1ZSI6MS45LCJvcmlnaW5hbFZhbHVlIjo2LCJjb3VudCI6NiwicGVyY2VudGFnZSI6MS45fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJBZ2UgMCAtIDQiLCJ2YWx1ZSI6NS4yLCJvcmlnaW5hbFZhbHVlIjozMDcyMjQzLCJjb3VudCI6MzA3MjI0MywicGVyY2VudGFnZSI6NS4yfSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJBZ2VkIDUtOSIsInZhbHVlIjo1LjgsIm9yaWdpbmFsVmFsdWUiOjM0MDE3MjQsImNvdW50IjozNDAxNzI0LCJwZXJjZW50YWdlIjo1Ljh9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IkFnZWQgMTAtMTQiLCJ2YWx1ZSI6Ni4xLCJvcmlnaW5hbFZhbHVlIjozNTgxNzMyLCJjb3VudCI6MzU4MTczMiwicGVyY2VudGFnZSI6Ni4xfSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJBZ2VkIDE1LTE5IiwidmFsdWUiOjYsIm9yaWdpbmFsVmFsdWUiOjM1MDkxNTUsImNvdW50IjozNTA5MTU1LCJwZXJjZW50YWdlIjo2fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJBZ2VkIDIwLTI0IiwidmFsdWUiOjYsIm9yaWdpbmFsVmFsdWUiOjM1MjYwMTgsImNvdW50IjozNTI2MDE4LCJwZXJjZW50YWdlIjo2fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJBZ2VkIDI1LTI5IiwidmFsdWUiOjYuNiwib3JpZ2luYWxWYWx1ZSI6Mzg4NTU3MSwiY291bnQiOjM4ODU1NzEsInBlcmNlbnRhZ2UiOjYuNn0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiQWdlZCAzMC0zNCIsInZhbHVlIjo3LCJvcmlnaW5hbFZhbHVlIjo0MTAxMTQ0LCJjb3VudCI6NDEwMTE0NCwicGVyY2VudGFnZSI6N30seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiQWdlZCAzNS0zOSIsInZhbHVlIjo2LjksIm9yaWdpbmFsVmFsdWUiOjQwNzM0NTgsImNvdW50Ijo0MDczNDU4LCJwZXJjZW50YWdlIjo2Ljl9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IkFnZWQgNDAtNDQiLCJ2YWx1ZSI6Ni42LCJvcmlnaW5hbFZhbHVlIjozODU1MjgwLCJjb3VudCI6Mzg1NTI4MCwicGVyY2VudGFnZSI6Ni42fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJBZ2VkIDQ1LTQ5IiwidmFsdWUiOjUuOSwib3JpZ2luYWxWYWx1ZSI6MzQ3OTc2NywiY291bnQiOjM0Nzk3NjcsInBlcmNlbnRhZ2UiOjUuOX0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiQWdlZCA1MC01NCIsInZhbHVlIjo2LjQsIm9yaWdpbmFsVmFsdWUiOjM3Mjg3OTgsImNvdW50IjozNzI4Nzk4LCJwZXJjZW50YWdlIjo2LjR9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IkFnZWQgNTUtNTkiLCJ2YWx1ZSI6Ni42LCJvcmlnaW5hbFZhbHVlIjozODYxMzQwLCJjb3VudCI6Mzg2MTM0MCwicGVyY2VudGFnZSI6Ni42fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJBZ2VkIDYwLTY0IiwidmFsdWUiOjYuMSwib3JpZ2luYWxWYWx1ZSI6MzU2Mjc3OSwiY291bnQiOjM1NjI3NzksInBlcmNlbnRhZ2UiOjYuMX0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiQWdlZCA2NS02OSIsInZhbHVlIjo1LCJvcmlnaW5hbFZhbHVlIjoyOTUxNjQyLCJjb3VudCI6Mjk1MTY0MiwicGVyY2VudGFnZSI6NX0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiQWdlZCA3MC03NCIsInZhbHVlIjo0LjQsIm9yaWdpbmFsVmFsdWUiOjI1NjgzMDgsImNvdW50IjoyNTY4MzA4LCJwZXJjZW50YWdlIjo0LjR9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IkFnZWQgNzUtNzkiLCJ2YWx1ZSI6NC4yLCJvcmlnaW5hbFZhbHVlIjoyNDMzOTk1LCJjb3VudCI6MjQzMzk5NSwicGVyY2VudGFnZSI6NC4yfSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJBZ2VkIDgwLTg0IiwidmFsdWUiOjIuNiwib3JpZ2luYWxWYWx1ZSI6MTU0MzEzNSwiY291bnQiOjE1NDMxMzUsInBlcmNlbnRhZ2UiOjIuNn0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiQWdlZCA4NSsiLCJ2YWx1ZSI6Mi41LCJvcmlnaW5hbFZhbHVlIjoxNDg0MDEyLCJjb3VudCI6MTQ4NDAxMiwicGVyY2VudGFnZSI6Mi41fV19LHsiY29kZSI6InNleF9teWUiLCJkYXRhIjpbeyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IkZlbWFsZSIsInZhbHVlIjo1MS40LCJvcmlnaW5hbFZhbHVlIjoxNjIsImNvdW50IjoxNjIsInBlcmNlbnRhZ2UiOjUxLjR9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJNYWxlIiwidmFsdWUiOjQ4LjYsIm9yaWdpbmFsVmFsdWUiOjE1MywiY291bnQiOjE1MywicGVyY2VudGFnZSI6NDguNn0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiRmVtYWxlIiwidmFsdWUiOjUxLCJvcmlnaW5hbFZhbHVlIjoyOTg5NTc2MiwiY291bnQiOjI5ODk1NzYyLCJwZXJjZW50YWdlIjo1MX0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiTWFsZSIsInZhbHVlIjo0OSwib3JpZ2luYWxWYWx1ZSI6Mjg3MjQzMzksImNvdW50IjoyODcyNDMzOSwicGVyY2VudGFnZSI6NDl9XX0seyJjb2RlIjoibGVnYWxfcGFydG5lcnNoaXBfc3RhdHVzIiwiZGF0YSI6W3siYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJOZXZlciBtYXJyaWVkIGFuZCBuZXZlciByZWdpc3RlcmVkIGEgY2l2aWwgcGFydG5lcnNoaXAiLCJ2YWx1ZSI6MjQuNSwiY291bnQiOjY2LCJwZXJjZW50YWdlIjoyNC41LCJvcmlnaW5hbFZhbHVlIjoyNC41fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiTWFycmllZCBvciBpbiBhIHJlZ2lzdGVyZWQgY2l2aWwgcGFydG5lcnNoaXAiLCJ2YWx1ZSI6NTYuMSwiY291bnQiOjE1MSwicGVyY2VudGFnZSI6NTYuMSwib3JpZ2luYWxWYWx1ZSI6NTYuMX0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IlNlcGFyYXRlZCwgYnV0IHN0aWxsIGxlZ2FsbHkgbWFycmllZCBvciBzdGlsbCBsZWdhbGx5IGluIGEgY2l2aWwgcGFydG5lcnNoaXAiLCJ2YWx1ZSI6MS45LCJjb3VudCI6NSwicGVyY2VudGFnZSI6MS45LCJvcmlnaW5hbFZhbHVlIjoxLjl9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJEaXZvcmNlZCBvciBjaXZpbCBwYXJ0bmVyc2hpcCBkaXNzb2x2ZWQiLCJ2YWx1ZSI6MTEuOSwiY291bnQiOjMyLCJwZXJjZW50YWdlIjoxMS45LCJvcmlnaW5hbFZhbHVlIjoxMS45fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiV2lkb3dlZCBvciBzdXJ2aXZpbmcgY2l2aWwgcGFydG5lcnNoaXAgcGFydG5lciIsInZhbHVlIjo1LjYsImNvdW50IjoxNSwicGVyY2VudGFnZSI6NS42LCJvcmlnaW5hbFZhbHVlIjo1LjZ9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6Ik5ldmVyIG1hcnJpZWQgYW5kIG5ldmVyIHJlZ2lzdGVyZWQgYSBjaXZpbCBwYXJ0bmVyc2hpcCIsInZhbHVlIjozNy45LCJjb3VudCI6MTc0NTAxMjIsInBlcmNlbnRhZ2UiOjM3LjksIm9yaWdpbmFsVmFsdWUiOjM3Ljl9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6Ik1hcnJpZWQgb3IgaW4gYSByZWdpc3RlcmVkIGNpdmlsIHBhcnRuZXJzaGlwIiwidmFsdWUiOjQ0LjcsImNvdW50IjoyMDU2MTY0MiwicGVyY2VudGFnZSI6NDQuNywib3JpZ2luYWxWYWx1ZSI6NDQuN30seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiU2VwYXJhdGVkLCBidXQgc3RpbGwgbGVnYWxseSBtYXJyaWVkIG9yIHN0aWxsIGxlZ2FsbHkgaW4gYSBjaXZpbCBwYXJ0bmVyc2hpcCIsInZhbHVlIjoyLjIsImNvdW50IjoxMDMzNTE4LCJwZXJjZW50YWdlIjoyLjIsIm9yaWdpbmFsVmFsdWUiOjIuMn0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiRGl2b3JjZWQgb3IgY2l2aWwgcGFydG5lcnNoaXAgZGlzc29sdmVkIiwidmFsdWUiOjkuMSwiY291bnQiOjQxNzE2MzksInBlcmNlbnRhZ2UiOjkuMSwib3JpZ2luYWxWYWx1ZSI6OS4xfSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJXaWRvd2VkIG9yIHN1cnZpdmluZyBjaXZpbCBwYXJ0bmVyc2hpcCBwYXJ0bmVyIiwidmFsdWUiOjYuMSwiY291bnQiOjI3OTAwMzYsInBlcmNlbnRhZ2UiOjYuMSwib3JpZ2luYWxWYWx1ZSI6Ni4xfV19LHsiY29kZSI6ImNvdW50cnlfb2ZfYmlydGgiLCJkYXRhIjpbeyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IkJvcm4gaW4gdGhlIFVLIiwidmFsdWUiOjk2LCJjb3VudCI6MzA4LCJwZXJjZW50YWdlIjo5Niwib3JpZ2luYWxWYWx1ZSI6OTZ9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJCb3JuIG91dHNpZGUgdGhlIFVLIiwidmFsdWUiOjQsImNvdW50IjoxMywicGVyY2VudGFnZSI6NCwib3JpZ2luYWxWYWx1ZSI6NH0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiQm9ybiBpbiB0aGUgVUsiLCJ2YWx1ZSI6ODIuNiwiY291bnQiOjQ2Njg3NTA2LCJwZXJjZW50YWdlIjo4Mi42LCJvcmlnaW5hbFZhbHVlIjo4Mi42fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJCb3JuIG91dHNpZGUgdGhlIFVLIiwidmFsdWUiOjE3LjQsImNvdW50Ijo5ODAyNTQzLCJwZXJjZW50YWdlIjoxNy40LCJvcmlnaW5hbFZhbHVlIjoxNy40fV19LHsiY29kZSI6InBhc3Nwb3J0c19hbGwiLCJkYXRhIjpbeyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IlVLIHBhc3Nwb3J0IiwidmFsdWUiOjg5LjcsImNvdW50IjoyODgsInBlcmNlbnRhZ2UiOjg5LjcsIm9yaWdpbmFsVmFsdWUiOjg5Ljd9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJOb24tVUsgcGFzc3BvcnQiLCJ2YWx1ZSI6MS45LCJjb3VudCI6NiwicGVyY2VudGFnZSI6MS45LCJvcmlnaW5hbFZhbHVlIjoxLjl9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJObyBwYXNzcG9ydCBoZWxkIiwidmFsdWUiOjguNCwiY291bnQiOjI3LCJwZXJjZW50YWdlIjo4LjQsIm9yaWdpbmFsVmFsdWUiOjguNH0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiVUsgcGFzc3BvcnQiLCJ2YWx1ZSI6NzYuNiwiY291bnQiOjQzMjg4Njg2LCJwZXJjZW50YWdlIjo3Ni42LCJvcmlnaW5hbFZhbHVlIjo3Ni42fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJOb24tVUsgcGFzc3BvcnQiLCJ2YWx1ZSI6MTAuMiwiY291bnQiOjU3NjQ4NTgsInBlcmNlbnRhZ2UiOjEwLjIsIm9yaWdpbmFsVmFsdWUiOjEwLjJ9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6Ik5vIHBhc3Nwb3J0IGhlbGQiLCJ2YWx1ZSI6MTMuMiwiY291bnQiOjc0MzY1MDMsInBlcmNlbnRhZ2UiOjEzLjIsIm9yaWdpbmFsVmFsdWUiOjEzLjJ9XX0seyJjb2RlIjoicmVzaWRlbmNlX2xlbmd0aCIsImRhdGEiOlt7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiQm9ybiBpbiB0aGUgVUsiLCJ2YWx1ZSI6OTYsImNvdW50IjozMDgsInBlcmNlbnRhZ2UiOjk2LCJvcmlnaW5hbFZhbHVlIjo5Nn0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IjEwIHllYXJzIG9yIG1vcmUiLCJ2YWx1ZSI6My43LCJjb3VudCI6MTIsInBlcmNlbnRhZ2UiOjMuNywib3JpZ2luYWxWYWx1ZSI6My43fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiNSB5ZWFycyBvciBtb3JlLCBidXQgbGVzcyB0aGFuIDEwIHllYXJzIiwidmFsdWUiOjAsImNvdW50IjowLCJwZXJjZW50YWdlIjowLCJvcmlnaW5hbFZhbHVlIjowfSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiMiB5ZWFycyBvciBtb3JlLCBidXQgbGVzcyB0aGFuIDUgeWVhcnMiLCJ2YWx1ZSI6MCwiY291bnQiOjAsInBlcmNlbnRhZ2UiOjAsIm9yaWdpbmFsVmFsdWUiOjB9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJMZXNzIHRoYW4gMiB5ZWFycyIsInZhbHVlIjowLjMsImNvdW50IjoxLCJwZXJjZW50YWdlIjowLjMsIm9yaWdpbmFsVmFsdWUiOjAuM30seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiQm9ybiBpbiB0aGUgVUsiLCJ2YWx1ZSI6ODIuNiwiY291bnQiOjQ2Njg3NTA2LCJwZXJjZW50YWdlIjo4Mi42LCJvcmlnaW5hbFZhbHVlIjo4Mi42fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiIxMCB5ZWFycyBvciBtb3JlIiwidmFsdWUiOjEwLjEsImNvdW50Ijo1NzA4NzYwLCJwZXJjZW50YWdlIjoxMC4xLCJvcmlnaW5hbFZhbHVlIjoxMC4xfSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiI1IHllYXJzIG9yIG1vcmUsIGJ1dCBsZXNzIHRoYW4gMTAgeWVhcnMiLCJ2YWx1ZSI6MywiY291bnQiOjE2OTk5MzgsInBlcmNlbnRhZ2UiOjMsIm9yaWdpbmFsVmFsdWUiOjN9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IjIgeWVhcnMgb3IgbW9yZSwgYnV0IGxlc3MgdGhhbiA1IHllYXJzIiwidmFsdWUiOjIuMywiY291bnQiOjEyOTUzOTAsInBlcmNlbnRhZ2UiOjIuMywib3JpZ2luYWxWYWx1ZSI6Mi4zfSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJMZXNzIHRoYW4gMiB5ZWFycyIsInZhbHVlIjoxLjksImNvdW50IjoxMDk4NDU0LCJwZXJjZW50YWdlIjoxLjksIm9yaWdpbmFsVmFsdWUiOjEuOX1dfSx7ImNvZGUiOiJoaF9zaXplIiwiZGF0YSI6W3siYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiIxIHBlcnNvbiBpbiBob3VzZWhvbGQiLCJ2YWx1ZSI6MTcuMywiY291bnQiOjIyLCJwZXJjZW50YWdlIjoxNy4zLCJvcmlnaW5hbFZhbHVlIjoxNy4zfSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiMiBwZW9wbGUgaW4gaG91c2Vob2xkIiwidmFsdWUiOjM4LjYsImNvdW50Ijo0OSwicGVyY2VudGFnZSI6MzguNiwib3JpZ2luYWxWYWx1ZSI6MzguNn0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IjMgcGVvcGxlIGluIGhvdXNlaG9sZCIsInZhbHVlIjoyMiwiY291bnQiOjI4LCJwZXJjZW50YWdlIjoyMiwib3JpZ2luYWxWYWx1ZSI6MjJ9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiI0IG9yIG1vcmUgcGVvcGxlIGluIGhvdXNlaG9sZCIsInZhbHVlIjoyMiwiY291bnQiOjI4LCJwZXJjZW50YWdlIjoyMiwib3JpZ2luYWxWYWx1ZSI6MjJ9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IjEgcGVyc29uIGluIGhvdXNlaG9sZCIsInZhbHVlIjozMC4xLCJjb3VudCI6NzA1MjIzMiwicGVyY2VudGFnZSI6MzAuMSwib3JpZ2luYWxWYWx1ZSI6MzAuMX0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiMiBwZW9wbGUgaW4gaG91c2Vob2xkIiwidmFsdWUiOjM0LCJjb3VudCI6Nzk3ODQ5NywicGVyY2VudGFnZSI6MzQsIm9yaWdpbmFsVmFsdWUiOjM0fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiIzIHBlb3BsZSBpbiBob3VzZWhvbGQiLCJ2YWx1ZSI6MTYsImNvdW50IjozNzQyODg3LCJwZXJjZW50YWdlIjoxNiwib3JpZ2luYWxWYWx1ZSI6MTZ9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IjQgb3IgbW9yZSBwZW9wbGUgaW4gaG91c2Vob2xkIiwidmFsdWUiOjE5LjksImNvdW50Ijo0NjYyNDc0LCJwZXJjZW50YWdlIjoxOS45LCJvcmlnaW5hbFZhbHVlIjoxOS45fV19LHsiY29kZSI6ImhoX2ZhbWlseV9jb21wb3NpdGlvbiIsImRhdGEiOlt7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiT25lLXBlcnNvbiBob3VzZWhvbGQiLCJ2YWx1ZSI6MTcuMywiY291bnQiOjIyLCJwZXJjZW50YWdlIjoxNy4zLCJvcmlnaW5hbFZhbHVlIjoxNy4zfSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiU2luZ2xlIGZhbWlseSBob3VzZWhvbGQiLCJ2YWx1ZSI6NzUuNiwiY291bnQiOjk2LCJwZXJjZW50YWdlIjo3NS42LCJvcmlnaW5hbFZhbHVlIjo3NS42fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiT3RoZXIgaG91c2Vob2xkIHR5cGVzIiwidmFsdWUiOjcuMSwiY291bnQiOjksInBlcmNlbnRhZ2UiOjcuMSwib3JpZ2luYWxWYWx1ZSI6Ny4xfSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJPbmUtcGVyc29uIGhvdXNlaG9sZCIsInZhbHVlIjozMC4xLCJjb3VudCI6NzA1MjIyOSwicGVyY2VudGFnZSI6MzAuMSwib3JpZ2luYWxWYWx1ZSI6MzAuMX0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiU2luZ2xlIGZhbWlseSBob3VzZWhvbGQiLCJ2YWx1ZSI6NjMsImNvdW50IjoxNDc2MjkyMywicGVyY2VudGFnZSI6NjMsIm9yaWdpbmFsVmFsdWUiOjYzfSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJPdGhlciBob3VzZWhvbGQgdHlwZXMiLCJ2YWx1ZSI6Ni45LCJjb3VudCI6MTYyMDkzNCwicGVyY2VudGFnZSI6Ni45LCJvcmlnaW5hbFZhbHVlIjo2Ljl9XX0seyJjb2RlIjoiaGhfZGVwcml2YXRpb24iLCJkYXRhIjpbeyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IkhvdXNlaG9sZCBpcyBub3QgZGVwcml2ZWQgaW4gYW55IGRpbWVuc2lvbiIsInZhbHVlIjo2My41LCJjb3VudCI6ODAsInBlcmNlbnRhZ2UiOjYzLjUsIm9yaWdpbmFsVmFsdWUiOjYzLjV9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJIb3VzZWhvbGQgaXMgZGVwcml2ZWQgaW4gb25lIGRpbWVuc2lvbiIsInZhbHVlIjoyOC42LCJjb3VudCI6MzYsInBlcmNlbnRhZ2UiOjI4LjYsIm9yaWdpbmFsVmFsdWUiOjI4LjZ9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJIb3VzZWhvbGQgaXMgZGVwcml2ZWQgaW4gdHdvIGRpbWVuc2lvbnMiLCJ2YWx1ZSI6Ny4xLCJjb3VudCI6OSwicGVyY2VudGFnZSI6Ny4xLCJvcmlnaW5hbFZhbHVlIjo3LjF9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJIb3VzZWhvbGQgaXMgZGVwcml2ZWQgaW4gdGhyZWUgZGltZW5zaW9ucyIsInZhbHVlIjowLjgsImNvdW50IjoxLCJwZXJjZW50YWdlIjowLjgsIm9yaWdpbmFsVmFsdWUiOjAuOH0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IkhvdXNlaG9sZCBpcyBkZXByaXZlZCBpbiBmb3VyIGRpbWVuc2lvbnMiLCJ2YWx1ZSI6MCwiY291bnQiOjAsInBlcmNlbnRhZ2UiOjAsIm9yaWdpbmFsVmFsdWUiOjB9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IkhvdXNlaG9sZCBpcyBub3QgZGVwcml2ZWQgaW4gYW55IGRpbWVuc2lvbiIsInZhbHVlIjo0OC40LCJjb3VudCI6MTEzNDk3MzcsInBlcmNlbnRhZ2UiOjQ4LjQsIm9yaWdpbmFsVmFsdWUiOjQ4LjR9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IkhvdXNlaG9sZCBpcyBkZXByaXZlZCBpbiBvbmUgZGltZW5zaW9uIiwidmFsdWUiOjMzLjUsImNvdW50Ijo3ODQyNjkxLCJwZXJjZW50YWdlIjozMy41LCJvcmlnaW5hbFZhbHVlIjozMy41fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJIb3VzZWhvbGQgaXMgZGVwcml2ZWQgaW4gdHdvIGRpbWVuc2lvbnMiLCJ2YWx1ZSI6MTQuMiwiY291bnQiOjMzMjA1ODQsInBlcmNlbnRhZ2UiOjE0LjIsIm9yaWdpbmFsVmFsdWUiOjE0LjJ9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IkhvdXNlaG9sZCBpcyBkZXByaXZlZCBpbiB0aHJlZSBkaW1lbnNpb25zIiwidmFsdWUiOjMuNywiY291bnQiOjg2ODEwNCwicGVyY2VudGFnZSI6My43LCJvcmlnaW5hbFZhbHVlIjozLjd9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IkhvdXNlaG9sZCBpcyBkZXByaXZlZCBpbiBmb3VyIGRpbWVuc2lvbnMiLCJ2YWx1ZSI6MC4yLCJjb3VudCI6NTQ5NzAsInBlcmNlbnRhZ2UiOjAuMiwib3JpZ2luYWxWYWx1ZSI6MC4yfV19LHsiY29kZSI6ImV0aG5pY19ncm91cF90YiIsImRhdGEiOlt7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiQXNpYW4sIEFzaWFuIEJyaXRpc2ggb3IgQXNpYW4gV2Vsc2giLCJ2YWx1ZSI6NC4xLCJjb3VudCI6MTMsInBlcmNlbnRhZ2UiOjQuMSwib3JpZ2luYWxWYWx1ZSI6NC4xfSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiQmxhY2ssIEJsYWNrIEJyaXRpc2gsIEJsYWNrIFdlbHNoLCBDYXJpYmJlYW4gb3IgQWZyaWNhbiIsInZhbHVlIjowLjMsImNvdW50IjoxLCJwZXJjZW50YWdlIjowLjMsIm9yaWdpbmFsVmFsdWUiOjAuM30seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6Ik1peGVkIG9yIE11bHRpcGxlIGV0aG5pYyBncm91cHMiLCJ2YWx1ZSI6My40LCJjb3VudCI6MTEsInBlcmNlbnRhZ2UiOjMuNCwib3JpZ2luYWxWYWx1ZSI6My40fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiV2hpdGUiLCJ2YWx1ZSI6OTIuMiwiY291bnQiOjI5NCwicGVyY2VudGFnZSI6OTIuMiwib3JpZ2luYWxWYWx1ZSI6OTIuMn0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6Ik90aGVyIGV0aG5pYyBncm91cCIsInZhbHVlIjowLCJjb3VudCI6MCwicGVyY2VudGFnZSI6MCwib3JpZ2luYWxWYWx1ZSI6MH0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiQXNpYW4sIEFzaWFuIEJyaXRpc2ggb3IgQXNpYW4gV2Vsc2giLCJ2YWx1ZSI6OS42LCJjb3VudCI6NTQyNjM5MiwicGVyY2VudGFnZSI6OS42LCJvcmlnaW5hbFZhbHVlIjo5LjZ9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IkJsYWNrLCBCbGFjayBCcml0aXNoLCBCbGFjayBXZWxzaCwgQ2FyaWJiZWFuIG9yIEFmcmljYW4iLCJ2YWx1ZSI6NC4yLCJjb3VudCI6MjM4MTcyNCwicGVyY2VudGFnZSI6NC4yLCJvcmlnaW5hbFZhbHVlIjo0LjJ9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6Ik1peGVkIG9yIE11bHRpcGxlIGV0aG5pYyBncm91cHMiLCJ2YWx1ZSI6MywiY291bnQiOjE2NjkzNzgsInBlcmNlbnRhZ2UiOjMsIm9yaWdpbmFsVmFsdWUiOjN9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6IldoaXRlIiwidmFsdWUiOjgxLCJjb3VudCI6NDU3ODM0MDEsInBlcmNlbnRhZ2UiOjgxLCJvcmlnaW5hbFZhbHVlIjo4MX0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiT3RoZXIgZXRobmljIGdyb3VwIiwidmFsdWUiOjIuMiwiY291bnQiOjEyMjkxNTMsInBlcmNlbnRhZ2UiOjIuMiwib3JpZ2luYWxWYWx1ZSI6Mi4yfV19LHsiY29kZSI6InJlbGlnaW9uX3RiIiwiZGF0YSI6W3siYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJObyByZWxpZ2lvbiIsInZhbHVlIjo0NC41LCJjb3VudCI6MTQzLCJwZXJjZW50YWdlIjo0NC41LCJvcmlnaW5hbFZhbHVlIjo0NC41fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiQ2hyaXN0aWFuIiwidmFsdWUiOjQ0LjksImNvdW50IjoxNDQsInBlcmNlbnRhZ2UiOjQ0LjksIm9yaWdpbmFsVmFsdWUiOjQ0Ljl9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJCdWRkaGlzdCIsInZhbHVlIjowLjYsImNvdW50IjoyLCJwZXJjZW50YWdlIjowLjYsIm9yaWdpbmFsVmFsdWUiOjAuNn0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6IkhpbmR1IiwidmFsdWUiOjAsImNvdW50IjowLCJwZXJjZW50YWdlIjowLCJvcmlnaW5hbFZhbHVlIjowfSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiSmV3aXNoIiwidmFsdWUiOjAsImNvdW50IjowLCJwZXJjZW50YWdlIjowLCJvcmlnaW5hbFZhbHVlIjowfSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiTXVzbGltIiwidmFsdWUiOjIuNSwiY291bnQiOjgsInBlcmNlbnRhZ2UiOjIuNSwib3JpZ2luYWxWYWx1ZSI6Mi41fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiU2lraCIsInZhbHVlIjoxLjksImNvdW50Ijo2LCJwZXJjZW50YWdlIjoxLjksIm9yaWdpbmFsVmFsdWUiOjEuOX0seyJhcmVhbm0iOiJNeUN1c3RvbUFyZWEiLCJjYXRlZ29yeSI6Ik90aGVyIHJlbGlnaW9uIiwidmFsdWUiOjAuNiwiY291bnQiOjIsInBlcmNlbnRhZ2UiOjAuNiwib3JpZ2luYWxWYWx1ZSI6MC42fSx7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiTm90IGFuc3dlcmVkIiwidmFsdWUiOjUsImNvdW50IjoxNiwicGVyY2VudGFnZSI6NSwib3JpZ2luYWxWYWx1ZSI6NX0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiTm8gcmVsaWdpb24iLCJ2YWx1ZSI6MzYuNywiY291bnQiOjIwNzE1NjY0LCJwZXJjZW50YWdlIjozNi43LCJvcmlnaW5hbFZhbHVlIjozNi43fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJDaHJpc3RpYW4iLCJ2YWx1ZSI6NDYuMywiY291bnQiOjI2MTY3ODk5LCJwZXJjZW50YWdlIjo0Ni4zLCJvcmlnaW5hbFZhbHVlIjo0Ni4zfSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJCdWRkaGlzdCIsInZhbHVlIjowLjUsImNvdW50IjoyNjI0MzMsInBlcmNlbnRhZ2UiOjAuNSwib3JpZ2luYWxWYWx1ZSI6MC41fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJIaW5kdSIsInZhbHVlIjoxLjgsImNvdW50IjoxMDIwNTMzLCJwZXJjZW50YWdlIjoxLjgsIm9yaWdpbmFsVmFsdWUiOjEuOH0seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiSmV3aXNoIiwidmFsdWUiOjAuNSwiY291bnQiOjI2OTI4MywicGVyY2VudGFnZSI6MC41LCJvcmlnaW5hbFZhbHVlIjowLjV9LHsiYXJlYW5tIjoiQ29tcGFyaXNvbkFyZWEiLCJjYXRlZ29yeSI6Ik11c2xpbSIsInZhbHVlIjo2LjcsImNvdW50IjozODAxMTg2LCJwZXJjZW50YWdlIjo2LjcsIm9yaWdpbmFsVmFsdWUiOjYuN30seyJhcmVhbm0iOiJDb21wYXJpc29uQXJlYSIsImNhdGVnb3J5IjoiU2lraCIsInZhbHVlIjowLjksImNvdW50Ijo1MjAwOTIsInBlcmNlbnRhZ2UiOjAuOSwib3JpZ2luYWxWYWx1ZSI6MC45fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJPdGhlciByZWxpZ2lvbiIsInZhbHVlIjowLjYsImNvdW50IjozMzI0MTAsInBlcmNlbnRhZ2UiOjAuNiwib3JpZ2luYWxWYWx1ZSI6MC42fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJOb3QgYW5zd2VyZWQiLCJ2YWx1ZSI6NiwiY291bnQiOjM0MDA1NDgsInBlcmNlbnRhZ2UiOjYsIm9yaWdpbmFsVmFsdWUiOjZ9XX0seyJjb2RlIjoiZGlzYWJpbGl0eSIsImRhdGEiOlt7ImFyZWFubSI6Ik15Q3VzdG9tQXJlYSIsImNhdGVnb3J5IjoiRGlzYWJsZWQgdW5kZXIgdGhlIEVxdWFsaXR5IEFjdCIsInZhbHVlIjoxMS4yLCJjb3VudCI6MzYsInBlcmNlbnRhZ2UiOjExLjIsIm9yaWdpbmFsVmFsdWUiOjExLjJ9LHsiYXJlYW5tIjoiTXlDdXN0b21BcmVhIiwiY2F0ZWdvcnkiOiJOb3QgZGlzYWJsZWQgdW5kZXIgdGhlIEVxdWFsaXR5IEFjdCIsInZhbHVlIjo4OC44LCJjb3VudCI6Mjg0LCJwZXJjZW50YWdlIjo4OC44LCJvcmlnaW5hbFZhbHVlIjo4OC44fSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJEaXNhYmxlZCB1bmRlciB0aGUgRXF1YWxpdHkgQWN0IiwidmFsdWUiOjE3LjMsImNvdW50Ijo5Nzc0NTEwLCJwZXJjZW50YWdlIjoxNy4zLCJvcmlnaW5hbFZhbHVlIjoxNy4zfSx7ImFyZWFubSI6IkNvbXBhcmlzb25BcmVhIiwiY2F0ZWdvcnkiOiJOb3QgZGlzYWJsZWQgdW5kZXIgdGhlIEVxdWFsaXR5IEFjdCIsInZhbHVlIjo4Mi43LCJjb3VudCI6NDY3MTU1MzgsInBlcmNlbnRhZ2UiOjgyLjcsIm9yaWdpbmFsVmFsdWUiOjgyLjd9XX1d&poly=eyJ0eXBlIjoiUG9seWdvbiIsImNvb3JkaW5hdGVzIjpbW1stMC4yNDA5LDUyLjE4OThdLFstMC4yNDI0LDUyLjE5MDVdLFstMC4yNDI4LDUyLjE5MDldLFstMC4yNDQ0LDUyLjE5MTVdLFstMC4yNDYyLDUyLjE5MTldLFstMC4yNDY5LDUyLjE5MjZdLFstMC4yNDc4LDUyLjE5MjldLFstMC4yNDkzLDUyLjE5NDZdLFstMC4yNTE3LDUyLjE5NTZdLFstMC4yNTIyLDUyLjE5NjFdLFstMC4yNTIsNTIuMTk2NV0sWy0wLjI1MjksNTIuMTk3Ml0sWy0wLjI1MzUsNTIuMTk4Ml0sWy0wLjI1NDUsNTIuMTk5NF0sWy0wLjI1NDgsNTIuMjAxNF0sWy0wLjI1NTIsNTIuMjAxMV0sWy0wLjI1NTUsNTIuMjAxMl0sWy0wLjI1NjcsNTIuMjAyOV0sWy0wLjI2MDYsNTIuMjAzNl0sWy0wLjI2MDcsNTIuMjAzOV0sWy0wLjI2MTIsNTIuMjA0MV0sWy0wLjI2MDUsNTIuMjA1NF0sWy0wLjI2MjIsNTIuMjA1NF0sWy0wLjI2MjMsNTIuMjA1Nl0sWy0wLjI2NCw1Mi4yMDU3XSxbLTAuMjY2NCw1Mi4yMDIyXSxbLTAuMjcwMSw1Mi4yMDI3XSxbLTAuMjY5OCw1Mi4yMDMxXSxbLTAuMjczLDUyLjIwNDFdLFstMC4yNzQ3LDUyLjIwMTRdLFstMC4yNzcyLDUyLjJdLFstMC4yNzg3LDUyLjE5OTZdLFstMC4yODQxLDUyLjE5OTRdLFstMC4yODY0LDUyLjE5OV0sWy0wLjI4OTYsNTIuMTk4XSxbLTAuMjkyLDUyLjE5NjddLFstMC4yOTMsNTIuMTk1Ml0sWy0wLjI5MjYsNTIuMTk0N10sWy0wLjI5MDksNTIuMTk0N10sWy0wLjI5MDEsNTIuMTk0Ml0sWy0wLjI4OSw1Mi4xOTE2XSxbLTAuMjg4OSw1Mi4xOTExXSxbLTAuMjg5Miw1Mi4xOTAxXSxbLTAuMjkyLDUyLjE4NTRdLFstMC4yOTMsNTIuMTg0Ml0sWy0wLjI5MzgsNTIuMTgyOF0sWy0wLjI5NDUsNTIuMTgyM10sWy0wLjI5NjMsNTIuMTgxN10sWy0wLjI5NzcsNTIuMTgxXSxbLTAuMzAwNCw1Mi4xNzkxXSxbLTAuMzAxNCw1Mi4xNzgyXSxbLTAuMzAxOSw1Mi4xNzczXSxbLTAuMzAyMyw1Mi4xNzU3XSxbLTAuMzAyMyw1Mi4xNzMxXSxbLTAuMzAyOCw1Mi4xNzI4XSxbLTAuMzAzMyw1Mi4xNzIxXSxbLTAuMzAxOCw1Mi4xNzEzXSxbLTAuMzAwMiw1Mi4xNzA5XSxbLTAuMzAwNCw1Mi4xNjkyXSxbLTAuMyw1Mi4xNjQxXSxbLTAuMzAwNSw1Mi4xNjA5XSxbLTAuMzAwNSw1Mi4xNTg5XSxbLTAuMzAwMiw1Mi4xNTgxXSxbLTAuMzAwOCw1Mi4xNTc0XSxbLTAuMzAxLDUyLjE1NjhdLFstMC4zMDA3LDUyLjE0MzddLFstMC4yODgyLDUyLjE0NTZdLFstMC4yODgzLDUyLjE0NTldLFstMC4yODIsNTIuMTQ2NF0sWy0wLjI4MTQsNTIuMTQ2M10sWy0wLjI4MTcsNTIuMTQ0Ml0sWy0wLjI4Miw1Mi4xMzg5XSxbLTAuMjc4Miw1Mi4xMzk0XSxbLTAuMjc4Miw1Mi4xMzkzXSxbLTAuMjc5NCw1Mi4xMzY5XSxbLTAuMjgyMSw1Mi4xMzY1XSxbLTAuMjgyMyw1Mi4xMzMzXSxbLTAuMjgxLDUyLjEzMzZdLFstMC4yODA4LDUyLjEzMzRdLFstMC4yNzkzLDUyLjEzNDFdLFstMC4yNzksNTIuMTMzOV0sWy0wLjI3NzgsNTIuMTMzN10sWy0wLjI3Nyw1Mi4xMzMyXSxbLTAuMjc2OCw1Mi4xMzI5XSxbLTAuMjc3Miw1Mi4xMzI0XSxbLTAuMjc4LDUyLjEzMjRdLFstMC4yNzg5LDUyLjEzMThdLFstMC4yNzkzLDUyLjEzMjFdLFstMC4yODA2LDUyLjEzMThdLFstMC4yODE3LDUyLjEzMThdLFstMC4yODE3LDUyLjEyOTddLFstMC4yNzg4LDUyLjEyOTddLFstMC4yNzY5LDUyLjEzMDJdLFstMC4yNzU4LDUyLjEzMDJdLFstMC4yNzQ4LDUyLjEzMDFdLFstMC4yNzI2LDUyLjEyOTRdLFstMC4yNzA4LDUyLjEyOTFdLFstMC4yNzA4LDUyLjEyODldLFstMC4yNzE3LDUyLjEyODldLFstMC4yNzI0LDUyLjEyODddLFstMC4yNzQ2LDUyLjEyNjhdLFstMC4yNzk0LDUyLjEyNTFdLFstMC4yNzYxLDUyLjEyNF0sWy0wLjI3NDMsNTIuMTIzMV0sWy0wLjI3MzEsNTIuMTIyN10sWy0wLjI2NzYsNTIuMTIzNF0sWy0wLjI2MTUsNTIuMTIyNV0sWy0wLjI2MTYsNTIuMTI0N10sWy0wLjI0NjQsNTIuMTM0M10sWy0wLjI0NjMsNTIuMTM0NV0sWy0wLjI0NjgsNTIuMTM0OF0sWy0wLjI0NTMsNTIuMTM2M10sWy0wLjI0MzYsNTIuMTM1XSxbLTAuMjQxLDUyLjEzNjVdLFstMC4yNDA3LDUyLjEzNjVdLFstMC4yMzUyLDUyLjEzNDNdLFstMC4yMzUxLDUyLjEzNDRdLFstMC4yMzQ5LDUyLjEzNTFdLFstMC4yMzUxLDUyLjEzNjJdLFstMC4yMzQ5LDUyLjEzNjddLFstMC4yMzM2LDUyLjEzODldLFstMC4yMzI2LDUyLjEzOThdLFstMC4yMzQ3LDUyLjE0MTFdLFstMC4yMzU2LDUyLjE0MjJdLFstMC4yMzcxLDUyLjE0MzFdLFstMC4yMzk2LDUyLjE0NF0sWy0wLjI0MDEsNTIuMTQzNV0sWy0wLjI0MTUsNTIuMTQzOV0sWy0wLjI0MTYsNTIuMTQ0XSxbLTAuMjQxMiw1Mi4xNDQ1XSxbLTAuMjQ0OCw1Mi4xNDU3XSxbLTAuMjQ1OCw1Mi4xNDU0XSxbLTAuMjQ1LDUyLjE0NTFdLFstMC4yNDQ0LDUyLjE0NDVdLFstMC4yNDUyLDUyLjE0MzRdLFstMC4yNDU3LDUyLjE0MzFdLFstMC4yNDc4LDUyLjE0MzldLFstMC4yNDg0LDUyLjE0MzRdLFstMC4yNDgyLDUyLjE0MzNdLFstMC4yNDgzLDUyLjE0MzFdLFstMC4yNDg3LDUyLjE0MzFdLFstMC4yNDksNTIuMTQyN10sWy0wLjI1MDYsNTIuMTQzMl0sWy0wLjI1MDIsNTIuMTQzOF0sWy0wLjI0OTYsNTIuMTQzN10sWy0wLjI0ODgsNTIuMTQ0Nl0sWy0wLjI0ODEsNTIuMTQ0NF0sWy0wLjI0ODYsNTIuMTQ0Nl0sWy0wLjI0OCw1Mi4xNDUxXSxbLTAuMjQ4Miw1Mi4xNDUxXSxbLTAuMjQ3NSw1Mi4xNDZdLFstMC4yNDcyLDUyLjE0Nl0sWy0wLjI0NjYsNTIuMTQ2NF0sWy0wLjI0NTksNTIuMTQ2XSxbLTAuMjQ0OCw1Mi4xNDY2XSxbLTAuMjQ1Miw1Mi4xNDY4XSxbLTAuMjQ1LDUyLjE0NjldLFstMC4yNDUzLDUyLjE0NzFdLFstMC4yNDQ1LDUyLjE0NzddLFstMC4yNDMzLDUyLjE0NzJdLFstMC4yNDIxLDUyLjE0NzhdLFstMC4yNDE1LDUyLjE0NzJdLFstMC4yMzkzLDUyLjE0NjJdLFstMC4yMzg2LDUyLjE0NjldLFstMC4yMzYyLDUyLjE0ODZdLFstMC4yMzA2LDUyLjE0NjVdLFstMC4yMjczLDUyLjE0ODFdLFstMC4yMjQ5LDUyLjE0OThdLFstMC4yMjM3LDUyLjE1MTRdLFstMC4yMjI3LDUyLjE1MzFdLFstMC4yMjE3LDUyLjE1NF0sWy0wLjIyMDEsNTIuMTU2Ml0sWy0wLjIyNjksNTIuMTU4N10sWy0wLjIyNjQsNTIuMTU5NV0sWy0wLjIyNjYsNTIuMTU5Nl0sWy0wLjIyNTEsNTIuMTYwNl0sWy0wLjIxODQsNTIuMTU4OV0sWy0wLjIxOTUsNTIuMTU4XSxbLTAuMjE4Nyw1Mi4xNTc3XSxbLTAuMjE3NCw1Mi4xNTg2XSxbLTAuMjEzOCw1Mi4xNTk3XSxbLTAuMjExMyw1Mi4xNjExXSxbLTAuMjEwNCw1Mi4xNjEzXSxbLTAuMjExMSw1Mi4xNjE5XSxbLTAuMjA4Nyw1Mi4xNjI2XSxbLTAuMjA4OCw1Mi4xNjI3XSxbLTAuMjA3LDUyLjE2M10sWy0wLjIwNjUsNTIuMTYyMl0sWy0wLjIwMzcsNTIuMTYyOF0sWy0wLjIwMjMsNTIuMTYzNl0sWy0wLjE5ODMsNTIuMTY0OF0sWy0wLjE5NTEsNTIuMTY2Nl0sWy0wLjE5MjksNTIuMTY2Ml0sWy0wLjE5MTMsNTIuMTY3NF0sWy0wLjE5MDcsNTIuMTY4NV0sWy0wLjE5MTEsNTIuMTY4Nl0sWy0wLjE5MDcsNTIuMTY5Ml0sWy0wLjE4OTksNTIuMTY4OV0sWy0wLjE4OTEsNTIuMTY5NF0sWy0wLjE4OTksNTIuMTcwM10sWy0wLjE5LDUyLjE3MTddLFstMC4xOTAyLDUyLjE3MTddLFstMC4xOTEzLDUyLjE3MzVdLFstMC4xOTEyLDUyLjE3NDZdLFstMC4xODk3LDUyLjE3NThdLFstMC4xODU4LDUyLjE3NzddLFstMC4xODQ5LDUyLjE3NzldLFstMC4xODQ3LDUyLjE3ODJdLFstMC4xODUxLDUyLjE3ODNdLFstMC4xODUsNTIuMTc4NV0sWy0wLjE4NDQsNTIuMTc4N10sWy0wLjE4NDYsNTIuMTc5NF0sWy0wLjE4NTcsNTIuMTgwN10sWy0wLjE4NjEsNTIuMTgyNl0sWy0wLjE4NTUsNTIuMTg0MV0sWy0wLjE4ODUsNTIuMTg0MV0sWy0wLjE5MzUsNTIuMTg1M10sWy0wLjE5ODksNTIuMTg2MV0sWy0wLjIwMTUsNTIuMTg2XSxbLTAuMjA0Nyw1Mi4xODYxXSxbLTAuMjA4OSw1Mi4xODU1XSxbLTAuMjA5NSw1Mi4xODVdLFstMC4yMSw1Mi4xODQ5XSxbLTAuMjA5OSw1Mi4xODQ3XSxbLTAuMjA5LDUyLjE4NDhdLFstMC4yMDc5LDUyLjE3OTldLFstMC4yMTU2LDUyLjE3ODhdLFstMC4yMTgxLDUyLjE4MzZdLFstMC4yMTkzLDUyLjE4MzhdLFstMC4yMjYsNTIuMTg0XSxbLTAuMjMxNSw1Mi4xODQ4XSxbLTAuMjMxNSw1Mi4xODUyXSxbLTAuMjM2NCw1Mi4xODY5XSxbLTAuMjM3NSw1Mi4xODc2XSxbLTAuMjM4Miw1Mi4xODg1XSxbLTAuMjQwOSw1Mi4xODk4XV0sW1stMC4yODQxLDUyLjE3MDZdLFstMC4yODQyLDUyLjE3MTFdLFstMC4yODI4LDUyLjE3MTRdLFstMC4yODI5LDUyLjE3MDZdLFstMC4yODQxLDUyLjE3MDZdXSxbWy0wLjI4NTksNTIuMTcxN10sWy0wLjI4NDYsNTIuMTcxOV0sWy0wLjI4NDQsNTIuMTcxM10sWy0wLjI4NTcsNTIuMTcxMl0sWy0wLjI4NTksNTIuMTcxN11dLFtbLTAuMjg2MSw1Mi4xNzA2XSxbLTAuMjg2MSw1Mi4xNzAyXSxbLTAuMjg2OCw1Mi4xNzAxXSxbLTAuMjg3Miw1Mi4xNzAxXSxbLTAuMjg3Miw1Mi4xNzA0XSxbLTAuMjg3Niw1Mi4xNzA1XSxbLTAuMjg4Miw1Mi4xNzA0XSxbLTAuMjg4Miw1Mi4xNzAxXSxbLTAuMjk0OSw1Mi4xNzAzXSxbLTAuMjk0OSw1Mi4xNzAxXSxbLTAuMjk2NSw1Mi4xN10sWy0wLjI5NjcsNTIuMTY5OF0sWy0wLjI5NzMsNTIuMTddLFstMC4yOTgsNTIuMTcwOF0sWy0wLjI5OCw1Mi4xNzExXSxbLTAuMjk1Myw1Mi4xNzEzXSxbLTAuMjk1Myw1Mi4xNzE1XSxbLTAuMjk0LDUyLjE3MTddLFstMC4yOTM5LDUyLjE3MV0sWy0wLjI5MjMsNTIuMTcxMV0sWy0wLjI5MTMsNTIuMTcxXSxbLTAuMjkxMyw1Mi4xNzA3XSxbLTAuMjkwNSw1Mi4xNzA3XSxbLTAuMjkwNiw1Mi4xNzEzXSxbLTAuMjkwNSw1Mi4xNzEzXSxbLTAuMjg4Niw1Mi4xNzExXSxbLTAuMjg4Niw1Mi4xNzA4XSxbLTAuMjg4LDUyLjE3MDddLFstMC4yODYyLDUyLjE3MV0sWy0wLjI4NjEsNTIuMTcwNl1dXX0=&showMap=true&version=NA=="
  style="width: 100%; height: 600px; border: none;"
/> -->

<style>
  .or {
    text-align: center;
    font-style: italic;
  }

  :global(.ol-zoom) {
    left: var(--zoom-control-position);
    transition: left 0.1s ease;
  }

  :global(#modifyGeoJson) {
    left: var(--zoom-control-position);
    transition: left 0.1s ease;
  }

  .split-bar-header {
    font-weight: 600;
    display: flex;
    justify-content: space-between;
  }

  .mosaic-row {
    display: grid;
    grid-template-columns: 2fr 4fr 1fr;
    column-gap: 5px;
  }

  .mosaic-row-bar {
    width: 100%;
    height: 20px;
    background-color: aliceblue;
    display: flex;
    justify-content: space-between;
    border: 0.5px solid black;
  }

  .mosaic-row-bar-inner {
    height: 20px;
    /* background-color: teal; */
    transition: 0.1s ease;
  }
</style>
