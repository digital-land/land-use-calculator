<script lang="ts">
  import "/node_modules/ol/ol.css";
  import { onMount } from "svelte";
  import { register } from "ol/proj/proj4";
  import { Map, View } from "ol";
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
  import proj4 from "proj4";
  import { apply, applyStyle } from "ol-mapbox-style";
  import { apiKey, serviceUrl, tiles, CODES } from "$lib/constants";
  import {
    coordToIndex,
    // createGroupLayer,
    // type MapGroup,
    // geometryToGridHitsScanline,
    tilesForBBox,
  } from "$lib/utils";

  let {
    dataURL,
    densityDataURL,
    bbox,
    selectedAreaName = $bindable(),
    breakdownData,
    blendedIndices,
    seeDensity = $bindable(),
    seeArea = $bindable(),
    width,
    height,
    opacity = $bindable(),
    densityArray,
    customArea = $bindable(),
    customAreaBBox = $bindable(),
    drawnFeature = $bindable(),
    selectedLA = $bindable(),
    policyLens = $bindable(),
    drawing = $bindable(),
    unpackAndBlendLayers,
    unpackZippedLayers,
    usingGeoTiff,
    mobile,
    gridType,
    markerLocation,
    seeMarker,
    tileCodes,
    tileIndex,
  } = $props();

  $inspect("tileCodes", tileCodes);

  let mapElement: HTMLDivElement;
  let map: Map;
  let tiffLayer, densityLayer;
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
      url: "LAD_MAY_2025_UK_BGC_England.geojson",
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
    let initialLayers = densityLayer
      ? [
          currentBaseMap,
          wktVector,
          drawLayer,
          geoJsonVectorLayer,
          scotlandAndWalesVectorLayer,
          tiffLayer,
          densityLayer,
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

    // if (densityLayer) {
    map = new Map({
      controls: defaultControls().extend([new FullScreen()]),
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
    } else {
      tiffLayer?.setVisible(false);
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

    draw.on("drawend", async function (event) {
      drawnFeature = event.feature;

      selectedLA = null;
      // const geometry = event.feature.getGeometry();
      // customAreaBBox = geometry.getExtent();

      // const drawnData = geometryToGridHitsScanline(
      //   geometry,
      //   bbox,
      //   width,
      //   height,
      // );
      // tileCodes = await tilesForBBox(
      //   drawnFeature.getGeometry().getExtent(),
      //   tileIndex,
      //   50000,
      // );
      // tileCodes = drawnData.tileCodes;
      // customArea = drawnData.customArea;
      // console.log(tileCodes);
      policyLens = "customArea";

      if (usingGeoTiff) {
        unpackZippedLayers();
      } else {
        await unpackAndBlendLayers();
      }

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
        if (props.LAD25NM) {
          selectedAreaName = props.LAD25NM;

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
        if (isFeature(feature) && feature.get("LAD25NM")) {
          info.style.left = pixel[0] + 15 + "px";
          info.style.top = pixel[1] + 15 + "px";
          info.style.visibility = "visible";

          info.innerHTML =
            gridType !== "hectare"
              ? feature.get("LAD25NM")
              : "<b>" + feature.get("LAD25NM") + "</b>";
          // "<br>" +
          // "Area covered by the current selections: " +
          // Number(
          //   breakdownData?.find(
          //     (d) => d.area_code === feature.get("LAD25CD"),
          //   )?.selected_area,
          // ).toLocaleString() +
          // "ha" +
          // "<br> (" +
          // (
          //   Number(
          //     breakdownData?.find(
          //       (d) => d.area_code === feature.get("LAD25CD"),
          //     )?.selected_area_as_a_proportion_of_total_area,
          //   ) * 100
          // ).toFixed(0) +
          // "%)";
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
        // console.log(
        //   "in blended indices: " +
        //     coordToIndex(...evt.coordinate, { width, height }) +
        //     " " +
        //     densityArray[coordToIndex(...evt.coordinate, { width, height })],
        //   +width + " " + height,
        // );
        info.style.left = evt.pixel[0] + 15 + "px";
        info.style.top = evt.pixel[1] + 15 + "px";
        info.style.visibility = "visible";

        info.innerHTML =
          CODES.find(
            (d) =>
              d[0] ===
              densityArray[coordToIndex(...evt.coordinate, { width, height })],
          )?.[1] ?? "Unregistered";
        // densityArray[coordToIndex(...evt.coordinate, { width, height })] +
        // (densityArray[coordToIndex(...evt.coordinate, { width, height })] ===
        // 1
        //   ? " title at this location"
        //   : " titles at this location");
      } else {
        // console.log(
        //   "NOT in blended indices: " +
        //     coordToIndex(...evt.coordinate, { width, height }) +
        //     " " +
        //     densityArray[coordToIndex(...evt.coordinate, { width, height })],
        //   +blendedIndices.length,
        // );
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
    } else {
      tiffLayer?.setVisible(false);
      densityLayer?.setVisible(true);
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
</script>

<div bind:this={mapElement} class="map-container" tabindex="0">
  <div id="info"></div>
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
</style>
