<script lang="ts">
  import init from "$lib/raster_ops/pkg/raster_ops"; // categorical_matrix, // unpack_bitmask, // categorical_count_masked, // binary_buffer, // binary_and_unpack_simd,
  import { onMount, tick } from "svelte";
  import { enhance } from "$app/forms";
  import { MediaQuery } from "svelte/reactivity";
  import { base } from "$app/paths";
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
    loadDensityTiff,
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
    // getTheInverse,
    getBBoxFromTileCodes,
    tileIndex,
    tilesForBBox,
    loadIndexedArray,
    loadIndexedArrayUint16,
  } from "$lib/utils";
  import { computeDensityStats } from "$lib/densityStats";
  import {
    colors,
    // mhclgPaletteRGB,
    shortCategoricalColorPaletteRgb,
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
  import type { DataLayerItem } from "$lib/utils";
  import type { DoughnutData } from "$lib/utils";

  let selectedTabId: string | undefined = $state();
  // $inspect({ selectedTabId });

  let LAGeoJSON: GeoJSONFeatureCollection | undefined = $state(undefined);
  // $inspect(LAGeoJSON);
  let selectedLA = $state();
  $inspect(selectedLA);

  let gridType: string = $state("hectare");
  // $inspect(gridType);

  let { gridSize, sourceFolder } = $derived(
    gridType === "hectare" ? hectareSettings : tenMetreSettings,
  );
  $inspect(gridSize, sourceFolder);

  let { data }: PageProps = $props();

  let {
    grid10mVariables,
    urlParams,
    urlParamsString,
    urlSelected,
    urlPolicyLens,
    ...rest
  } = data;

  // let grid10mVariables = data.grid10mVariables;
  const mobile = new MediaQuery("max-width: 600px");
  // let pageLayout = $state("grid-template-columns: 23% 40% 37%");
  // let currentMousePosition = $state();
  // let hoveredArea = $state();
  let showFilters = $state(true);
  let mapSize: number = $state(50);
  // $inspect(mapSize);
  let sidePanelWidth: number = $state(250);

  $effect(() => {
    document.documentElement.style.setProperty("--mapWidth", `${mapSize}%`);
    document.documentElement.style.setProperty(
      "--tw-translate-x",
      `${showFilters ? 0 : -100}%`,
    );
    document.documentElement.style.setProperty(
      "--zoom-control-position",
      `${showFilters ? sidePanelWidth : 8}px`,
    );
  });

  let done = $state(false);
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
  let seeDensity = $state(false);
  // $inspect({ seeDensity });
  let seeArea = $state(true);
  // $inspect({ seeArea });
  let seeMarker = $state(false);

  let drawing: boolean = $state(false);
  let opacity: number = $state(0.8);

  let uniqueCounts = $state(new Uint32Array(0));
  // $inspect({ uniqueCounts });

  let usingGeoTiff: boolean = $state(false);

  // const DENSITY_LUT = $derived.by(() => {
  //   const LUT = new Uint32Array(65536);
  //   for (let i = 0; i < 65536; i++) {
  //     // const normalized = normalizeDensity(i);
  //     let normalized;

  //     if (i < 1) normalized = shortCategoricalColorPaletteRgb[0];
  //     else if (i <= 1) normalized = shortCategoricalColorPaletteRgb[1];
  //     else if (i <= 2) normalized = shortCategoricalColorPaletteRgb[2];
  //     else if (i <= 3) normalized = shortCategoricalColorPaletteRgb[3];
  //     else if (i <= 50) normalized = [30, 156, 137];
  //     else if (i <= 100) normalized = [37, 132, 142];
  //     else if (i <= 200) normalized = [47, 108, 142];
  //     else if (i <= 500) normalized = [65, 68, 135];
  //     else normalized = [68, 1, 84];
  //     const [r, g, b] = normalized;
  //     // console.log(interpolateViridis(1 - normalized));

  //     const a = Math.floor(opacity * 255);

  //     LUT[i] = (a << 24) | (b << 16) | (g << 8) | r;
  //   }
  //   return LUT;
  // });
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
    private_individual: { hue: 28 }, // orange
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

  const DENSITY_LUT = $derived.by(() => {
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
  $inspect(DENSITY_LUT);

  let policyLens = $state("England");
  if (urlPolicyLens) {
    policyLens = urlPolicyLens;
  }
  $inspect(policyLens);

  // let tileCodes = $state(["STNE", "STSW"]);
  // $inspect(tileCodes);

  // let customArea: Uint32Array = $state();

  let drawnFeature: Feature | undefined = $state();
  $inspect({ drawnFeature });

  let customAreaGeometry = $derived(drawnFeature?.getGeometry());
  let customAreaBBox: number[] | undefined = $derived(
    customAreaGeometry?.getExtent(),
  );

  let tileCodes = $derived(
    customAreaBBox
      ? tilesForBBox(customAreaBBox, tileIndex, 50000)
      : ["STNE", "STSW"],
  );

  let bbox = $derived(
    gridType === "hectare"
      ? hectareBbox
      : getBBoxFromTileCodes(tileCodes, gridSize, 5000),
  );

  let width = $derived((bbox[2] - bbox[0]) / gridSize);
  let height = $derived((bbox[3] - bbox[1]) / gridSize);
  $inspect(bbox, width, height);

  const format = new GeoJSON();

  let englandAreaHectare = $state(new Uint32Array(0));

  $effect(() => {
    if (selectedLA && LAGeoJSON) {
      // console.log(
      //   { selectedLA },
      //   LAGeoJSON?.features?.find((d) => d.properties.LAD25CD === selectedLA),
      // );
      // drawnFeature = LAGeoJSON
      //   ?.features.find((d) => d.properties.LAD25CD === selectedLA);

      drawnFeature = format.readFeatures(
        LAGeoJSON?.features?.find((d) => d.properties?.LAD25CD === selectedLA),
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
      policyLens = "customArea";

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
      : policyLens === "England" && gridType === "hectare"
        ? englandAreaHectare
        : null,
  );

  // $effect(() => {
  //   if (policyLens === "England" && gridType === "hectare") {
  //     async () => {
  //       customArea = await loadIndexedArray(
  //         `${base}/data/categorised-land/ENGLAND_100M_OS_GRID_COMPATIBLE.bin`,
  //       );
  //     };
  //   }
  // });
  // $inspect(geoJSONdata);

  // let customArea = $derived(new Uint32Array(geoJSONdata));

  // let customArea = $state();

  // $effect(
  //   async () => {
  //     try {
  //       console.log({ customAreaGeometry });
  //       const result = customAreaGeometry
  //         ? geometryToGridHitsScanline(customAreaGeometry, bbox, width, height)
  //         : gridType === "hectare"
  //           ? await loadIndexedArray(
  //               `${base}/data/categorised-land/ENGLAND_100M_OS_GRID_COMPATIBLE.bin`,
  //             )
  //           : null;
  //       // console.log(result);
  //       customArea = result;
  //     } catch (e) {
  //       console.log(e);
  //     }
  //   },

  //   // customAreaGeometry
  //   //   ? geometryToGridHitsScanline(customAreaGeometry, bbox, width, height)
  //   //   : await loadIndexedArray(
  //   //       `${base}/data/categorised-land/ENGLAND_100M_OS_GRID_COMPATIBLE.bin`,
  //   //     ),
  // );

  // let customArea = $derived(
  //   customAreaGeometry
  //     ? geometryToGridHitsScanline(customAreaGeometry, bbox, width, height)
  //     : null,
  // );
  $inspect({ customArea });
  // let oldCustomArea = customArea;
  // $effect(async () => {
  //   if (customArea) {
  //     if (!arraysEqual(customArea, oldCustomArea)) {
  //       console.log("updating customArea based on geoJSONdata");
  //       oldCustomArea = customArea;
  //       await unpackAndBlendLayers();
  //     }
  //   }
  // });

  // //Not sure this effect ever runs
  // $effect(() => {
  //   if (geoJSONdata?.tileCodes.length > 0) {
  //     const next = geoJSONdata.tileCodes;

  //     // Fix for svelte equality check issue
  //     if (!arraysEqual(tileCodes, next)) {
  //       console.log("updating tileCodes based on geoJSONdata");
  //       tileCodes = next;
  //     }
  //   }
  // });

  // function arraysEqual(a, b) {
  //   if (a === b) return true;
  //   if (!a || !b || a.length !== b.length) return false;
  //   for (let i = 0; i < a.length; i++) {
  //     if (a[i] !== b[i]) return false;
  //   }
  //   return true;
  // }

  let policyLensArea: number | null = $state(
    (13_046_002 * 10_000) / (gridSize * gridSize),
  );
  // $inspect(policyLensArea);

  let currentBitArrays = $state();
  // $inspect({ currentBitArrays });

  let enrichedLayers = $state([]);
  // $inspect(enrichedLayers);
  let lensIndices = $state();
  // $inspect({ lensIndices });

  let blendedIndices: Uint32Array = $state(new Uint32Array(0));
  // $inspect(blendedIndices)

  let densityCanvas: HTMLCanvasElement | undefined = $state();
  let densityDataURL = $state();
  // $inspect(densityDataURL);

  let breakdownData = $state(null);
  $inspect({ breakdownData });

  function categoryKey(areaName: string) {
    const cleaned = areaName ?? ""; /*.replace(/[^a-z0-9]/gi, "");*/
    // return cleaned ? cleaned[0].toUpperCase() : "#"; // "#" bucket for “no key”
    return cleaned;
  }

  function summariseByCategory(data) {
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
  let breakdownChartSortValue: string | null = $state("total");
  $inspect(breakdownChartSortValue);
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

  let blendedArrayLength: number = $derived(blendedIndices?.length);
  // $inspect({blendedArrayLength})
  let selected: string[] = $state([]);
  $inspect({ selected });

  let tableData = $derived(
    selected?.map((layer, i) => {
      return {
        name: makeFileNameReadable(layer, gridType),
        area: enrichedLayers?.find(
          (d) => makeFileNameDatasetKey(d.filename) == layer,
        )?.area
          ? convertPixelsToHectares(
              enrichedLayers?.find(
                (d) => makeFileNameDatasetKey(d.filename) == layer,
              )?.area,
              gridSize,
            )
          : 0,
        unique:
          uniqueCounts && uniqueCounts[i]
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
                  label: layer.dataLayer,
                  exclusive: layer.level == 2 ? true : false,
                  checked: layer.initiallyChecked,
                  parentCheckBoxName: section.replaceAll(" ", "_") + ".bin",
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
            (d.tier == makeFileNameReadable(sel, gridType) ||
              d.category == makeFileNameReadable(sel, gridType)) &&
            d.dataLayer !== "All data layers",
        )
        .map((d) => d.dataLayer);

      acc[key] = value;
      return acc;
    }, {});
  });
  $inspect({ selectedSubLayers });

  // let uniqueArray = $state([]);

  let selectedRestriction: string | undefined = $state();
  // $inspect({ selectedRestriction });
  let selectedRestrictionIndex: number | undefined = $derived(
    selectedRestriction
      ? selected
          ?.map((d) => makeFileNameReadable(d, gridType))
          .indexOf(selectedRestriction)
      : undefined,
  );
  // $inspect({ selectedRestrictionIndex });

  let uniqueArrays: Uint32Array[] = $state([]);
  // $inspect({ uniqueArrays });
  let uniqueIndices = $derived(
    selectedRestrictionIndex ? uniqueArrays[selectedRestrictionIndex] : [],
  );
  // $inspect({ uniqueIndices });

  // let csvFile = $state();
  let zipFile: FileList | undefined = $state();
  // let geoJSONFile: FileList = $state();
  // $inspect(geoJSONFile);
  let uploadedGeoJSON: GeoJSON = $state();
  // $inspect(uploadedGeoJSON);

  let tiffArrayBuffersFromZip = $state({});

  let layersToUnpack = $state();
  // $inspect({ layersToUnpack });

  async function handleFileUpload(event) {
    URL.revokeObjectURL(dataURL);
    dataURL = null;
    selected = null;
    usingGeoTiff = true;

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
        .filter((d) => d.initiallyChecked === "y")
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

    // customAreaGeometry = features[0].getGeometry();

    //!!! Bug - need to fix this for areas that have multiple features
    drawnFeature = features[0];
    // const geometry = event.feature.getGeometry();
    // customAreaBBox = customAreaGeometry.getExtent();

    // const geoJSONdata = geometryToGridHitsScanline(
    //   customAreaGeometry,
    //   bbox,
    //   width,
    //   height,
    // );

    // customArea = new Uint32Array(geoJSONdata.customArea);
    // tileCodes = geoJSONdata.tileCodes;
    selectedLA = null;
    // tileCodes = await tilesForBBox(customAreaBBox, tileIndex, 50000);
    // console.log("in the geo file upload handler, customArea: ", customArea);
    policyLens = "customArea";

    // Object.keys(tiffArrayBuffersFromZip).length > 0
    //   ? unpackZippedLayers()
    //   : // : unpackSelectedLayers();
    //     await unpackAndBlendLayers();

    // closePanelAndScrollToMap();
  }

  let csvLocation = $derived(
    `${base}/data/${sourceFolder}/ultimate_land_metadata.csv`,
  );

  let metadataCsv: string = $state();
  // $inspect(metadataCsv);

  $effect(async () => {
    gridType;

    // done = false;
    // dataURL = null;
    // // densityArray = null;
    // uniqueCounts = null;
    // // customArea = null;
    // policyLensArea = null;
    // currentBitArrays = null;
    // enrichedLayers = [];
    // lensIndices = null;
    // blendedIndices = [];
    // // densityDataURL = null;
    // breakdownData = null;
    // uniqueArrays = [];
    // uniqueIndices = null;

    try {
      const response = await fetch(csvLocation);
      if (!response.ok) throw new Error("Failed to fetch CSV");
      metadataCsv = await response.text();
      // console.log(metadataCsv);

      startingPosition = parseCsv(metadataCsv);
      // console.log(startingPosition);
    } catch (err) {
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

      // if (customAreaBBox) {
      //   console.log("setting tileCodes within gridType effect");
      //   tileCodes = await tilesForBBox(customAreaBBox, tileIndex, 50000);
      // }

      policyLensArea = null;
      blendedArrayLength = null;
      // unpackSelectedLayers();
      await unpackAndBlendLayers();
      // closePanelAndScrollToMap();

      if (selectedTabId === "table") {
        seeArea = true;
        seeDensity = false;
      } else {
        seeArea = false;
        seeDensity = true;
      }
    }
  });

  onMount(async () => {
    densityCanvas = document.createElement("canvas");

    englandAreaHectare = await loadIndexedArray(
      `${base}/data/categorised-land/ENGLAND_100M_OS_GRID_COMPATIBLE.bin`,
    );

    await init({
      module_or_path: new URL(
        "$lib/raster_ops/pkg/raster_ops_bg.wasm",
        import.meta.url,
      ),
    });
    console.log("✅ WASM initialized");

    const res = await fetch("/LAD_MAY_2025_UK_BGC_England.geojson");
    if (!res.ok) {
      console.error("Failed to load GeoJSON");
      return;
    }
    LAGeoJSON = await res.json();
    // console.log(LAGeoJSON);

    // try {
    //   const response = await fetch(csvLocation);
    //   if (!response.ok) throw new Error("Failed to fetch CSV");
    //   metadataCsv = await response.text();
    //   // console.log(metadataCsv);

    //   startingPosition = parseCsv(metadataCsv);
    // } catch (err) {
    //   console.error(err.message);
    // }

    // if (startingPosition) {
    //   selected = startingPosition
    //     .filter((d) => d.initially_checked === "y")
    //     .map((d) => d.filename);
    //   unpackSelectedLayers();
    // }

    //   const tiffData = await loadDensityTiff(
    //     `${base}/range/hectare_counts_trimmed.tif`,
    //     bbox,
    //   );
    //   densityArray = tiffData.densityArray;
    densityArray = await loadIndexedArrayUint16(
      `${base}/data/categorised-land/ownership_cat_260518_8am.bin`,
    );
    console.log({ densityArray });
  });

  function prepareToUnpack() {
    layersToUnpack = selected?.map((d) =>
      parseCsv(metadataCsv).find(
        (layer) => makeFileNameDatasetKey(layer?.filename) === d,
      ),
    );
    // console.log(parseCsv(metadataCsv));
    // console.log("selected: ", selected, "layers to unpack: ", layersToUnpack);
  }

  // function unpackSelectedLayers() {
  //   URL.revokeObjectURL(dataURL);
  //   dataURL = null;
  //   prepareToUnpack();

  //   const simpleWorker = new Worker(
  //     new URL("$lib/workers/loadFilesWorker.js", import.meta.url),
  //     { type: "module" },
  //   );

  //   simpleWorker.onmessage = (e) => {
  //     if (e.data.error) {
  //       console.warn(e.data.error);
  //       return;
  //     }

  //     // console.log("Processed data:", e.data);
  //     enrichedLayers = e.data.rasterLayers;
  //     policyLensArea = e.data.policyLensArea;
  //     lensIndices = e.data.lensIndices;
  //     if (e.data.bbox) {
  //       bbox = e.data.bbox;
  //     }
  //     // console.log(bbox);
  //     // canvasWidth = e.data.canvasWidth;
  //     if (e.data.canvasWidth) {
  //       width = e.data.canvasWidth;
  //     }
  //     // canvasHeight = e.data.canvasHeight;
  //     if (e.data.canvasHeight) {
  //       height = e.data.canvasHeight;
  //     }

  //     // console.log(enrichedLayers);

  //     blendLayers();
  //     simpleWorker.terminate();
  //   };

  //   simpleWorker.onerror = (e) => {
  //     console.error("Worker error:", e);
  //   };

  //   const safeLayersToUnpack = layersToUnpack.map((layer) => ({
  //     filename: layer.filename,
  //   }));

  //   simpleWorker.postMessage({
  //     layersToUnpack: safeLayersToUnpack,
  //     base,
  //     policyLens,
  //     customArea: new Uint32Array(customArea).buffer,
  //     settingsObject:
  //       gridType === "hectare" ? hectareSettings : tenMetreSettings,
  //     grid10mVariables,
  //     transformToGlobal: gridType === "hectare" ? false : true,
  //   });
  // }

  function unpackZippedLayers() {
    prepareToUnpack();
    URL.revokeObjectURL(dataURL);
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
      clonedPolicyLensLayerToUnpack = structuredClone(policyLensLayerToUnpack);
      // console.log(policyLensLayerToUnpack, clonedPolicyLensLayerToUnpack);
    }

    simpleZipWorker.onerror = (e) => {
      console.error("Worker error:", e);
    };

    const transferables = layersWithBuffers.map((l) => l.arrayBuffer);

    if (clonedPolicyLensLayerToUnpack?.arrayBuffer) {
      transferables.push(clonedPolicyLensLayerToUnpack.arrayBuffer);
    }

    simpleZipWorker.postMessage(
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
  }

  //Constants used for getting the LA breakdown
  // const baseUrl = `${base}/data/LAs/chunks/`;
  // const numChunks = 8; // update with actual number of chunks
  const baseUrl = `${base}/data/categorised-land`;
  const numChunks = 1; // update with actual number of chunks

  const chunkUrls = Array.from(
    { length: numChunks },
    // (_, i) => `${baseUrl}chunk_${i}.bin`,
    // (_, i) => `${baseUrl}/Simply_categorised_land_uint16.bin`,
    (_, i) => `${baseUrl}/ownership_cat_260518_8am.bin`,
  );

  // async function getLABreakdown(cRoutes, bitArray) {
  //   const urls = Array.isArray(cRoutes) ? cRoutes : [cRoutes];
  //   // const width = 5728;

  //   let accumulatedResult = null;
  //   let rowOffset = 0;

  //   // Single persistent worker
  //   const breakdownWorker = new Worker(
  //     new URL("$lib/workers/breakdownWorker.js", import.meta.url),
  //     { type: "module" },
  //   );

  //   const processChunk = (cChunk, aChunk) => {
  //     return new Promise((resolve, reject) => {
  //       breakdownWorker.onmessage = (e) => {
  //         const { json, error } = e.data;
  //         if (error) reject(new Error(error));
  //         else if (json) resolve(json);
  //         else console.log("Worker sent ignored message:", e.data);
  //       };
  //       // breakdownWorker.onerror = (err) => reject(err);
  //       breakdownWorker.onerror = (err) => {
  //         console.error("Worker error:", err);
  //         reject(new Error("Worker crashed"));
  //       };
  //       // main thread
  //       const csvUrl = `${base}/data/LAs/lad_may_2025_lookup.csv`;

  //       breakdownWorker.postMessage({
  //         categoricalArray: cChunk,
  //         bitArray: aChunk,
  //         csvUrl,
  //       });
  //     });
  //   };

  //   for (const url of urls) {
  //     // console.log("Fetching chunk:", url);
  //     const catBuffer = await fetch(url).then((r) => r.arrayBuffer());
  //     const evenLength = catBuffer.byteLength & ~1; // drop 1 byte if odd
  //     const safeBuffer = catBuffer.slice(0, evenLength);
  //     const cChunk = new Uint16Array(safeBuffer);

  //     const chunkRows = cChunk.length / width;
  //     const bitStart = rowOffset * width;
  //     const bitEnd = bitStart + chunkRows * width;
  //     const aChunk = bitArray.subarray(bitStart, bitEnd);

  //     // console.log("Sending chunk to worker:", cChunk.length, aChunk.length);

  //     const minLength = Math.min(cChunk.length, aChunk.length);
  //     const cChunkTrimmed = cChunk.subarray(0, minLength);
  //     const aChunkTrimmed = aChunk.subarray(0, minLength);

  //     const chunkResult = await processChunk(cChunkTrimmed, aChunkTrimmed);

  //     // Accumulate results
  //     if (!accumulatedResult) {
  //       accumulatedResult = chunkResult;
  //     } else {
  //       for (let i = 0; i < accumulatedResult.length; i++) {
  //         accumulatedResult[i].selected_area += chunkResult[i].selected_area;
  //         accumulatedResult[i].total_area = chunkResult[i].total_area; //Don't accumulate total area!
  //         accumulatedResult[i].selected_area_as_a_proportion_of_total_area +=
  //           chunkResult[i].selected_area_as_a_proportion_of_total_area;
  //       }
  //     }

  //     rowOffset += chunkRows;
  //   }

  //   breakdownWorker.terminate();
  //   console.log("All chunks processed, worker terminated");

  //   return { json: accumulatedResult, bitArray };
  // }

  async function getLABreakdown(cRoutes, bitArray, customArea) {
    const urls = Array.isArray(cRoutes) ? cRoutes : [cRoutes];

    const areaMask = customArea?.length
      ? indicesToBinaryMask(customArea, width, height)
      : null;
    console.log({ areaMask });
    let accumulatedResult = null;
    let rowOffset = 0;

    const breakdownWorker = new Worker(
      new URL("$lib/workers/breakdownWorker.js", import.meta.url),
      { type: "module" },
    );

    // More robust than reassigning onmessage each time
    const processChunk = (categoricalChunk, selectionChunk, areaChunk) =>
      new Promise((resolve, reject) => {
        const onMessage = (e) => {
          const { json, error } = e.data;
          if (error) reject(new Error(error));
          else resolve(json);
        };
        const onError = (err) => reject(new Error("Worker crashed"));
        console.log(categoricalChunk);
        breakdownWorker.addEventListener("message", onMessage, { once: true });
        breakdownWorker.addEventListener("error", onError, { once: true });

        // const csvUrl = `${base}/data/LAs/lad_may_2025_lookup.csv`;
        const csvUrl = `${base}/data/categorised-land/ownership_lookup_fine.csv`;

        breakdownWorker.postMessage({
          categoricalArray: categoricalChunk,
          selectionMask: selectionChunk,
          areaMask: areaChunk, // may be null
          csvUrl,
          numCats: 64465,
          numChunks,
          DENSITY_LUT,
        });
      });

    for (const url of urls) {
      const catBuffer = await fetch(url).then((r) => r.arrayBuffer());
      const evenLength = catBuffer.byteLength & ~1;
      const safeBuffer = catBuffer.slice(0, evenLength);
      const cChunk = new Uint16Array(safeBuffer);

      const chunkRows = cChunk.length / width;
      const bitStart = rowOffset * width;
      const bitEnd = bitStart + chunkRows * width;

      const selectionChunk = bitArray.subarray(bitStart, bitEnd);
      const areaChunk = areaMask ? areaMask.subarray(bitStart, bitEnd) : null;

      // ensure same length
      const minLength = Math.min(cChunk.length, selectionChunk.length);
      const cTrim = cChunk.subarray(0, minLength);
      const selTrim = selectionChunk.subarray(0, minLength);
      const areaTrim = areaChunk ? areaChunk.subarray(0, minLength) : null;

      const chunkResult = await processChunk(cTrim, selTrim, areaTrim);

      if (!accumulatedResult) {
        accumulatedResult = chunkResult;
      } else {
        for (let i = 0; i < accumulatedResult.length; i++) {
          accumulatedResult[i].selected_area += chunkResult[i].selected_area;
          accumulatedResult[i].total_area += chunkResult[i].total_area; // ✅ accumulate now
        }
      }

      rowOffset += chunkRows;
    }

    // final proportions (computed once)
    for (const row of accumulatedResult ?? []) {
      row.selected_area_as_a_proportion_of_total_area = row.total_area
        ? row.selected_area / row.total_area
        : 0;
    }

    breakdownWorker.terminate();
    return { json: accumulatedResult, bitArray };
  }

  function blendLayers() {
    done = selected.length > 0 ? false : true;
    if (selected.length === 0) {
      URL.revokeObjectURL(dataURL);
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

        getBreakdownAndCreateDensityCanvas();

        mobile.current
          ? (dataURL = await makeAndPaintCanvasFromIndicesMobile())
          : makeAndPaintCanvasFromIndices();
      } else if (e.data.error) {
        console.error("Blend worker error:", e.data.error);
        blendedIndices = new Uint32Array(0);
      }
    };
  }

  async function getBreakdownAndCreateDensityCanvas() {
    if (gridType === "hectare") {
      getLABreakdown(
        chunkUrls,
        indicesToBinaryMask(blendedIndices, width, height),
        customArea,
      )
        .then((result) => {
          breakdownData = result.json;
          // console.log("done breaking down: ", breakdownData);
        })
        .catch((err) => {
          console.error("Breakdown failed:", err);
        });
      densityDataURL = !mobile.current
        ? await createDensityCanvas(
            densityCanvas,
            blendedIndices,
            densityArray,
            DENSITY_LUT,
            height,
            width,
          )
        : await createDensityLayerMobile(
            blendedIndices,
            densityArray,
            DENSITY_LUT,
            bbox,
            opacity,
            height,
            width,
          );
    }
  }

  function makeAndPaintCanvasFromIndices() {
    console.time("canvas-indices");
    done = false;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    console.log(width, height);
    const imageData = ctx.createImageData(width, height);

    const pixelCount = imageData.data.length / 4;
    const mask = new Uint8Array(pixelCount);

    const areaIndices = currentBitArrays[selectedRestrictionIndex];
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
      URL.revokeObjectURL(dataURL);
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

    const areaIndices = currentBitArrays[selectedRestrictionIndex];

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
    done = false;
    URL.revokeObjectURL(dataURL);
    dataURL = null;
    prepareToUnpack();

    const worker = new Worker(
      new URL("$lib/workers/pipelineWorker.js", import.meta.url),
      { type: "module" },
    );

    return new Promise((resolve, reject) => {
      worker.onmessage = async (e) => {
        if (e.data.error) {
          console.error("Worker error:", e.data);
          reject(new Error(e.data.error));
          worker.terminate();
          return;
        }
        console.log("worker message: ", e.data);
        // Final buffers from worker
        enrichedLayers = e.data.rasterLayers;
        currentBitArrays = e.data.rasterLayers.map(
          (l) => new Uint32Array(l.data.buffer),
        );
        blendedArrayLength = e.data.blendedArrayLength;
        policyLensArea = e.data.policyLensArea;
        lensIndices = new Uint32Array(e.data.lensIndices);
        blendedIndices = new Uint32Array(e.data.blendedIndices);
        uniqueCounts = new Uint32Array(e.data.uniqueCounts);
        uniqueArrays = e.data.uniqueArrays.map(
          (buf: ArrayBuffer) => new Uint32Array(buf),
        );
        // if (e.data.bbox) {
        //   bbox = e.data.bbox;
        // }
        // canvasWidth = e.data.canvasWidth;
        if (e.data.canvasWidth) {
          width = e.data.canvasWidth;
        }
        // canvasHeight = e.data.canvasHeight;
        if (e.data.canvasHeight) {
          height = e.data.canvasHeight;
        }
        const debug = e.data.debug;
        const tileIndex = e.data.tileIndex;

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
        done = true;
        resolve(true);

        // if (gridType === "hectare") {
        mobile.current
          ? (dataURL = await makeAndPaintCanvasFromIndicesMobile())
          : makeAndPaintCanvasFromIndices();
        // }

        getBreakdownAndCreateDensityCanvas();
      };

      worker.onerror = (err) => {
        console.error("Worker failed", err);
        worker.terminate();
        reject(err);
      };

      // Prepare transferable data
      const safeLayers = layersToUnpack?.map((l) => ({ filename: l.filename }));
      // const customAreaBuffer = customArea ? customArea.buffer : null;

      worker.postMessage(
        {
          layersToUnpack: safeLayers,
          base,
          policyLens,
          customArea: new Uint32Array(customArea ? customArea : []).buffer,
          settingsObject:
            gridType === "hectare" ? hectareSettings : tenMetreSettings,
          grid10mVariables,
          transformToGlobal: gridType === "hectare" ? false : true,
          tileCodes: [...tileCodes],
        },
        // customAreaBuffer ? [customAreaBuffer] : [],
      );
    });
  }

  // console.log({ grid10mVariables });

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

  function downloadGeoJSON() {
    const filename = "data.geojson";

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

  async function showDensity() {
    console.time("show-density");
    done = false;
    await tick();
    seeDensity = true;
    seeArea = false;

    done = true;
    console.timeEnd("show-density");
  }

  const densityStats = $derived(
    gridType === "hectare"
      ? computeDensityStats(blendedIndices, densityArray, {
          width,
          height,
          colOffset: 0,
        })
      : null,
  );

  function showArea() {
    seeDensity = false;
    seeArea = true;
    console.log("showing area");
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
        return { value: d.LAD25CD, text: d.LAD25NM };
      })
      .sort((a, b) => a.text.localeCompare(b.text));
    interim?.unshift({ text: "", value: "" });
    return interim;
  });
  // $inspect(LAselectOptions);

  let selectedAreaWording = $derived(
    selectedLA
      ? LAselectOptions.find((d) => d.value === selectedLA)["text"]
      : (policyLensItems.find((d) => d.value == policyLens)?.sentenceText ??
          '"' + makeFileNameReadable(policyLens, gridType) + '"'),
  );
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
            {#if gridType === "hectare"}
              <Select
                id="policyLensInput"
                name="policyLensInput"
                items={policyLensItems}
                bind:value={policyLens}
                label={"Select area to explore"}
                onchange={async () => {
                  customAreaBBox = undefined;
                  customArea = null;
                  drawnFeature = undefined;
                  Object.keys(tiffArrayBuffersFromZip).length > 0
                    ? unpackZippedLayers()
                    : // : unpackSelectedLayers();
                      await unpackAndBlendLayers();
                }}
              />
              <p class="or">~ or ~</p>
            {/if}

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
                label={"Select a local authority:"}
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
          {startingPosition}
          {selectedSubLayers}
          bind:selected
          bind:policyLens
          {openPanelAndScrollToMap}
          {categoryToColor}
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
          URL.revokeObjectURL(dataURL);
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
              bind:selectedLA
              bind:policyLens
              bind:drawing
              {unpackAndBlendLayers}
              {unpackZippedLayers}
              {usingGeoTiff}
              {mobile}
              {gridType}
              {markerLocation}
              {seeMarker}
              {tileCodes}
              {tileIndex}
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
                content: barChartSnippet,
              },
            ]
          : [
              {
                id: "table",
                label: "Results",
                content: tableSnippet,
              },
            ]}
        {showDensity}
        {showArea}
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
                {makeAndPaintCanvasFromIndices}
                {makeAndPaintCanvasFromIndicesMobile}
                bind:dataURL
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
                      policyLens,
                      policyLensItems,
                      selected,
                      gridType,
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
                onClickFunction={downloadGeoJSON}
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
            <div>
              <Button
                buttonType="secondary"
                textContent={seeMarker ? "Hide where" : "Show me where"}
                onClickFunction={showMarker}
              />
            </div>

            <Histogram histogram={densityStats.histogram} />
          {:else}
            <Spinner />
          {/if}
        {/if}
      {/snippet}
      {#snippet barChartSnippet()}
        <Radios
          legend="View the breakdown by:"
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
              value: "proportion",
              label:
                "Percentage of the total that is covered by the selected categories",
            },
          ]}
        ></Radios>
        {#if breakdownChartSortValue === "proportion"}
          {#each summaryByCategory as [key, value]}
            {@const barWidth =
              breakdownChartSortValue === "selected"
                ? value.selected / summaryByCategoryMaxValue.selected
                : breakdownChartSortValue === "total"
                  ? value.total / summaryByCategoryMaxValue.total
                  : (value.selected / value.total ?? 0)}
            {#if value.selected}
              <div class="mosaic-row">
                <div class="mosaic-row-label">{key}</div>
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
          />
        {/if}
      {/snippet}
    </div>
  </div>
</div>

<style>
  .or {
    text-align: center;
    font-style: italic;
  }

  :global(.ol-zoom) {
    left: var(--zoom-control-position);
    transition: left 0.1s ease;
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
