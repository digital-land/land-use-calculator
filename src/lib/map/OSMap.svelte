<script>
  let {
    dataURL,
    dataURLForUniques,
    dataURLForSelectedArea,
    bbox,
    selectedAreaName = $bindable(),
  } = $props();

  import { onMount } from "svelte";
  import { onDestroy } from "svelte";
  //import GeoTIFF from 'ol/source/GeoTIFF';
  import WebGLTileLayer from "ol/layer/WebGLTile";
  import { VectorTile as VectorTileLayer, Image as ImageLayer } from "ol/layer";
  // import LayerGroup from 'ol/layer/Group.js';
  // import GeoTIFF from "geotiff";
  import ImageStatic from "ol/source/ImageStatic";
  // let geotiffData = null; // to hold the raster data info
  import ImageCanvasSource from "ol/source/ImageCanvas";
  import * as topojson from "topojson-client";
  import { Style, Stroke, Fill } from "ol/style";
  import FullScreen from "ol/control/FullScreen.js";
  import { defaults as defaultControls } from "ol/control/defaults.js";

  let mapElement;
  let map;
  let tiffLayer, tiffLayerUnique, tiffLayerSelectedArea;
  const apiKey = "oCUBI8DjgzTP5J8VptrnOAxYVeZc0cZ2";
  const serviceUrl = "https://api.os.uk/maps/vector/v1/vts";
  // let worker;
  onMount(async () => {
    proj4.defs(
      "EPSG:27700",
      "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs"
    );
    ol.proj.proj4.register(proj4);

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

    const tileGrid = new ol.tilegrid.TileGrid({
      extent,
      origin,
      resolutions,
      tileSize,
    });

    const vectorTileLayer = new ol.layer.VectorTile({ declutter: true });

    await olms.applyStyle(
      vectorTileLayer,
      `${serviceUrl}/${service.defaultStyles}?key=${apiKey}`,
      "",
      { resolutions }
    );

    await vectorTileLayer.setSource(
      new ol.source.VectorTile({
        format: new ol.format.MVT(),
        url: tiles,
        projection: "EPSG:27700",
        tileGrid,
        attributions:
          "Contains OS data © Crown copyright and database rights 2025",
      })
    );

    const geoJsonVectorSource = new ol.source.Vector({
      url: "local-planning-authority.geojson",
      format: new ol.format.GeoJSON({
        dataProjection: "EPSG:4326", // projection of the GeoJSON file
        featureProjection: "EPSG:27700", // projection of the map
      }),
    });

    const geoJsonVectorLayer = new ol.layer.Vector({
      source: geoJsonVectorSource,
      style: (feature, resolution) => {
        // Set line width based on 'resolution' which is the inverse of zoom level
        const width = resolution < 1 ? 3 : resolution < 5 ? 2 : 0.5; // fallback

        return new Style({
          stroke: new Stroke({
            color: "teal",
            width: width,
          }),
          fill: new Fill({
            color: "rgba(0,123,0,0)",
          }),
        });
      },
    });

    tiffLayer = new ImageLayer({
      source: new ImageStatic({
        url: dataURL,
        imageExtent: bbox,
        projection: "EPSG:27700",
      }),
      opacity: 0.8,
    });

    tiffLayerSelectedArea = new ImageLayer({
      source: new ImageStatic({
        url: dataURLForSelectedArea,
        imageExtent: bbox,
        projection: "EPSG:27700",
      }),
      opacity: 0.25,
    });

    tiffLayerUnique = new ImageLayer({
      source: new ImageStatic({
        url: dataURLForUniques,
        imageExtent: bbox,
        projection: "EPSG:27700",
      }),
      opacity: 0.5,
    });

    map = new ol.Map({
      controls: defaultControls().extend([new FullScreen()]),
      target: mapElement,
      layers: [
        vectorTileLayer,
        geoJsonVectorLayer,
        tiffLayer,
        tiffLayerUnique,
        tiffLayerSelectedArea,
      ],
      view: new ol.View({
        projection: "EPSG:27700",
        extent: [-238375.0, 0.0, 900000.0, 1376256.0],
        resolutions,
        minZoom: 1,
        maxZoom: 12,
        center: [377297, 353995],
        // zoom: 1,
      }),
    });

    // fetch("local-planning-authority.json")
    //   .then((response) => response.json())
    //   .then((topoData) => {
    //     // Convert TopoJSON to GeoJSON (pick the object you want)
    //     const geojsonObject = topojson.feature(
    //       topoData,
    //       topoData.objects["local-planning-authority"]
    //     ); // <-- adjust this

    //     // Read and reproject GeoJSON features
    //     const features = new ol.format.GeoJSON({
    //       dataProjection: "EPSG:4326",
    //       featureProjection: "EPSG:27700",
    //     }).readFeatures(geojsonObject);

    //     // Add features to vector source
    //     const vectorSource = new ol.source.Vector({
    //       features: features,
    //     });

    //     const vectorLayer = new ol.layer.Vector({
    //       source: vectorSource,
    //       style: {
    //         "stroke-color": "teal",
    //         "stroke-width": 1.5,
    //         "fill-color": "rgba(0,123,0,0.2)",
    //       },
    //       // opacity: 0.3,
    //     });

    //     map.addLayer(vectorLayer);
    //   });

    //Zoom to the area
    map.getView().fit(bbox, { duration: 1000 });

    map.on("singleclick", function (evt) {
      map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        const props = feature.getProperties();

        console.log("Feature clicked:", props);
        if (props.name) {
          selectedAreaName = props.name;

          // map.getView().fit(props.geometry?.extent_, { duration: 1000 });
        }

        return true; // stop after first match
      });
    });
  });

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
        }),
        opacity: 0.8,
      });

      if (map) {
        console.log("Adding the total tiff layer");
        map.addLayer(tiffLayer);

        map.getView().fit(bbox, { duration: 1000 });
      }
    }
  });

  $effect(() => {
    if (map) {
      console.log("Removing the selected tiff layers");

      map.removeLayer(tiffLayerSelectedArea);
      map.removeLayer(tiffLayerUnique);
    }

    if (dataURLForSelectedArea && dataURLForUniques && bbox) {
      tiffLayerSelectedArea = new ImageLayer({
        source: new ImageStatic({
          url: dataURLForSelectedArea,
          imageExtent: bbox,
          projection: "EPSG:27700",
        }),
        opacity: 0.25,
      });

      tiffLayerUnique = new ImageLayer({
        source: new ImageStatic({
          url: dataURLForUniques,
          imageExtent: bbox,
          projection: "EPSG:27700",
        }),
        opacity: 0.75,
      });

      if (map) {
        console.log("Adding the selected tiff layers");

        map.addLayer(tiffLayerSelectedArea);
        map.addLayer(tiffLayerUnique);
        map.getView().fit(bbox, { duration: 1000 });
      }
    }
  });
</script>

<div bind:this={mapElement} class="map-container" tabindex="0"></div>

<style>
  .map-container {
    width: fit-content;
    height: calc(100% - 20px);
    width: calc(100% - 20px);
    padding: 10px;
  }
</style>
