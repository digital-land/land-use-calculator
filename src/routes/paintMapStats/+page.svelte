<script lang="ts">
  import { onMount, tick } from "svelte";
  import { base } from "$app/paths";
  import Map from "ol/Map.js";
  import View from "ol/View.js";
  import TileLayer from "ol/layer/Tile.js";
  import ImageLayer from "ol/layer/Image.js";
  import ImageCanvasSource from "ol/source/ImageCanvas.js";
  import XYZ from "ol/source/XYZ.js";
  import { scaleThreshold } from "d3-scale";
  import { interpolateViridis } from "d3-scale-chromatic";
  import proj4 from "proj4";
  import { register } from "ol/proj/proj4.js";
  import { get as getProjection } from "ol/proj";
  import DragPan from "ol/interaction/DragPan.js";
  import { fromUrl } from "geotiff";
  import LALookup from "$lib/LALookup";
  import Histogram from "$lib/components/Histogram.svelte";
  import { apiKey, serviceUrl } from "$lib/constants";

  // --- Constants ---
  const originX = 82668;
  const originY = 5339;
  const cellSize = 100; // meters per cell/hectare
  const fillOpacity = 0.5;

  proj4.defs(
    "EPSG:27700",
    "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs"
  );
  register(proj4);

  // --- State ---
  let map;
  let densityArray: number[];
  let width: number, height: number;
  let groups: MapGroup[] = $state([]);
  let currentGroupIndex = $state(0);
  let spacePressed = false;
  let painting = false;
  let erasing = false;
  let opacity = $state(0.8);
  let selected = $state("");
  let tooltipEl;
  let tooltipVisible = false;
  let tooltipText = $state("");
  let tooltipX = 0;
  let tooltipY = 0;

  interface GridConfig {
    width: number;
    height: number;
    colOffset?: number;
  }

  interface MapGroup {
    name: string;
    paintedIndices: Set<number>;
    gridConfig: GridConfig;
    stats: any;
    histogram: any;
    layer: ImageLayer;
  }

  // --- Coordinate mapping ---
  function coordToIndex(x: number, y: number, grid: GridConfig) {
    const cols = grid.width - (grid.colOffset || 0);
    const row = grid.height - 1 - Math.floor((y - originY) / cellSize);
    const col = Math.floor((x - originX) / cellSize);
    if (col < 0 || col >= cols || row < 0 || row >= grid.height) return null;
    return row * cols + col;
  }

  function indexToCoord(index: number, grid: GridConfig) {
    const cols = grid.width - (grid.colOffset || 0);
    const row = Math.floor(index / cols);
    const col = index % cols;
    const x = originX + col * cellSize;
    const y = originY + (grid.height - row) * cellSize; //Had to remove the -1 to match previous method and data
    return { x, y };
  }

  function uploadedIndexToFullIndex(index: number, grid: GridConfig): number {
    if (!grid.colOffset) return index;

    const croppedCols = grid.width - grid.colOffset;
    const row = Math.floor(index / croppedCols);
    const col = index % croppedCols;

    return row * grid.width + col;
  }

  // --- Load GeoTIFF ---
  async function loadTiff(url: string) {
    const tiff = await fromUrl(url);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    return {
      densityArray: rasters[0],
      width: image.getWidth(),
      height: image.getHeight(),
    };
  }

  function createGroupLayer(group: MapGroup): ImageLayer {
    return new ImageLayer({
      source: new ImageCanvasSource({
        projection: "EPSG:27700",
        canvasFunction: (extent, resolution, pixelRatio, size) => {
          const canvas = document.createElement("canvas");
          canvas.width = size[0];
          canvas.height = size[1];
          const ctx = canvas.getContext("2d")!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          drawGroupRaster(ctx, canvas, extent, group);
          return canvas;
        },
      }),
      opacity,
    });
  }

  // --- Painting / erasing ---
  function paintAt(group: MapGroup, coord: [number, number]) {
    const brushPx = 6;
    const res = map.getView().getResolution();
    const brushMeters = brushPx * res;
    const cellRadius = Math.ceil(brushMeters / cellSize);

    const colCenter = Math.floor((coord[0] - originX) / cellSize);
    const rowCenter = Math.floor((coord[1] - originY) / cellSize);

    for (let i = -cellRadius; i <= cellRadius; i++) {
      for (let j = -cellRadius; j <= cellRadius; j++) {
        if (Math.sqrt(i * i + j * j) > cellRadius) continue;

        const index = coordToIndex(
          originX + (colCenter + i) * cellSize,
          originY + (rowCenter + j) * cellSize,
          group.gridConfig
        );
        if (index !== null) group.paintedIndices.add(index);
      }
    }
    computeStats(group);
    group.layer.getSource().changed();
  }

  function eraseAt(group: MapGroup, coord: [number, number]) {
    const brushPx = 6;
    const res = map.getView().getResolution();
    const brushMeters = brushPx * res;
    const cellRadius = Math.ceil(brushMeters / cellSize);

    const colCenter = Math.floor((coord[0] - originX) / cellSize);
    const rowCenter = Math.floor((coord[1] - originY) / cellSize);

    for (let i = -cellRadius; i <= cellRadius; i++) {
      for (let j = -cellRadius; j <= cellRadius; j++) {
        if (Math.sqrt(i * i + j * j) > cellRadius) continue;

        const index = coordToIndex(
          originX + (colCenter + i) * cellSize,
          originY + (rowCenter + j) * cellSize,
          group.gridConfig
        );
        if (index !== null) group.paintedIndices.delete(index);
      }
    }
    computeStats(group);
    group.layer.getSource().changed();
  }

  function computeStats(group: MapGroup) {
    if (!densityArray || group.paintedIndices.size === 0) {
      group.stats = { count: 0, sum: 0, mean: 0, median: 0, min: 0, max: 0 };
      group.histogram = {};
      return;
    }

    const values = Array.from(group.paintedIndices)
      .map((i) => {
        const full = uploadedIndexToFullIndex(i, group.gridConfig);
        return densityArray[full];
      })
      .filter((v) => v !== undefined);

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const histogram = {
      "<=1": 0,
      "2 to 5": 0,
      "6 to 10": 0,
      "11 to 20": 0,
      "21 to 50": 0,
      "51 to 100": 0,
      "101 to 200": 0,
      "201 to 500": 0,
      "over 500": 0,
    };
    for (const v of values) {
      if (v <= 1) histogram["<=1"]++;
      else if (v <= 5) histogram["2 to 5"]++;
      else if (v <= 10) histogram["6 to 10"]++;
      else if (v <= 20) histogram["11 to 20"]++;
      else if (v <= 50) histogram["21 to 50"]++;
      else if (v <= 100) histogram["51 to 100"]++;
      else if (v <= 200) histogram["101 to 200"]++;
      else if (v <= 500) histogram["201 to 500"]++;
      else histogram["over 500"]++;
    }

    group.stats = { count: values.length, sum, mean, median, min, max };
    group.histogram = histogram;
  }

  onMount(async () => {
    const tiffData = await loadTiff("/range/hectare_counts.tif");
    densityArray = tiffData.densityArray;
    width = tiffData.width;
    height = tiffData.height;

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      }),
    });

    const paintLayerNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    paintLayerNumbers.forEach((d) => {
      const group: MapGroup = {
        name: "Group " + d,
        paintedIndices: new Set<number>(),
        gridConfig: { width, height, colOffset: 0 },
        stats: {},
        histogram: {},
        layer: null as any,
      };

      group.layer = createGroupLayer(group);

      groups.push(group);
    });

    map = new Map({
      target: "map",
      layers: [baseLayer, ...groups.map((g) => g.layer)],
      view: new View({
        projection: getProjection("EPSG:27700"),
        center: [400000, 300000],
        zoom: 7,
      }),
    });

    //map.addLayer(group.layer);

    const dragPan = map
      .getInteractions()
      .getArray()
      .find((i) => i instanceof DragPan);

    // --- Painting / Erasing controls ---
    let dPressed = false;

    map.on("pointerdown", (evt) => {
      if (spacePressed && evt.originalEvent.button === 0) {
        // Paint with Space + Left Mouse
        painting = true;
        erasing = false;
        dragPan.setActive(false);
      } else if (dPressed && evt.originalEvent.button === 0) {
        // Erase with D + Left Mouse
        erasing = true;
        painting = false;
        dragPan.setActive(false);
      }
    });

    map.on("pointerup", () => {
      painting = false;
      erasing = false;
      dragPan.setActive(true);
    });

    map.on("pointermove", async (evt) => {
      let found = false;
      for (const group of groups) {
        const index = coordToIndex(
          evt.coordinate[0],
          evt.coordinate[1],
          group.gridConfig
        );
        if (index !== null && group.paintedIndices.has(index)) {
          // const value = densityArray[index];
          const fullIndex = uploadedIndexToFullIndex(index, group.gridConfig);
          const value = densityArray[fullIndex];
          tooltipText = `(Title deeds with centroids in hovered area: ${value})`;
          tooltipX = evt.originalEvent.pageX + 10;
          tooltipY = evt.originalEvent.pageY + 10;
          tooltipVisible = true;
          found = true;
          break;
        } else {
          tooltipText = "<br>";
        }
      }
      // if (!found) tooltipVisible = false;

      await tick();

      if (painting) paintAt(groups[currentGroupIndex], evt.coordinate);
      else if (erasing) eraseAt(groups[currentGroupIndex], evt.coordinate);
    });

    // --- Key listeners ---
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        spacePressed = true;
      }
      if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        dPressed = true;
      }
      if (e.key >= "1" && e.key <= "9") {
        currentGroupIndex = Number(e.key) - 1;
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        spacePressed = false;
      }
      if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        dPressed = false;
      }
    });
    // });
  });

  function drawGroupRaster(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    extent: number[],
    group: MapGroup
  ) {
    const [minX, minY, maxX, maxY] = extent;
    const scaleX = canvas.width / (maxX - minX);
    const scaleY = canvas.height / (maxY - minY);

    for (const index of group.paintedIndices) {
      const { x, y } = indexToCoord(index, group.gridConfig);
      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      // const value = densityArray[index];

      const fullIndex = uploadedIndexToFullIndex(index, group.gridConfig);
      const value = densityArray[fullIndex];
      if (value === undefined) continue;

      ctx.fillStyle = getFillStyle(value);
      ctx.fillRect(
        (x - minX) * scaleX,
        canvas.height - (y - minY) * scaleY,
        cellSize * scaleX,
        cellSize * scaleY
      );
    }
  }

  function getFillStyle(value: number): string {
    let normalized: number;

    if (value <= 1) normalized = 0.0;
    else if (value <= 5) normalized = 0.1;
    else if (value <= 10) normalized = 0.2;
    else if (value <= 20) normalized = 0.35;
    else if (value <= 50) normalized = 0.45;
    else if (value <= 100) normalized = 0.55;
    else if (value <= 200) normalized = 0.65;
    else if (value <= 500) normalized = 0.8;
    else normalized = 1.0;

    return interpolateViridis(1 - normalized)
      .replace("rgb(", "rgba(")
      .replace(")", `, ${fillOpacity})`);
  }

  async function importGeography() {
    if (!selected) return;

    const res = await fetch(`${base}/data/geographies/${selected}`);
    const buffer = await res.arrayBuffer();
    const indices = new Uint32Array(buffer);

    const name =
      LALookup.find((e) => e.LAD25CD === selected.replace(".bin", ""))
        ?.LAD25NM ?? selected;

    const group = {
      name,
      paintedIndices: new Set(indices),
      gridConfig: { width, height, colOffset: 0 },
      stats: {},
      histogram: {},
      layer: null as any,
    };

    group.layer = createGroupLayer(group);

    groups = [...groups, group];
    map.addLayer(group.layer);

    computeStats(group);
  }

  async function handleFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const indices = new Uint32Array(buffer);

    const group = {
      name: file.name,
      paintedIndices: new Set(indices),
      gridConfig: { width, height, colOffset: 2 }, // uploaded files need offset
      stats: {},
      histogram: {},
      layer: null as any,
    };

    group.layer = createGroupLayer(group);

    groups = [...groups, group];
    map.addLayer(group.layer);

    computeStats(group);
  }

  function clearGroup(group: MapGroup) {
    group.paintedIndices.clear();
    computeStats(group);
    group.layer.getSource().changed();
  }

  function updateOpacity(e: Event) {
    opacity = +(e.target as HTMLInputElement).value;
    groups.forEach((g) => g.layer.setOpacity(opacity));
  }
</script>

<svelte:head>
  <title>Experimental painting app</title>
  <meta
    name="description"
    content="Experimental tool for calculating the number of title deeds in a painted area."
  />
</svelte:head>

<div id="map"></div>
<div id="slider-container">
  <div style="display:flex; align-items:center; gap:10px;">
    <div class="import-geography">
      <select bind:value={selected}>
        <option value="">Select Local Authority District...</option>
        {#each LALookup as f}
          <option value={f.LAD25CD + ".bin"}>{f.LAD25NM}</option>
        {/each}
      </select>

      <button onclick={importGeography} disabled={!selected}> Import </button>
    </div>
  </div>
  <button onclick={() => clearGroup(groups[currentGroupIndex])}>
    Clear {groups[currentGroupIndex]?.name
      ? groups[currentGroupIndex]?.name
      : "Painted"} Cells
  </button>
  <label>
    Opacity: {Math.round(opacity * 100)}%
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      bind:value={opacity}
      oninput={updateOpacity}
    />
  </label>
</div>

<!-- Fixed stats panel -->
<div
  class="fixed top-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg text-sm w-[250px] max-h-[90vh] overflow-y-auto z-50"
>
  <div id="instructions">
    <h2 style="margin-top:0">Title deed counter: Instructions for use</h2>
    <ul style="font-size:0.8em">
      <li class="font-semibold mb-2">
        Pan and zoom as you normally would with a mouse
      </li>
      <li class="font-semibold mb-2">
        Press the space key and the left mouse button to paint (go slow)
      </li>
      <li class="font-semibold mb-2">
        <b
          >NEW: Press the "D" key and the left mouse button to erase (go slow)</b
        >
      </li>
      <li class="font-semibold mb-2">
        Painting and erasing are more precise as you zoom in
      </li>
      <li class="font-semibold mb-2">
        Press keys 1–9 to switch paint groups (to compare two or more areas)
      </li>
      <li class="font-semibold mb-2">
        Scroll down the page to see more reporting
      </li>
      <li class="font-semibold mb-2">
        Adjust opacity with the top right slider
      </li>
      <li class="font-semibold mb-2">
        Click "Clear Painted Cells" to clear the current group
      </li>
      <li class="font-semibold mb-2">
        Select a local authority from the dropdown and click Import to see a
        whole LA
      </li>
      <li class="font-semibold mb-2">
        Import a custom area from the main app using the button below the map
      </li>
    </ul>
  </div>
  <label for="custom-input"
    >Import a custom area (.bin) file (e.g. from the main app):</label
  >
  <br />
  <input id="custom-input" type="file" accept=".bin" onchange={handleFile} />

  <div class="report">
    {#each groups as g, i}
      {#if g.stats.count}
        {console.log("g", g)}
        <div class="mb-3 border-b border-gray-300 pb-2">
          <div class="font-semibold">
            <b>
              {g.name
                ? g.name + (currentGroupIndex === i ? " (Active)" : "")
                : `Area: + ${i + 1} ${currentGroupIndex === i ? "(Active)" : ""}`}</b
            >
          </div>
          <div>
            {g.name ? g.name : `Area: + ${i + 1}`} measures {g.stats.count.toLocaleString()}
            hectares
          </div>
          <div>
            It contains {(+g.stats.sum.toFixed(0)).toLocaleString()} title deeds
          </div>
          <div>Density is {g.stats.mean.toFixed(2)} titles per hectare.</div>
          <div>
            The median hectare's number of titles is {g.stats.median.toFixed(0)}
          </div>
          <div>Minimum number in a hectare: {g.stats.min.toFixed(0)}</div>
          <div>
            Maximum number in a hectare : {(+g.stats.max.toFixed(
              0
            )).toLocaleString()}
          </div>
          <div bind:this={tooltipEl} class="tooltip">
            {@html tooltipText}
          </div>

          {#if Object.keys(g.histogram).length}
            <Histogram histogram={g.histogram} />
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  #map {
    width: 100%;
    height: 50vh;
  }

  #instructions {
    position: absolute;
    top: 120px;
    right: 15px;
    width: 250px;
    background-color: white;
    padding: 5px;
    border: 1px solid grey;
    font-family: Arial, Helvetica, sans-serif;
  }

  .report {
    font-family: Arial, Helvetica, sans-serif;
  }
  #slider-container {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(255, 255, 255, 0.8);
    padding: 8px;
    border-radius: 4px;
    font-family: sans-serif;
  }

  #slider-container input {
    width: 100px;
  }
</style>
