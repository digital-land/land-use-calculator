<script lang="ts">
  import { onMount } from "svelte";
  import { fromArrayBuffer } from "geotiff";
  import * as turf from "@turf/turf";
  import proj4 from "proj4"; // optional if you reproject GeoJSON on download


  // --- state ---
  let pathData = $state("");
  let dissolved: turf.FeatureCollection | null = null;
  let bbox: [number, number, number, number] | null = $state(null); // [minX, minY, maxX, maxY]

  // viewBox parameters (world coordinates)
  let vbLeft = 0;
  let vbTop = 0;
  let vbWidth = 1;
  let vbHeight = 1;
  let viewBoxStr = $state("0 0 1 1");

  // flip translate (to flip Y so north is up)
  let flipTranslate = $state(0);

  // panning state (we pan by changing the viewBox)
  let isPanning = false;
  let panStartScreen: [number, number] = [0, 0];
  let panStartVbLeft = 0;
  let panStartVbTop = 0;

  // --- reactive: when bbox is ready, initialize viewBox to it ---

$effect(() => {
  if (bbox) {
    const [minX, minY, maxX, maxY] = bbox;
    vbLeft = minX;
    vbTop = minY;
    vbWidth = maxX - minX;
    vbHeight = maxY - minY;
    viewBoxStr = `${vbLeft} ${vbTop} ${vbWidth} ${vbHeight}`;
    // translate amount to flip Y
    flipTranslate = minY + maxY;
  }
});

  // --- utility: make path string from polygon feature (coords are EPSG:27700 world units) ---
  function polygonToPath(polygon: turf.AllGeoJSON): string {
    if (!polygon || !polygon.geometry) return "";
    if (polygon.geometry.type === "Polygon") {
      return polygon.geometry.coordinates
        .map((ring) => "M " + ring.map((pt) => pt.join(",")).join(" L ") + " Z")
        .join(" ");
    } else if (polygon.geometry.type === "MultiPolygon") {
      return polygon.geometry.coordinates
        .map((poly) =>
          poly
            .map((ring) => "M " + ring.map((pt) => pt.join(",")).join(" L ") + " Z")
            .join(" ")
        )
        .join(" ");
    }
    return "";
  }

  // --- load and process GeoTIFF (similar to your working code) ---
  async function loadTiff(url: string) {
    const resp = await fetch(url);
    const arrayBuffer = await resp.arrayBuffer();
    const tiff = await fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    const raster = await image.readRasters({ interleave: true });

    const origin = image.getOrigin(); // [xMin, yMax]
    const res = image.getResolution(); // [xRes, yRes]

    // build raster grid (0/1)
    const grid = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => raster[y * width + x])
    );

    processGrid(grid, width, height, origin, res);
  }

  // pixel -> projected coords (EPSG:27700)
  function pixelToGeo(x: number, y: number, origin: number[], res: number[]) {
    const [xMin, yMax] = origin;
    const [xRes, yRes] = res;
    return [xMin + x * xRes, yMax + y * yRes];
  }

  function processGrid(grid: number[][], cols: number, rows: number, origin: number[], res: number[]) {
    // label clusters (flood-fill)
    const labels: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
    let currentLabel = 1;
    const inGrid = (y: number, x: number) => y >= 0 && y < rows && x >= 0 && x < cols;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === 1 && labels[y][x] === 0) {
          const stack: [number, number][] = [[y, x]];
          while (stack.length) {
            const [cy, cx] = stack.pop()!;
            if (!inGrid(cy, cx)) continue;
            if (grid[cy][cx] !== 1 || labels[cy][cx] > 0) continue;
            labels[cy][cx] = currentLabel;
            stack.push([cy - 1, cx], [cy + 1, cx], [cy, cx - 1], [cy, cx + 1]);
          }
          currentLabel++;
        }
      }
    }

    // build polygons (projected coords)
    const features: turf.AllGeoJSON[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (labels[y][x] > 0) {
          const ring = [
            pixelToGeo(x, y, origin, res),
            pixelToGeo(x + 1, y, origin, res),
            pixelToGeo(x + 1, y + 1, origin, res),
            pixelToGeo(x, y + 1, origin, res),
            pixelToGeo(x, y, origin, res),
          ];
          features.push(turf.polygon([ring], { clusterId: labels[y][x] }));
        }
      }
    }

    const fc = turf.featureCollection(features);
    dissolved = turf.dissolve(fc, { propertyName: "clusterId" });

    // compute bbox in projected coords
    bbox = turf.bbox(dissolved) as [number, number, number, number];

    // pathData for preview (projected coords)
    pathData = dissolved.features.map(polygonToPath).join(" ");
  }

  // --- viewBox-based pan/zoom handlers (pan at mouse speed regardless of zoom) ---

  function svgClientRect() {
    const svg = document.querySelector("svg");
    return svg ? svg.getBoundingClientRect() : null;
  }

  function onMouseDown(event: MouseEvent) {
    if (!bbox) return;
    isPanning = true;
    panStartScreen = [event.clientX, event.clientY];
    panStartVbLeft = vbLeft;
    panStartVbTop = vbTop;
  }
  function onMouseMove(event: MouseEvent) {
    if (!isPanning || !bbox) return;
    const rect = svgClientRect();
    if (!rect) return;
    const dxPixels = event.clientX - panStartScreen[0];
    const dyPixels = event.clientY - panStartScreen[1];
    // convert pixel deltas to world units
    const dxWorld = dxPixels * (vbWidth / rect.width);
    const dyWorld = dyPixels * (vbHeight / rect.height);
    // dragging right -> content should move right -> viewBox left decreases
    vbLeft = panStartVbLeft - dxWorld;
    vbTop = panStartVbTop - dyWorld;
    viewBoxStr = `${vbLeft} ${vbTop} ${vbWidth} ${vbHeight}`;
    // flipTranslate must update since vbTop changed
    flipTranslate = vbTop + (vbTop + vbHeight);
  }
  function onMouseUp() {
    isPanning = false;
  }

  function onWheel(event: WheelEvent) {
    if (!bbox) return;
    event.preventDefault();
    const rect = svgClientRect();
    if (!rect) return;
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const worldX = vbLeft + (mx * (vbWidth / rect.width));
    const worldY = vbTop + (my * (vbHeight / rect.height));
    const zoomFactor = event.deltaY < 0 ? 1 / 1.1 : 1.1; // wheel up => zoom in
    const newW = vbWidth * zoomFactor;
    const newH = vbHeight * zoomFactor;
    // keep mouse point stable
    vbLeft = worldX - (mx * (newW / rect.width));
    vbTop = worldY - (my * (newH / rect.height));
    vbWidth = newW;
    vbHeight = newH;
    viewBoxStr = `${vbLeft} ${vbTop} ${vbWidth} ${vbHeight}`;
    flipTranslate = vbTop + (vbTop + vbHeight);
  }



  // --- define EPSG:27700 in proj4 ---
  proj4.defs(
    "EPSG:27700",
    "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 " +
    "+x_0=400000 +y_0=-100000 +ellps=airy " +
    "+towgs84=446.448,-125.157,542.06,0.1502,0.2470,0.8421,-20.4894 +units=m +no_defs"
  );

  const proj27700toWGS84 = proj4("EPSG:27700", "EPSG:4326");

  // ... keep all your previous code for TIFF loading, grid processing, pathData, bbox, pan/zoom ...

  // --- download function with reprojection ---
  function downloadGeoJSON() {
    if (!dissolved) return;

    // Deep clone & reproject
    const reprojected = JSON.parse(JSON.stringify(dissolved));
    reprojected.features.forEach((f: any) => {
      const { type, coordinates } = f.geometry;
      if (type === "Polygon") {
        f.geometry.coordinates = coordinates.map((ring: number[][]) =>
          ring.map(([x, y]) => proj27700toWGS84.forward([x, y]))
        );
      } else if (type === "MultiPolygon") {
        f.geometry.coordinates = coordinates.map((poly: number[][][]) =>
          poly.map((ring: number[][]) =>
            ring.map(([x, y]) => proj27700toWGS84.forward([x, y]))
          )
        );
      }
    });

    // Add CRS metadata note (optional, many tools assume WGS84 anyway)
    reprojected.crs = {
      type: "name",
      properties: { name: "EPSG:4326" }
    };

    const geojsonStr = JSON.stringify(reprojected);
localStorage.geoJson=geojsonStr;
    const blob = new Blob([geojsonStr], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clusters_wgs84.geojson";  // filename indicates WGS84
    a.click();
    URL.revokeObjectURL(url);
  }


 function goToMap() {
  if (!dissolved) {
    alert("No GeoJSON loaded. Go back and generate data first.");
    return;
  }

  // Make sure the store has the latest reprojected data
  downloadGeoJSON(); // sets geojsonStore

  // Navigate to map page
  window.location.href = "/map";
}

  onMount(() => {
    loadTiff("cornwall_forest.tif");
  });
</script>

<button onclick={downloadGeoJSON}>Download GeoJSON (WGS84)</button>

<svg
  width="800"
  height="800"
  viewBox={viewBoxStr}
  style="background:#f9f9f9; border:1px solid #ccc; cursor:grab"
  onmousedown={onMouseDown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
  onmouseleave={onMouseUp}
  onwheel={onWheel}
  aria-hidden="true"
>
  {#if bbox}
    <!-- flip Y so north is up. flipTranslate updates whenever viewBox changes -->
    <g transform={`translate(0, ${flipTranslate}) scale(1, -1)`}>
      <path d={pathData} fill="lightblue" stroke="blue" stroke-width="2" fill-rule="evenodd"/>
    </g>
  {/if}
</svg>
<button onclick={goToMap}>View on Map</button>

<style>
  svg { touch-action: none; } /* good for touch/drag */
</style>
