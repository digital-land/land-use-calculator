<script>
  let {
    dataURL,
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
    densityGroup,
    customArea = $bindable(),
    customAreaBBox = $bindable(),
    policyLens = $bindable(),
    drawing = $bindable(),
    unpackSelectedLayers,
  } = $props();

  import "/node_modules/ol/ol.css";
  import { onMount } from "svelte";
  // import { onDestroy } from "svelte";
  //import GeoTIFF from 'ol/source/GeoTIFF';
  // import WebGLTileLayer from "ol/layer/WebGLTile";
  import { register } from "ol/proj/proj4";
  import { Map, View } from "ol";
  import TileLayer from "ol/layer/Tile.js";
  import XYZ from "ol/source/XYZ.js";
  import { VectorTile as VectorTileLayer, Image as ImageLayer } from "ol/layer";
  import VectorLayer from "ol/layer/Vector.js";
  import { VectorTile as VectorTileSource } from "ol/source";
  import VectorSource from "ol/source/Vector.js";
  import { GeoJSON } from "ol/format";
  import { TileGrid } from "ol/tilegrid";
  import { MVT } from "ol/format";
  import ImageStatic from "ol/source/ImageStatic";
  import { Style, Stroke, Fill } from "ol/style";
  import CircleStyle from "ol/style/Circle";
  import FullScreen from "ol/control/FullScreen.js";
  import { defaults as defaultControls } from "ol/control/defaults.js";
  import Draw from "ol/interaction/Draw.js";
  import proj4 from "proj4";
  import { apply, applyStyle } from "ol-mapbox-style";
  import { apiKey, serviceUrl } from "$lib/constants.ts";
  import { createGroupLayer } from "$lib/utils";
  import Page from "../../routes/+page.svelte";

  let mapElement;
  let map;
  let tiffLayer, densityLayer;
  let baseLayer, vectorTileLayer, aerialLayer, currentBaseMap;
  let group = $state();

  const drawSource = new VectorSource({ wrapX: false });

  const drawLayer = new VectorLayer({
    source: drawSource,
  });

  let draw = $state();
  // $effect(() => {
  //   console.log(draw);
  //   draw?.on("finishDrawing", () => console.log(drawLayer.features));
  //   console.log(drawLayer);
  // });

  let tiffLayerSource = $derived(
    new ImageStatic({
      url: dataURL,
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

    vectorTileLayer = new VectorTileLayer({ declutter: true });

    await vectorTileLayer.setSource(
      new VectorTileSource({
        format: new MVT(),
        url: tiles,
        projection: "EPSG:27700",
        tileGrid,
        attributions:
          "Contains OS data © Crown copyright and database rights 2025",
      }),
    );

    await applyStyle(
      vectorTileLayer,
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

    tiffLayer = new ImageLayer({
      source: new ImageStatic({
        url: dataURL,
        imageExtent: bbox,
        projection: "EPSG:27700",
        interpolate: false,
      }),
      opacity,
    });

    baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attributions: `Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>`,
      }),
    });

    aerialLayer = new TileLayer({
      source: new XYZ({
        url: "https://tiledbasemaps.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attributions:
          "Esri, Vantor, Earthstar Geographics, and the GIS User Community",
      }),
    });

    currentBaseMap = vectorTileLayer;

    group = {
      name: "Density layer",
      paintedIndices: blendedIndices,
      gridConfig: { width, height, colOffset: 0 }, // uploaded files need offset
      stats: {},
      histogram: {},
      layer: null,
    };

    group.layer = createGroupLayer(group, opacity, densityArray);
    densityLayer = group.layer;
    // if (densityLayer) {
    map = new Map({
      controls: defaultControls().extend([new FullScreen()]),
      target: mapElement,
      layers: [
        currentBaseMap,
        geoJsonVectorLayer,
        scotlandAndWalesVectorLayer,
        tiffLayer,
        densityLayer,
        drawLayer,
      ],
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
    // }

    const drawStyle = new Style({
      fill: new Fill({
        color: "rgba(255, 0, 0, 0.2)", // red with transparency (polygon fill)
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

    draw = new Draw({
      source: drawSource,
      type: "Polygon",
      style: drawStyle,
    });

    drawLayer.setStyle(drawStyle);

    // map.addInteraction(draw);

    draw.on("drawend", function (event) {
      const feature = event.feature;
      const geometry = feature.getGeometry();

      // For a Polygon, this is an array of rings
      const coordinates = geometry.getCoordinates();
      const extent = geometry.getExtent();
      customAreaBBox = extent;

      console.log(coordinates, extent);

      const cellWidth = (bbox[2] - bbox[0]) / width;
      const cellHeight = (bbox[3] - bbox[1]) / height;

      const polyExtent = geometry.getExtent();

      const colMin = Math.max(
        0,
        Math.floor((polyExtent[0] - bbox[0]) / cellWidth),
      );
      const colMax = Math.min(
        width - 1,
        Math.ceil((polyExtent[2] - bbox[0]) / cellWidth),
      );

      const rowMin = Math.max(
        0,
        Math.floor((polyExtent[1] - bbox[1]) / cellHeight),
      );
      const rowMax = Math.min(
        height - 1,
        Math.ceil((polyExtent[3] - bbox[1]) / cellHeight),
      );

      const hits = [];

      function coordToGridIndex(x, y) {
        const col = Math.floor((x - bbox[0]) / cellWidth);
        const row = Math.floor((bbox[3] - y) / cellHeight);

        if (col < 0 || col >= width || row < 0 || row >= height) {
          return null; // outside grid
        }

        return row * width + col;
      }

      for (let row = rowMin; row <= rowMax; row++) {
        for (let col = colMin; col <= colMax; col++) {
          const center = [
            bbox[0] + (col + 0.5) * cellWidth,
            bbox[1] + (row + 0.5) * cellHeight,
          ];

          if (geometry.intersectsCoordinate(center)) {
            // hits.push(row * width + col);
            const index = coordToGridIndex(center[0], center[1]);
            hits.push(index);
          }
        }
      }
      customArea = hits;
      // console.log(customArea);
      policyLens = "customArea";
      unpackSelectedLayers();
      drawing = false;
    });

    if (customAreaBBox) {
      map
        .getView()
        .fit(customAreaBBox, { duration: 1000, padding: [20, 20, 20, 20] });
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
            "<b>" +
            feature.get("LAD25NM") +
            "</b>" +
            "<br>" +
            "Area covered by the current selections: " +
            Number(
              breakdownData.find((d) => d.area_code === feature.get("LAD25CD"))
                ?.selected_area,
            ).toLocaleString() +
            "ha" +
            "<br> (" +
            (
              Number(
                breakdownData.find(
                  (d) => d.area_code === feature.get("LAD25CD"),
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
      displayFeatureInfo(evt.pixel, evt.originalEvent.target);
    });

    map.on("singleclick", function (evt) {
      displayFeatureInfo(evt.pixel, evt.originalEvent.target);
    });

    map.getTargetElement().addEventListener("pointerleave", function () {
      if (isFeature(currentFeature)) currentFeature.set("hover", false);
      currentFeature = undefined;
      info.style.visibility = "hidden";
    });
  });

  // $effect(() => {
  //   if (map) {
  //     console.log("Removing the total tiff layer");
  //     map.removeLayer(tiffLayer);
  //   }

  //   if (dataURL && bbox) {
  //     tiffLayer = new ImageLayer({
  //       source: new ImageStatic({
  //         url: dataURL,
  //         imageExtent: bbox,
  //         projection: "EPSG:27700",
  //         interpolate: false,
  //       }),
  //       opacity,
  //     });

  //     if (map) {
  //       console.log("Adding the total tiff layer");
  //       map.addLayer(tiffLayer);
  //     }
  //   }
  // });

  $effect(() => {
    if (drawing) {
      map.addInteraction(draw);
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

  // $effect(() => {
  //   if (seeDensity && blendedIndices) {
  //     if (map && dataURL) {
  //       console.log("Updating the density layer");

  //       map.removeLayer(densityLayer);

  //       const group = {
  //         name: "Density layer",
  //         paintedIndices: blendedIndices,
  //         gridConfig: { width, height, colOffset: 0 }, // uploaded files need offset
  //         stats: {},
  //         histogram: {},
  //         layer: null,
  //       };

  //       group.layer = createGroupLayer(group, opacity, densityArray);
  //       densityLayer = group.layer;
  //       map.addLayer(densityLayer);
  //     }
  //     // seeDensity = false;
  //   }
  // });

  $effect(() => {
    if (!group) return;

    group.paintedIndices = blendedIndices;
    densityLayer.setOpacity(opacity);

    // Force OpenLayers to re-render
    densityLayer.getSource()?.changed();
  });

  $effect(() => {
    console.log("UPDATING tiff source");
    const newSource = tiffLayerSource; // Need this line so that Svelte has a dependedncy to track
    tiffLayer?.setSource(newSource);
  });

  let basemapLookup = $derived({
    OS: vectorTileLayer,
    osm: baseLayer,
    aerial: aerialLayer,
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
