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
    RasterLayer,
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
  import { fromUrl, fromArrayBuffer, fromBlob } from "geotiff";

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
    geoType = "ltla",
    year = 2020,
    metric = "",
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
    tifLayer,
    selected,
    rasterLayers,
    blendedArray,
    geoTiffWidth,
    geoTiffHeight,
    bbox,
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
    selected: any;
    rasterLayers: any;
    blendedArray: [];
    geoTiffWidth: number;
    geoTiffHeight: number;
    bbox: [];
  } = $props();

  let styleLookup = {
    "Carto-light":
      "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    "Carto-dark":
      "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  };
  let style = $derived(styleLookup[styleSheet] ?? styleSheet);

  const geojsonData: FeatureCollection = $derived(
    topojson.feature(fullTopo, fullTopo.objects[geoType])
  );

  let filteredGeoJsonData = $derived(filterGeo(geojsonData, year));

  let borderColor = "#003300";

  let map: maplibregl.Map | undefined = $state();

  let loaded = $state(false);
  let textLayers: maplibregl.LayerSpecification[] = $derived(
    map && loaded && styleSheet
      ? map.getStyle().layers.filter((layer) => {
          return layer.type === "symbol" && layer["source-layer"] === "place";
        })
      : []
  );

  $effect(() => {

    if (cooperativeGestures) {
      map?.cooperativeGestures.enable();
    } else {
      map?.cooperativeGestures.disable();
    }
  });

  
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
