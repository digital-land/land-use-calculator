<script lang="ts">
  import { onMount } from "svelte";
  import Map from "ol/Map.js";
  import View from "ol/View.js";
  import TileLayer from "ol/layer/Tile.js";
  import VectorLayer from "ol/layer/Vector.js";
  import VectorSource from "ol/source/Vector.js";
  import XYZ from "ol/source/XYZ.js";
  import Feature from "ol/Feature.js";
  import Polygon from "ol/geom/Polygon.js";
  import { Fill, Stroke, Style } from "ol/style.js";
  import proj4 from "proj4";
  import { register } from "ol/proj/proj4.js";
  import { get as getProjection } from "ol/proj";
  import DragPan from "ol/interaction/DragPan.js";
  import { fromUrl } from "geotiff";
  import Histogram from "$lib/components/Histogram.svelte";
  import { base } from "$app/paths";
  // --- Constants ---
  const originX = 82668;
  const originY = 5339;
  const cellSize = 100; // meters per hectare

  proj4.defs(
    "EPSG:27700",
    "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs"
  );
  register(proj4);

  // --- State ---
  let map;
  let densityArray;
  let width: number, height: number;
  let spacePressed = false;
  let painting = false;
  let erasing = false;

  // 10 paint groups
  const colors = [
    "rgba(255,0,0,0.3)",
    "rgba(0,128,255,0.3)",
    "rgba(0,200,0,0.3)",
    "rgba(255,165,0,0.3)",
    "rgba(128,0,128,0.3)",
    "rgba(255,192,203,0.3)",
    "rgba(255,255,0,0.3)",
    "rgba(0,255,255,0.3)",
    "rgba(128,128,128,0.3)",
    "rgba(165,42,42,0.3)",
  ];

  let currentGroupIndex = 0;

  // Each group tracks cells, indices, stats, histogram, and its own vector layer
  let groups = colors.map((color) => ({
    color,
    paintedCells: new Set<string>(),
    paintedIndices: new Set<number>(),
    stats: { count: 0, sum: 0, mean: 0, median: 0, min: 0, max: 0 },
    histogram: {},
    layer: new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        fill: new Fill({ color }),
        stroke: new Stroke({ color: color.replace("0.3", "0.6"), width: 1 }),
      }),
    }),
  }));

  // --- Load GeoTIFF ---
  async function loadTiff(url: string) {
    const tiff = await fromUrl(url);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    return { densityArray: rasters[0], width: image.getWidth(), height: image.getHeight() };
  }

  // --- Helper functions ---
  function coordToIndex(x: number, y: number): number | null {
    const col = Math.floor((x - originX) / cellSize);
    const rowFromBottom = Math.floor((y - originY) / cellSize);
    const row = height - 1 - rowFromBottom;
    if (col < 0 || col >= width || row < 0 || row >= height) return null;
    return row * width + col;
  }

  function addCellFeature(group, x: number, y: number) {
    const key = `${x}_${y}`;
    if (group.paintedCells.has(key)) return;
    const index = coordToIndex(x, y);
    if (index === null) return;

    group.paintedCells.add(key);
    group.paintedIndices.add(index);

    const square = new Polygon([
      [
        [x, y],
        [x + cellSize, y],
        [x + cellSize, y + cellSize],
        [x, y + cellSize],
        [x, y],
      ],
    ]);
    group.layer.getSource().addFeature(new Feature({ geometry: square }));
  }

  function computeStats(group) {
    if (!densityArray || group.paintedIndices.size === 0) {
      group.stats = { count: 0, sum: 0, mean: 0, median: 0, min: 0, max: 0 };
      group.histogram = {};
      groups = [...groups]; // trigger reactivity          
      return;
    }

    const values = Array.from(group.paintedIndices)
      .map((i) => densityArray[i])
      .filter((v) => v !== undefined);
    if (!values.length) return;

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const bins = {
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
      if (v <= 1) bins["<=1"]++;
      else if (v <= 5) bins["2 to 5"]++;
      else if (v <= 10) bins["6 to 10"]++;
      else if (v <= 20) bins["11 to 20"]++;
      else if (v <= 50) bins["21 to 50"]++;
      else if (v <= 100) bins["51 to 100"]++;
      else if (v <= 200) bins["101 to 200"]++;            
      else if (v <= 500) bins["201 to 500"]++;      
      else if (v > 500) bins["over 500"]++;
    }

    group.stats = { count: values.length, sum, mean, median, min, max };
    group.histogram = bins;
  }

  function paintAt(group, coord) {
    if (!map || !width || !height) return;
    const view = map.getView();
    const res = view.getResolution();
    const brushPx = 6;
    let brushMeters = brushPx * res;
    let cellRadius = Math.ceil(brushMeters / cellSize);
    const mapHeightMeters = map.getSize()[1] * res;
    if (mapHeightMeters < 1000) cellRadius = 0;

    const colCenter = Math.floor((coord[0] - originX) / cellSize);
    const rowCenter = Math.floor((coord[1] - originY) / cellSize);

    for (let i = -cellRadius; i <= cellRadius; i++) {
      for (let j = -cellRadius; j <= cellRadius; j++) {
        const newCol = colCenter + i;
        const newRow = rowCenter + j;
        if (newCol < 0 || newCol >= width || newRow < 0 || newRow >= height) continue;
        if (Math.sqrt(i * i + j * j) > cellRadius) continue;
        const cellX = originX + newCol * cellSize;
        const cellY = originY + newRow * cellSize;
        addCellFeature(group, cellX, cellY);
      }
    }

    computeStats(group);
    groups = [...groups];
  }

  function eraseAt(group, coord) {
    if (!map || !width || !height) return;
    const view = map.getView();
    const res = view.getResolution();
    const brushPx = 6;
    let brushMeters = brushPx * res;
    let cellRadius = Math.ceil(brushMeters / cellSize);
    const mapHeightMeters = map.getSize()[1] * res;
    if (mapHeightMeters < 1000) cellRadius = 0;

    const colCenter = Math.floor((coord[0] - originX) / cellSize);
    const rowCenter = Math.floor((coord[1] - originY) / cellSize);

    for (let i = -cellRadius; i <= cellRadius; i++) {
      for (let j = -cellRadius; j <= cellRadius; j++) {
        const newCol = colCenter + i;
        const newRow = rowCenter + j;
        if (newCol < 0 || newCol >= width || newRow < 0 || newRow >= height) continue;
        if (Math.sqrt(i * i + j * j) > cellRadius) continue;
        const cellX = originX + newCol * cellSize;
        const cellY = originY + newRow * cellSize;
        const key = `${cellX}_${cellY}`;
        if (group.paintedCells.has(key)) {
          group.paintedCells.delete(key);
          const index = coordToIndex(cellX, cellY);
          if (index !== null) group.paintedIndices.delete(index);
          const features = group.layer.getSource().getFeatures();
          for (const f of features) {
            const geom = f.getGeometry();
            if (geom.getCoordinates()[0][0][0] === cellX && geom.getCoordinates()[0][0][1] === cellY) {
              group.layer.getSource().removeFeature(f);
              break;
            }
          }
        }
      }
    }

    computeStats(group);
    groups = [...groups];
  }

  onMount(async () => {
    const tiffData = await loadTiff(`${base}/range/hectare_counts.tif`);
    densityArray = tiffData.densityArray;
    width = tiffData.width;
    height = tiffData.height;

    const baseLayer = new TileLayer({
      source: new XYZ({ url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" }),
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

    map.getTargetElement().addEventListener("contextmenu", (e) => e.preventDefault());
    const dragPan = map.getInteractions().getArray().find((i) => i instanceof DragPan);

    // Painting controls
    map.on("pointerdown", (evt) => {
      if (spacePressed && evt.originalEvent.button === 0) {
        painting = true;
        erasing = false;
        dragPan.setActive(false);
      } else if (spacePressed && evt.originalEvent.button === 2) {
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

    map.on("pointermove", (evt) => {
      if (painting) paintAt(groups[currentGroupIndex], evt.coordinate);
      else if (erasing) eraseAt(groups[currentGroupIndex], evt.coordinate);
    });

    // Spacebar toggle
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        spacePressed = true;
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
    });
  });
</script>

<div id="map" ></div>

<!-- Fixed stats panel -->
<div class="fixed top-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg text-sm w-[250px] max-h-[90vh] overflow-y-auto z-50">
 <div id="instructions"> 
  <h2>Title deed counter: Instructions for use</h2>
  <ul>
  <li class="font-semibold mb-2">Pan and zoom as you normally would with a mouse</li>
  <li class="font-semibold mb-2">Press the space key and the left mouse button to paint (go slow)</li>
  <li class="font-semibold mb-2">Press the space key and the right mouse button to erase (go slow)</li>
   <li class="font-semibold mb-2">Painting and erasing are more precise as you zoom in</li>
  <li class="font-semibold mb-2">Press keys 1–9 to switch paint groups (to compare two or more areas)</li>
  <li class="font-semibold mb-2">Scroll down the page to see more reporting</li>
</ul>
</div>

  {#each groups as g, i}
  {#if g.stats.count}
    <div class="mb-3 border-b border-gray-300 pb-2">
      <div class="font-semibold" style="color:{g.color.replace('0.3', '1')}">
        Area {i + 1} {currentGroupIndex === i ? "(Active)" : ""}
      </div>
      <div>Area {i + 1} measures {g.stats.count} hectares</div>
      <div>It contains {g.stats.sum.toFixed(0)} title deeds</div>
      <div>Which is {g.stats.mean.toFixed(2 )} titles per hectare.</div>
      <div>The median hactare's number of titles is {g.stats.median.toFixed(0)}</div>
      <div>Minimum number in a hectare: {g.stats.min.toFixed(0)}</div>
      <div>Maximum number in a hectare : {g.stats.max.toFixed(0)}</div>

      {#if Object.keys(g.histogram).length}
        <Histogram histogram={g.histogram} color={g.color.replace("0.3", "1")} />
      {/if}
    </div> 
    {/if}
  {/each}
</div>

<style>
  #map {
    width: 100%;
    height: 50vh;
  }

  #instructions{
    position: absolute;
    top:120px;
    right:15px;
    width:250px;
  background-color: white;
  padding:5px;
  border:1px solid grey;
  font-family:Arial, Helvetica, sans-serif

  }
</style>
