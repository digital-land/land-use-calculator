<script lang="ts">
  import "/node_modules/ol/ol.css";
  import { onMount } from "svelte";
  import { register } from "ol/proj/proj4";
  import { Map, View } from "ol";
  import Control from "ol/control/Control.js";
  import {
    Tile as TileLayer,
    VectorTile as VectorTileLayer,
    Image as ImageLayer,
    Vector as VectorLayer,
  } from "ol/layer";
  import {
    VectorTile as VectorTileSource,
    ImageStatic,
    XYZ,
    Vector as VectorSource,
  } from "ol/source";
  import Point from "ol/geom/Point.js";
  import Feature from "ol/Feature.js";
  import { GeoJSON, MVT, WKT } from "ol/format";
  import { TileGrid } from "ol/tilegrid";
  import { Style, Stroke, Fill, Circle as CircleStyle } from "ol/style";
  import FullScreen from "ol/control/FullScreen.js";
  import { defaults as defaultControls } from "ol/control/defaults.js";
  import Draw from "ol/interaction/Draw.js";
  import Modify from "ol/interaction/Modify.js";
  import proj4 from "proj4";
  import { apply, applyStyle } from "ol-mapbox-style";
  import { apiKey, serviceUrl, tiles, CODES } from "$lib/constants";
  import {
    coordToIndex,
    // createGroupLayer,
    // type MapGroup,
    // geometryToGridHitsScanline,
    // tilesForBBox,
  } from "$lib/utils";

  let {
    dataURL,
    densityDataURL,
    breakdownDataURL,
    densityMetric,
    bbox,
    selectedAreaName = $bindable(),
    breakdownData,
    blendedIndices,
    seeDensity,
    seeArea,
    seeBreakdown,
    width,
    height,
    opacity = $bindable(),
    densityArray,
    breakdownArray,
    // customArea = $bindable(),
    customAreaBBox,
    drawnFeature = $bindable(),
    selectedLA = $bindable(),
    policyLens = $bindable(),
    drawing = $bindable(),
    mobile,
    gridType,
    markerLocation,
    seeMarker,
    tileCodes,
    tileIndex,
  } = $props();

  // $inspect("breakdownDataURL", breakdownDataURL);

  let mapElement: HTMLDivElement;
  let map: Map;
  let tiffLayer, densityLayer, breakdownLayer;
  let osmBaseLayer: TileLayer,
    ordnanceSurveyBaseLayer: VectorTileLayer,
    aerialBaseLayer: TileLayer,
    currentBaseMap;

  // const markerLocation = [287868, 50139];

  //Form WTK from tileCodes
  function getWKTFromTileCodes() {
    const tilesWKTs = tileCodes?.map(
      (d) => tiles.find((e) => e.code === d).square,
    );
    return "GEOMETRYCOLLECTION(" + tilesWKTs?.join(", ") + ")";
  }
  // WKT
  const wkt =
    tileCodes?.length > 0 ? getWKTFromTileCodes() : "GEOMETRYCOLLECTION EMPTY";

  const format = new WKT();

  const feature = format.readFeature(wkt, {
    dataProjection: "EPSG:27700",
    featureProjection: "EPSG:27700",
  });

  const wktVector = new VectorLayer({
    source: new VectorSource({
      features: [feature],
    }),
    style: new Style({
      fill: new Fill({
        color: "transparent",
      }),
      stroke: new Stroke({
        color: "teal",
        width: 2,
      }),
    }),
  });

  // const wktEng =
  //   "POLYGON((50000 0,50000 700000,700000 700000,700000 0,50000 0))";

  // const formatEngland = new WKT();

  // const featureEngland = formatEngland.readFeature(wktEng, {
  //   dataProjection: "EPSG:27700",
  //   featureProjection: "EPSG:27700",
  // });

  // const wktEngland = new VectorLayer({
  //   source: new VectorSource({
  //     features: [featureEngland],
  //   }),
  // });

  const marker = $derived(
    new Feature({
      type: "circle",
      geometry: new Point(markerLocation),
    }),
  );

  const markerSource = $derived(
    new VectorSource({
      features: [marker],
    }),
  );

  const markerLayer = new VectorLayer({
    source: markerSource,
    style: new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: "black" }),
        stroke: new Stroke({
          color: "white",
          width: 2,
        }),
      }),
    }),
  });

  $effect(() => {
    console.log("UPDATING marker source");
    if (seeMarker && markerLocation) {
      map?.removeLayer(markerLayer);
      const newMarkerSource = markerSource;
      markerLayer.setSource(newMarkerSource);
      map?.addLayer(markerLayer);
    }
  });

  $effect(() => {
    if (!seeMarker) {
      map?.removeLayer(markerLayer);
    }
  });

  const drawSource = new VectorSource({ wrapX: false });

  const drawStyle = new Style({
    fill: new Fill({
      color: "rgba(255, 0, 0, 0.05)", // red with transparency (polygon fill)
    }),
    stroke: new Stroke({
      color: "red", // line color
      width: 2,
    }),
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({
        color: "red", // point color
      }),
      stroke: new Stroke({
        color: "#fff",
        width: 1,
      }),
    }),
  });

  const drawLayer = new VectorLayer({
    source: drawSource,
    style: drawStyle,
  });

  let draw: Draw = $state();
  let modify: Modify = $state();

  //Makes sense on desktop but nonsense on mobile - when dataURL is a LayerGroup
  let tiffLayerSource = $derived(
    new ImageStatic({
      url: dataURL,
      imageExtent: bbox,
      projection: "EPSG:27700",
      interpolate: false,
    }),
  );

  //Makes sense on desktop but nonsense on mobile as above
  let densityLayerSource = $derived(
    new ImageStatic({
      url: densityDataURL,
      imageExtent: bbox,
      projection: "EPSG:27700",
      interpolate: false,
    }),
  );

  let breakdownLayerSource = $derived(
    new ImageStatic({
      url: breakdownDataURL,
      imageExtent: bbox,
      projection: "EPSG:27700",
      interpolate: false,
    }),
  );

  onMount(async () => {
    proj4.defs(
      "EPSG:27700",
      "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs",
    );
    register(proj4);

    const service = await fetch(`${serviceUrl}?key=${apiKey}`).then((r) =>
      r.json(),
    );

    const extent = [
      service.fullExtent.xmin,
      service.fullExtent.ymin,
      service.fullExtent.xmax,
      service.fullExtent.ymax,
    ];
    const origin = [service.tileInfo.origin.x, service.tileInfo.origin.y];
    const resolutions = service.tileInfo.lods
      .map((l) => l.resolution)
      .slice(0, 16);
    const tileSize = service.tileInfo.rows;
    const tiles = service.tiles[0];

    const tileGrid = new TileGrid({
      extent,
      origin,
      resolutions,
      tileSize,
    });

    ordnanceSurveyBaseLayer = new VectorTileLayer({
      declutter: true,
      source: new VectorTileSource({
        format: new MVT(),
        url: tiles,
        projection: "EPSG:27700",
        tileGrid,
        attributions:
          "Contains OS data © Crown copyright and database rights 2026",
      }),
    });

    await applyStyle(
      ordnanceSurveyBaseLayer,
      `${serviceUrl}/${service.defaultStyles}?key=${apiKey}`,
      "",
      { resolutions },
    );

    const geoJsonVectorSource = new VectorSource({
      // url: "LAD_MAY_2025_UK_BGC_England.geojson",
      url: "LPA_APR_2023_England_BGC_V2.geojson",
      format: new GeoJSON({
        dataProjection: "EPSG:4326", // projection of the GeoJSON file
        featureProjection: "EPSG:27700", // projection of the map
      }),
    });

    const scotlandAndWales = new VectorSource({
      url: "ScotlandAndWalesSimplified.geojson",
      format: new GeoJSON({
        dataProjection: "EPSG:4326", // projection of the GeoJSON file
        featureProjection: "EPSG:27700", // projection of the map
      }),
    });

    const scotlandAndWalesVectorLayer = new VectorLayer({
      source: scotlandAndWales,
      style: (feature, resolution) => {
        return new Style({
          fill: new Fill({
            color: "rgba(255,255,255,0.8)",
          }),
        });
      },
    });

    const geoJsonVectorLayer = new VectorLayer({
      source: geoJsonVectorSource,
      style: (feature, resolution) => {
        const isHovered = feature.get("hover") === true;

        const width =
          resolution < 1 ? 5 : resolution < 5 ? 4 : isHovered ? 3 : 1;
        return new Style({
          stroke: new Stroke({
            color: "teal",
            width: width,
          }),
          fill: new Fill({
            // Subtle hover effect: higher opacity when hovered
            color: isHovered
              ? "rgba(0, 123, 0, 0.15)" // hovered
              : "rgba(0, 123, 0, 0)", // normal (transparent)
          }),
        });
      },
    });

    tiffLayer = mobile.current
      ? dataURL
      : new ImageLayer({
          source: tiffLayerSource,
          opacity,
        });

    densityLayer = mobile.current
      ? densityDataURL
      : new ImageLayer({
          source: densityLayerSource,
          opacity,
        });

    breakdownLayer = mobile.current
      ? breakdownDataURL
      : new ImageLayer({
          source: breakdownLayerSource,
          opacity,
        });

    osmBaseLayer = new TileLayer({
      source: new XYZ({
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attributions: `Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>`,
      }),
    });

    aerialBaseLayer = new TileLayer({
      source: new XYZ({
        url: "https://tiledbasemaps.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attributions:
          "Esri, Vantor, Earthstar Geographics, and the GIS User Community",
      }),
    });

    currentBaseMap = ordnanceSurveyBaseLayer;

    if (drawnFeature) {
      drawSource.addFeature(drawnFeature);
    }
    let initialLayers =
      densityLayer && breakdownLayer
        ? [
            currentBaseMap,
            wktVector,
            drawLayer,
            geoJsonVectorLayer,
            scotlandAndWalesVectorLayer,
            tiffLayer,
            densityLayer,
            breakdownLayer,
            // markerLayer,

            // wktEngland,
          ]
        : [
            currentBaseMap,
            wktVector,
            drawLayer,
            geoJsonVectorLayer,
            scotlandAndWalesVectorLayer,
            tiffLayer,
            // markerLayer,

            // wktEngland,
          ];

    const modifyGeoJsonButton =
      document?.getElementById("modifyGeoJson") ?? undefined;
    const modifyShapeControl = new Control({ element: modifyGeoJsonButton });

    // if (densityLayer) {
    map = new Map({
      controls: defaultControls().extend([
        new FullScreen(),
        modifyShapeControl,
      ]),
      target: mapElement,
      layers: initialLayers,
      view: new View({
        projection: "EPSG:27700",
        extent: [-238375.0, 0.0, 900000.0, 1376256.0],
        resolutions,
        minZoom: 1,
        maxZoom: 12,
        center: [377297, 353995],
        // zoom: 1,
      }),
    });
    if (seeArea) {
      densityLayer?.setVisible(false);
      breakdownLayer?.setVisible(false);
    } else if (seeDensity) {
      tiffLayer?.setVisible(false);
      breakdownLayer?.setVisible(false);
    } else {
      tiffLayer?.setVisible(false);
      densityLayer?.setVisible(false);
    }

    if (gridType === "hectare") {
      wktVector?.setVisible(false);
    }
    // }

    draw = new Draw({
      source: drawSource,
      type: "Polygon",
      style: drawStyle,
    });

    // map.addInteraction(draw);

    modify = new Modify({ source: drawSource });

    draw.on("drawend", async function (event) {
      drawnFeature = event.feature;

      selectedLA = null;

      policyLens = "customArea";

      map.removeInteraction(draw);
      drawing = false;
    });

    if (customAreaBBox) {
      console.log({ customAreaBBox });
      map.getView().fit(customAreaBBox, {
        duration: 1000,
        padding: [20, 20, 20, 20],
        maxZoom: 10,
      });
    } else {
      //Zoom to the area
      map.getView().fit(bbox, { duration: 1000 });
    }

    map.on("singleclick", function (evt) {
      // console.log(evt.target.getCoordinateFromPixel(evt.pixel));
      map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        const props = feature.getProperties();

        // console.log("Feature clicked:", props, evt.pixel);
        if (props.LAD25NM || props.LPA23NM) {
          selectedAreaName = props.LAD25NM || props.LPA23NM;

          // map.getView().fit(props.geometry?.extent_, { duration: 1000 });
        }

        return true; // stop after first match
      });
    });

    const info = document.getElementById("info");

    let currentFeature;

    function isFeature(obj) {
      return (
        obj && typeof obj.get === "function" && typeof obj.set === "function"
      );
    }

    const displayFeatureInfo = function (pixel, target) {
      if (!drawing) {
        const feature = target.closest(".ol-control")
          ? undefined
          : map.forEachFeatureAtPixel(pixel, (feature) => feature);

        // Handle hover state
        if (feature !== currentFeature) {
          if (isFeature(currentFeature)) {
            currentFeature.set("hover", false);
          }

          if (isFeature(feature)) {
            feature.set("hover", true);
          }

          currentFeature = feature;
          // geoJsonVectorSource.changed();
        }

        // Tooltip UI
        if (
          isFeature(feature) &&
          (feature.get("LAD25NM") || feature.get("LPA23NM"))
        ) {
          info.style.left = pixel[0] + 15 + "px";
          info.style.top = pixel[1] + 15 + "px";
          info.style.visibility = "visible";

          info.innerHTML =
            gridType !== "hectare"
              ? feature.get("LAD25NM") || feature.get("LPA23NM")
              : "<b>" +
                (feature.get("LAD25NM") || feature.get("LPA23NM")) +
                "</b>" +
                "<br>" +
                "Area: " +
                Number(
                  breakdownData?.find(
                    (d) =>
                      d.area_code ===
                      (feature.get("LAD25CD") || feature.get("LPA23CD")),
                  )?.total_area,
                ).toLocaleString() +
                "ha" +
                // "<b>" +
                // (feature.get("LAD25NM") || feature.get("LPA23NM")) +
                // "</b>" +
                "<br>" +
                "Area covered by the current selections: " +
                Number(
                  breakdownData?.find(
                    (d) =>
                      d.area_code ===
                      (feature.get("LAD25CD") || feature.get("LPA23CD")),
                  )?.selected_area,
                ).toLocaleString() +
                "ha" +
                "<br> (" +
                (
                  Number(
                    breakdownData?.find(
                      (d) =>
                        d.area_code ===
                        (feature.get("LAD25CD") || feature.get("LPA23CD")),
                    )?.selected_area_as_a_proportion_of_total_area,
                  ) * 100
                ).toFixed(0) +
                "%)";
        } else {
          info.style.visibility = "hidden";
        }
      }
    };

    map.on("pointermove", function (evt) {
      if (evt.dragging) {
        info.style.visibility = "hidden";
        if (currentFeature) currentFeature.set("hover", false);
        currentFeature = undefined;
        return;
      }
      if (seeArea) {
        displayFeatureInfo(evt.pixel, evt.originalEvent.target);
      } else if (
        blendedIndices.includes(
          coordToIndex(...evt.coordinate, { width, height }),
        )
      ) {
        info.style.left = evt.pixel[0] + 15 + "px";
        info.style.top = evt.pixel[1] + 15 + "px";
        info.style.visibility = "visible";

        info.innerHTML = seeBreakdown
          ? (CODES.find(
              (d) =>
                d[0] ===
                breakdownArray[
                  coordToIndex(...evt.coordinate, { width, height })
                ],
            )?.[1]
              ?.replaceAll(".", " > ")
              ?.replaceAll("_", " ") ?? "Unregistered")
          : densityArray[coordToIndex(...evt.coordinate, { width, height })] +
            (densityArray[
              coordToIndex(...evt.coordinate, { width, height })
            ] === 1
              ? densityMetric == "dwellings"
                ? " dwelling" + " at this location"
                : " business address" + " at this location"
              : " " + densityMetric + " at this location");
      } else {
        info.style.visibility = "hidden";
      }
    });

    map.on("singleclick", function (evt) {
      if (seeArea) {
        displayFeatureInfo(evt.pixel, evt.originalEvent.target);
      }
    });

    map.getTargetElement()?.addEventListener("pointerleave", function () {
      if (isFeature(currentFeature)) currentFeature.set("hover", false);
      currentFeature = undefined;
      info.style.visibility = "hidden";
    });
  });

  $effect(() => {
    if (drawing) {
      map?.addInteraction(draw);
    }
  });

  $effect(() => {
    if (seeArea) {
      tiffLayer?.setVisible(true);
      densityLayer?.setVisible(false);
      breakdownLayer?.setVisible(false);
    } else if (seeDensity) {
      tiffLayer?.setVisible(false);
      densityLayer?.setVisible(true);
      breakdownLayer?.setVisible(false);
    } else {
      tiffLayer?.setVisible(false);
      densityLayer?.setVisible(false);
      breakdownLayer?.setVisible(true);
    }
  });

  $effect(() => {
    console.log("UPDATING tiff source");

    if (!mobile.current) {
      const newSource = tiffLayerSource; // Need this line so that Svelte has a dependedncy to track
      tiffLayer?.setSource(newSource);
    } else {
      const oldTiffLayer = tiffLayer;
      map?.removeLayer(oldTiffLayer);
      tiffLayer = dataURL;
      map?.addLayer(tiffLayer);
    }
  });

  $effect(() => {
    console.log("UPDATING density source");

    if (!mobile.current) {
      const newSource = densityLayerSource; // Need this line so that Svelte has a dependedncy to track
      densityLayer?.setSource(newSource);
    } else {
      const oldDensityLayer = densityLayer;
      map?.removeLayer(oldDensityLayer);
      densityLayer = densityDataURL;
      map?.addLayer(densityLayer);
    }
  });

  $effect(() => {
    console.log("UPDATING breakdown source");

    if (!mobile.current) {
      const newSource = breakdownLayerSource; // Need this line so that Svelte has a dependedncy to track
      breakdownLayer?.setSource(newSource);
    } else {
      const oldBreakdownLayer = breakdownLayer;
      map?.removeLayer(oldBreakdownLayer);
      breakdownLayer = breakdownDataURL;
      map?.addLayer(breakdownLayer);
    }
  });

  let basemapLookup = $derived({
    OS: ordnanceSurveyBaseLayer,
    osm: osmBaseLayer,
    aerial: aerialBaseLayer,
  });

  function updateBaseMap(value) {
    map?.removeLayer(currentBaseMap);
    map?.getLayers().insertAt(0, basemapLookup[value]);
    currentBaseMap = basemapLookup[value];
  }

  let shapeModifiable: boolean = $state(false);
  // $inspect(shapeModifiable);

  function makeShapeModifiable() {
    map?.addInteraction(modify);
    shapeModifiable = true;
  }

  async function useModifiedShape() {
    shapeModifiable = false;
    map?.removeInteraction(modify);

    const cloned = drawSource.getFeatures()[0].clone();
    // console.log(cloned);
    drawnFeature = cloned;
    selectedLA = null;
  }
</script>

<div bind:this={mapElement} class="map-container" tabindex="0">
  <div id="info"></div>
  {#if drawnFeature}
    <div id="modifyGeoJson" class="ol-unselectable ol-control">
      <button
        onclick={() =>
          !shapeModifiable ? makeShapeModifiable() : useModifiedShape()}
        type="button"
        aria-pressed={shapeModifiable}
        role="switch"
        aria-checked={shapeModifiable}
      >
        <svg
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
          // class="ons-svg-icon ons-svg-icon--m svelte-6cb5el"
          fill="currentColor"
          ><!----><path
            d="M28.83 6.17a4 4 0 0 0-6.302.845L19 6.053a4 4 0 1 0-7.549 1.793L7.21 11.665a4.01 4.01 0 0 0-5.039.506 4 4 0 0 0 5.361 5.927l8.75 6.42a4 4 0 1 0 5.947-1.837l3.423-9.699q.172.015.345.016a4 4 0 0 0 2.829-6.828zM13.58 4.584a2 2 0 1 1-.433 2.18 2 2 0 0 1 .438-2.18zm-10 11.831a2 2 0 1 1 2.826-2.83 2 2 0 0 1-2.826 2.83m17.831 11a2 2 0 1 1-2.829-2.828 2 2 0 0 1 2.83 2.828m-1.069-5.398a4 4 0 0 0-2.874.886l-8.75-6.42a4.02 4.02 0 0 0-.168-3.332l4.244-3.818a4 4 0 0 0 5.683-1.352L22 8.945a4 4 0 0 0 1.765 3.375zm7.07-11.604a2 2 0 1 1-2.825-2.828 2 2 0 1 1 2.83 2.829z"
          ></path><!----></svg
        ><span class="hidden-button-text"
          >{!shapeModifiable
            ? "Edit the shape"
            : "Finish editing the shape"}</span
        ></button
      >
    </div>
  {/if}
  <div class="basemap-picker-control ol-control">
    <label for="basemap-picker">Select base map:</label>
    <select
      name="Select base map"
      id="basemap-picker"
      onchange={(e) => updateBaseMap(e.target.value)}
    >
      <option value="OS">Ordnance Survey</option>
      <option value="osm">Open Street Map</option>
      <option value="aerial">Aerial Imagery</option>
    </select>
  </div>
</div>

<style>
  @import url(//fonts.googleapis.com/css?family=Source+Sans+Pro);

  .map-container {
    width: fit-content;
    height: calc(100% - 20px);
    width: calc(100% - 20px);
    padding: 10px;
    position: relative;
  }

  :global(.ol-control button) {
    min-height: 24px;
    min-width: 24px;
  }

  #info {
    position: absolute;
    display: inline-block;
    height: auto;
    width: auto;
    z-index: 100;
    background-color: #333;
    color: #fff;
    text-align: left;
    border-radius: 4px;
    padding: 5px;
    left: 50%;
    transform: translateX(3%);
    visibility: hidden;
    pointer-events: none;
  }

  .basemap-picker-control {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(255, 255, 255, 0.5);
    width: fit-content;
    z-index: 9;
    display: block;
    padding: 3px;
  }

  .basemap-picker-control select {
    background: rgba(255, 255, 255, 0.5);
  }

  #modifyGeoJson {
    top: 65px;
    /* left: 0.5em; */
    --font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",
      "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
    --color-gray-50: oklch(98.5% 0.002 247.839);
    --color-gray-400: oklch(70.7% 0.022 261.325);
    --color-gray-700: oklch(37.3% 0.034 259.733);
    --color-black: #000;
    --color-white: #fff;
    --spacing: 0.25rem;
    --text-xl: 1.25rem;
    --text-xl--line-height: calc(1.75 / 1.25);
    --text-2xl: 1.5rem;
    --text-2xl--line-height: calc(2 / 1.5);
    --font-weight-bold: 700;
    --radius-sm: 0.25rem;
    --radius-md: 0.375rem;
    --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
    --default-transition-duration: 150ms;
    --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    --default-font-family: var(--font-sans);
    --default-mono-font-family: var(--font-mono);
    --tw-duration: 200ms;
    --tw-ease: var(--ease-in-out);
    --ol-background-color: white;
    --ol-accent-background-color: #f5f5f5;
    --ol-subtle-background-color: rgba(128, 128, 128, 0.25);
    --ol-partial-background-color: rgba(255, 255, 255, 0.75);
    --ol-foreground-color: #333333;
    --ol-subtle-foreground-color: #666666;
    --ol-brand-color: #00aaff;
    --govuk-frontend-version: "5.11.1";
    --govuk-breakpoint-mobile: 20rem;
    --govuk-frontend-breakpoint-mobile: var(--govuk-breakpoint-mobile);
    --govuk-breakpoint-tablet: 40.0625rem;
    --govuk-frontend-breakpoint-tablet: var(--govuk-breakpoint-tablet);
    --govuk-breakpoint-desktop: 48.0625rem;
    --govuk-frontend-breakpoint-desktop: var(--govuk-breakpoint-desktop);
    --mapWidth: 50%;
    --tw-translate-x: 0%;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    pointer-events: auto;
    display: block;
    margin: 1px;
    padding: 0;
    color: var(--ol-subtle-foreground-color);
    font-weight: bold;
    text-decoration: none;
    font-size: inherit;
    text-align: center;
    height: 1.375em;
    width: 1.375em;
    line-height: 0.4em;
    background-color: var(--ol-background-color);
    border: none;
    min-height: 24px;
    min-width: 24px;
    border-radius: 2px 2px 0 0;
  }
  .ol-touch #modifyGeoJson {
    top: 80px;
  }

  .hidden-button-text {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    user-select: none;
    width: 1px;
    font-size: 0.875rem;
  }
</style>
