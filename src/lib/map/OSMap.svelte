<script>
  let {
    dataURL,
    bbox,
    selectedAreaName = $bindable(),
    breakdownData,
  } = $props();

  import "/node_modules/ol/ol.css";
  import { onMount } from "svelte";
  // import { onDestroy } from "svelte";
  //import GeoTIFF from 'ol/source/GeoTIFF';
  // import WebGLTileLayer from "ol/layer/WebGLTile";
  import { register } from "ol/proj/proj4";
  import { Map, View } from "ol";
  import { VectorTile as VectorTileLayer, Image as ImageLayer } from "ol/layer";
  import VectorLayer from "ol/layer/Vector.js";
  import { VectorTile as VectorTileSource } from "ol/source";
  import VectorSource from "ol/source/Vector.js";
  import { GeoJSON } from "ol/format";
  import { TileGrid } from "ol/tilegrid";
  import { MVT } from "ol/format";
  import ImageStatic from "ol/source/ImageStatic";
  import { Style, Stroke, Fill } from "ol/style";
  import FullScreen from "ol/control/FullScreen.js";
  import { defaults as defaultControls } from "ol/control/defaults.js";
  import proj4 from "proj4";
  import { apply, applyStyle } from "ol-mapbox-style";

  let mapElement;
  let map;
  let tiffLayer;
  const apiKey = "oCUBI8DjgzTP5J8VptrnOAxYVeZc0cZ2";
  const serviceUrl = "https://api.os.uk/maps/vector/v1/vts";
  // let worker;
  onMount(async () => {
    proj4.defs(
      "EPSG:27700",
      "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs"
    );
    register(proj4);

    const service = await fetch(`${serviceUrl}?key=${apiKey}`).then((r) =>
      r.json()
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

    const vectorTileLayer = new VectorTileLayer({ declutter: true });

    await vectorTileLayer.setSource(
      new VectorTileSource({
        format: new MVT(),
        url: tiles,
        projection: "EPSG:27700",
        tileGrid,
        attributions:
          "Contains OS data © Crown copyright and database rights 2025",
      })
    );

    await applyStyle(
      vectorTileLayer,
      `${serviceUrl}/${service.defaultStyles}?key=${apiKey}`,
      "",
      { resolutions }
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
      opacity: 0.8,
    });

    map = new Map({
      controls: defaultControls().extend([new FullScreen()]),
      target: mapElement,
      layers: [
        vectorTileLayer,
        geoJsonVectorLayer,
        scotlandAndWalesVectorLayer,
        tiffLayer,
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

    //Zoom to the area
    map.getView().fit(bbox, { duration: 1000 });

    map.on("singleclick", function (evt) {
      map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        const props = feature.getProperties();

        console.log("Feature clicked:", props, evt.pixel);
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
              ?.selected_area
          ).toLocaleString() +
          "ha" +
          "<br> (" +
          (
            Number(
              breakdownData.find((d) => d.area_code === feature.get("LAD25CD"))
                ?.selected_area_as_a_proportion_of_total_area
            ) * 100
          ).toFixed(0) +
          "%)";
      } else {
        info.style.visibility = "hidden";
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
  // $inspect(selectedAreaName);

  $effect(() => {
    if (map) {
      console.log("Removing the total tiff layer");
      map.removeLayer(tiffLayer);
    }

    if (dataURL && bbox) {
      tiffLayer = new ImageLayer({
        source: new ImageStatic({
          url: dataURL,
          imageExtent: bbox,
          projection: "EPSG:27700",
          interpolate: false,
        }),
        opacity: 0.8,
      });

      if (map) {
        console.log("Adding the total tiff layer");
        map.addLayer(tiffLayer);

        // map.getView().fit(bbox, { duration: 1000 });
      }
    }
  });
</script>

<div bind:this={mapElement} class="map-container" tabindex="0">
  <div id="info"></div>
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
</style>
