<script lang="ts">
  import {
    MapLibre,
    GeoJSON,
    FillLayer,
    LineLayer,
    zoomTransition,
    Control,
    ControlButton,
    ControlGroup,
    RasterTileSource,
    RasterLayer
  } from "svelte-maplibre";
  import { contrastingColor } from "./colors.js";
  import { colorbrewer } from "./colorbrewer.js";
  import { hoverStateFilter } from "svelte-maplibre/filters.js";
  import type { LngLatLike, LngLatBoundsLike } from "maplibre-gl";
  import type { FeatureCollection } from "geojson";
  import fullTopo from "./fullTopo.json";
  import * as topojson from "topojson-client";
  import Tooltip from "./Tooltip.svelte";
  import {
    getColor,
    filterGeo,
    jenksBreaks,
    quantileBreaks,
  } from "./mapUtils.js";
  import NonStandardControls from "./NonStandardControls.svelte";
  import { replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import { joinData } from "./dataJoin.js";
  import { fromUrl, fromArrayBuffer, fromBlob  } from "geotiff";

  let {
    data,
    customPallet,
    setCustomPallet,
    cooperativeGestures = true,
    standardControls = true,
    navigationControl,
    navigationControlPosition = "top-left",
    geolocateControl,
    geolocateControlPosition = "top-left",
    fullscreenControl,
    fullscreenControlPosition = "top-left",
    scaleControl,
    scaleControlPosition = "bottom-left",
    scaleControlUnit = "metric",
    styleSheet = "Carto-light",
    colorPalette = "YlGnBu",
    showBorder = false,
    maxBorderWidth = 1.5,
    tooltip,
    clickToZoom = true,
    geoType = 'ltla',
    year = 2020,
    metric = '',
    breaksType = "quantile",
    customBreaks,
    numberOfBreaks = 5,
    fillOpacity = 0.5,
    changeOpacityOnHover = true,
    hoverOpacity = 0.8,
    center = [-2.5, 53],
    zoom = 5,
    minZoom,
    maxZoom,
    maxBoundsCoords,
    hash = false,
    updateHash = (u) => {
      replaceState(u, page.state);
    },
    useInitialHash = true,
    mapHeight = 200,
    setMaxBounds,
    onclick,
    tifLayer
  }: {
    data?: object[];
    customPallet?: object[] | undefined;
    cooperativeGestures?: boolean;
    standardControls?: boolean;
    navigationControl?: boolean;
    navigationControlPosition?: string;
    geolocateControl?: boolean;
    geolocateControlPosition?: string;
    fullscreenControl?: boolean;
    fullscreenControlPosition?: string;
    scaleControl?: boolean;
    scaleControlPosition?: string;
    scaleControlUnit?: string;
    styleSheet?: string | URL | object;
    colorPalette?: string;
    showBorder?: boolean;
    maxBorderWidth?: number;
    tooltip?: boolean;
    clickToZoom?: boolean;
    geoType?: string;
    year?: string | number;
    metric?: string;
    breaksType?: string;
    numberOfBreaks?: number;
    fillOpacity?: number;
    changeOpacityOnHover: boolean;
    hoverOpacity?: number;
    center?: LngLatLike | undefined;
    zoom?: number;
    minZoom?: number | undefined;
    maxZoom?: number | undefined;
    maxBoundsCoords?: LngLatBoundsLike;
    setMaxBounds?: boolean;
    hash?: boolean;
    updateHash?: (URL) => void;
    useInitialHash?: boolean;
    mapHeight?: number;
    setCustomPallet?: boolean;
    customBreaks?: number[];
    interative: boolean;
    onclick: any;
    tifLayer: any;
  } = $props();
$inspect(tifLayer)



  let styleLookup = {
    "Carto-light":
      "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    "Carto-dark":
      "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  };
  let style = $derived(styleLookup[styleSheet] ?? styleSheet);

  // let breakCount = $derived(
  //   breaksType == "custom" ? customBreaks.length : numberOfBreaks,
  // );
  // $inspect(breakCount);

  // let mapData = $derived(data?.filter((d) => d["year"] == year)[0]?.data);

  // let filteredMapData = $derived(
  //   mapData?.map((el) => ({
  //     areaCode: el.areaCode,
  //     areaName: el.areaName,
  //     metric: +el.data[metric],
  //   })),
  // );

  const geojsonData: FeatureCollection = $derived(
    topojson.feature(fullTopo, fullTopo.objects[geoType]),
  );

  let filteredGeoJsonData = $derived(filterGeo(geojsonData, year));

  // let fillColors: string[] = $derived(
  //   setCustomPallet == true
  //     ? customPallet
  //     : colorbrewer[colorPalette][breakCount],
  // );

  let borderColor = "#003300";

  let map: maplibregl.Map | undefined = $state();

  let loaded = $state(false);
  let textLayers: maplibregl.LayerSpecification[] = $derived(
    map && loaded && styleSheet
      ? map.getStyle().layers.filter((layer) => {
          return layer.type === "symbol" && layer["source-layer"] === "place";
        })
      : [],
  );

  async function addRaster(tifLayer) {
    
    	const res = await fromUrl(tifLayer);
      console.log("res",res);
     const image = await res.getImage();
     console.log("img",image.getGeoKeys());

    // const [originX, pixelWidth, , originY, , pixelHeight] = image.getGeoKeys().ModelPixelScale;

    const width = image.getWidth();
    const height = image.getHeight();

    const rasters = await image.readRasters({ interleave: true });
    const band = rasters; // 1 band: Float32Array or Uint8Array, depending on TIFF

  function getMinMax(arr) {
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (!isNaN(arr[i])) {
        if (arr[i] < min) min = arr[i];
        if (arr[i] > max) max = arr[i];
      }
    }
    return [min, max];
  }
console.log(band)
    // Normalize values to 0-255
    const [min, max] = getMinMax(band);
    const scale = 255 / (max - min);
        // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);

        // Fill imageData with raster values
    for (let i = 0; i < band.length; i++) {
      const value = (band[i] - min) * scale;
      const grayscale = Math.max(0, Math.min(255, value));

      imageData.data[i * 4 + 0] = grayscale;
      imageData.data[i * 4 + 1] = grayscale;
      imageData.data[i * 4 + 2] = grayscale;
      imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    // Convert canvas to data URL
    const dataURL = canvas.toDataURL();


    // Define image bounds from GeoTIFF metadata
    const bbox = image.getBoundingBox(); // [minX, minY, maxX, maxY]

    // Add as image source
    map.addSource('geotiff-image', {
      type: 'image',
      url: dataURL,
      coordinates: [
        [bbox[0], bbox[3]], // top-left
        [bbox[2], bbox[3]], // top-right
        [bbox[2], bbox[1]], // bottom-right
        [bbox[0], bbox[1]]  // bottom-left
      ]
    });

    map.addLayer({
      id: 'geotiff-layer',
      source: 'geotiff-image',
      type: 'raster',
      paint: { 'raster-opacity': 0.35 }
    });
  }


  // let colors = $derived(fillColors.map((d) => contrastingColor(d)));
  $effect(() => {
      if (loaded) {
    addRaster(tifLayer)
  }
    //Things can get out of sync when changing source
    //this section makes sure that the geojson layers end up below the text layers
    // let geoJsonLayerIds = map
    //   ?.getStyle()
    //   ?.layers.filter((layer) => {
    //     return layer.source == "areas";
    //   })
    //   .map((d) => d.id);
    // const labelLayerId = map
    //   ?.getStyle()
    //   ?.layers.find(
    //     (layer) => layer.type === "symbol" && layer["source-layer"] === "place",
    //   )?.id;
    // if (geoJsonLayerIds && labelLayerId) {
    //   for (let layer of geoJsonLayerIds) {
    //     map?.moveLayer(layer, labelLayerId);
    //   }
    // }

    // for (let layer of textLayers) {
    //   //Hard coded to first color for testing
    //   map?.setPaintProperty(layer.id, "text-color", colors[0].textColor);
    //   map?.setPaintProperty(
    //     layer.id,
    //     "text-halo-color",
    //     colors[0].textOutlineColor,
    //   );
    // }

    if (cooperativeGestures) {
      map?.cooperativeGestures.enable();
    } else {
      map?.cooperativeGestures.disable();
    }

    // map?.setMaxBounds(bounds);

  });

  // let vals = $derived(
  //   filteredMapData?.map((d) => d.metric).sort((a, b) => a - b),
  // );

  // let breaks = $derived(
  //   breaksType == "jenks"
  //     ? jenksBreaks(vals, breakCount)
  //     : breaksType == "quantile"
  //       ? quantileBreaks(vals, breakCount)
  //       : customBreaks,
  // );

  // let dataWithColor = $derived(
  //   filteredMapData.map((d) => {
  //     return {
  //       ...d,
  //       color: getColor(d.metric, breaks, fillColors),
  //     };
  //   }),
  // );

  // let merged = $derived(joinData(filteredGeoJsonData, dataWithColor));

  // $inspect(merged);

  // let hoveredArea = $state();
  // let hoveredAreaData = $state();
  // let currentMousePosition = $state();

  // function convertToLngLatBounds(coords: LngLatBoundsLike): LngLatBoundsLike {
  //   const bounds = new LngLatBounds(coords[0], coords[0]);

  //   for (let i = 1; i < coords.length; i++) {
  //     bounds.extend(coords[i]);
  //   }

  //   return bounds;
  // }

  // function zoomToArea(e) {
  //   if (clickToZoom) {
  //     let coordArray =
  //       e.features[0].geometry.coordinates.length === 1
  //         ? e.features[0].geometry.coordinates[0]
  //         : //Do some extra processing to get the data in the right shape if the area has non-contiguous areas
  //           e.features[0].geometry.coordinates.flat(2);

  //     let minValues = [
  //       Math.min(...coordArray.map((d) => +d[0])),
  //       Math.max(...coordArray.map((d) => +d[0])),
  //     ];

  //     let maxValues = [
  //       Math.min(...coordArray.map((d) => +d[1])),
  //       Math.max(...coordArray.map((d) => +d[1])),
  //     ];

  //     map?.fitBounds([
  //       [minValues[0], maxValues[0]],
  //       [minValues[1], maxValues[1]],
  //     ]);
  //   }
  // }
  //When useInitialHash is true, even if hash is false, if the page is loaded with a location hash use that as the initial settings, rather than the values passed to the component
  const initialLocationHash = page.url.hash.replace("#", "").split("/");
  const useLocationHash = initialLocationHash.length >= 3 ? true : false;

  center = useInitialHash
    ? useLocationHash
      ? [+initialLocationHash[2], +initialLocationHash[1]]
      : center
    : center;

  zoom = useInitialHash
    ? useLocationHash
      ? +initialLocationHash[0]
      : zoom
    : zoom;

  // let bounds = $derived(
  //   setMaxBounds ? convertToLngLatBounds(maxBoundsCoords) : undefined,
  // );

  // let displayBounds = $derived(bounds.map((b) => b.toFixed(4)).join(", "));
  // $inspect(displayBounds);
</script>

<div style="height: {mapHeight}px;">
  <MapLibre
    bind:map
    bind:loaded
    {style}
    {center}
    {zoom}
    {maxZoom}
    {minZoom}
    {standardControls}
    {hash}
    {updateHash}
    class="map"
    {onclick}
  >
    {#if !standardControls}
      <NonStandardControls
        {navigationControl}
        {navigationControlPosition}
        {geolocateControl}
        {geolocateControlPosition}
        {fullscreenControl}
        {fullscreenControlPosition}
        {scaleControl}
        {scaleControlPosition}
        {scaleControlUnit}
      />
    {/if}
      <Control>
        <ControlGroup>
          <button
            class="reset-button"
            onclick={() => {
              map.flyTo({
                center: center,
                zoom: zoom,
              });
            }}>Reset view</button
          ></ControlGroup
        >
      </Control>


    <!-- <GeoJSON id="areas" data={merged} promoteId="areanm">
      <FillLayer
        paint={{
          //Get the color property of the area, or lightgrey if that's undefined
          "fill-color": ["coalesce", ["get", "color"], "lightgrey"],
          "fill-opacity": changeOpacityOnHover
            ? hoverStateFilter(fillOpacity, hoverOpacity) //setting the fill-opacity based on whether the area is hovered
            : fillOpacity,
        }}
        beforeLayerType="symbol"
        manageHoverState
        onclick={(e) => zoomToArea(e)}
        onmousemove={(e) => {
          hoveredArea = e.features[0].id;
          hoveredAreaData = e.features[0].properties.metric;
          currentMousePosition = e.event.point;
        }}
        onmouseleave={(e) => {
          (hoveredArea = null), (hoveredAreaData = null);
        }}
      />
      {#if showBorder}
        <LineLayer
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": hoverStateFilter(borderColor, "orange"), //setting the colour based on whether the area is hovered
            "line-width": zoomTransition(3, 0, 12, maxBorderWidth), //setting the line-width based on the zoom level
          }}
          beforeLayerType="symbol"
        />
      {/if}
    </GeoJSON> -->
      <!-- <RasterTileSource tiles={tifLayer} tileSize={256}>
    <RasterLayer
      paint={{
        'raster-opacity': 0.5,
      }}
    />
  </RasterTileSource> -->
    {#if tooltip}
      <Tooltip
        {currentMousePosition}
        {hoveredArea}
        {hoveredAreaData}
        {year}
        {metric}
      />
    {/if}
  </MapLibre>
</div>

<style>
  :global(.maplibregl-ctrl-group button.reset-button) {
    /* margin: 10px; */
    width: fit-content;
    padding: 5px 10px;
    font-size: 16px;
    height: 100%;
  }
  
</style>
