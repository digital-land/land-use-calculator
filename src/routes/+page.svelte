<script>
  import { onMount } from "svelte";
  import { fromUrl } from "geotiff";
  import { writable } from "svelte/store";
  import { browser } from "$app/environment";
  // import { Map } from "@communitiesuk/svelte-component-library";
  import Map from "$lib/map/Map.svelte";

  function transform(a, b, M, roundToInt = false) {
    const round = (v) => (roundToInt ? v | 0 : v);
    return [
      round(M[0] + M[1] * a + M[2] * b),
      round(M[3] + M[4] * a + M[5] * b),
    ];
  }

  let gpsToPixel,
    pixelToGPS,
    rasters,
    image = $state();

  let clickedLocation = $state(undefined);
  let tileAtClickedLocation = $derived(
    clickedLocation
      ? transform(clickedLocation.lng, clickedLocation.lat, gpsToPixel, true)
      : undefined
  );
  let tileArea = $derived(
    tileAtClickedLocation
      ? [
          transform(
            tileAtClickedLocation[0],
            tileAtClickedLocation[1],
            pixelToGPS
          ),
          transform(
            tileAtClickedLocation[0] + 1,
            tileAtClickedLocation[1] + 1,
            pixelToGPS
          ),
        ]
      : undefined
  );
  let tileData = $derived(
    tileAtClickedLocation
      ? rasters.map(
          (layer) =>
            layer[
              tileAtClickedLocation[0] +
                tileAtClickedLocation[1] * rasters.width
            ]
        )
      : undefined
  );
  $inspect(clickedLocation, tileAtClickedLocation, tileArea, tileData);

  function logClick(e) {
    clickedLocation = e.lngLat;
  }

  let styleSheet = {
    version: 8,
    sources: {
      esri: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution:
          "Imagery © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      },
      labels: {
        type: "raster",
        tiles: [
          "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Labels © Esri — Source: Esri and the GIS User Community",
      },
    },
    layers: [
      {
        id: "esri-imagery",
        type: "raster",
        source: "esri",
      },
      {
        id: "esri-labels",
        type: "raster",
        source: "labels",
      },
    ],
  };

  // UI + state
  let width = 0,
    height = 0;
  let rasterLayers = $state([]);
  let lookup = [];
  let bitLayers = [];
  let England;
  let selected = $state([]);
  let blendedArrayLength = $state(0);
  let startingPosition;

  const blendingProgress = writable(0);

  // Workers
  let unpackWorker, blendWorker;

  // Init workers on client
  if (browser) {
    unpackWorker = new Worker(
      new URL("$lib/workers/bitUnpackerWorker.js", import.meta.url),
      { type: "module" }
    );

    blendWorker = new Worker(
      new URL("$lib/workers/blendWorker.js", import.meta.url),
      { type: "module" }
    );

    unpackWorker.onmessage = (e) => {
      const { bitLayers: bits, rasterLayers: layers } = e.data;

      if (!Array.isArray(bits) || !Array.isArray(layers)) {
        console.error("Worker returned unexpected data:", e.data);
        return;
      }

      bitLayers = bits;
      rasterLayers = layers;

      // Only assign .data, don't compute .area again
      rasterLayers.forEach((layer, i) => {
        layer.data = bitLayers[i];
      });

      England = rasterLayers.find(
        (l) => l.filename === "ENGLAND_MASTER_KM.tif"
      )?.data;
      selected = rasterLayers
        .map((e) => e.filename)
        .filter((e) => e != "ENGLAND_MASTER_KM.tif");

      startingPosition = rasterLayers
        .map((e) => e.filename)
        .filter((e) => e != "ENGLAND_MASTER_KM.tif");
      updateBlending();
    };

    blendWorker.onmessage = (e) => {
      if (e.data.progress !== undefined) {
        blendingProgress.set(e.data.progress);
      } else if (e.data.type === "done") {
        blendedArrayLength = e.data.activeCount;
        blendingProgress.set(100);
      }
    };
  }

  // Util: Count '1's
  function countOnes(arr) {
    return arr.reduce((sum, val) => sum + val, 0);
  }

  // Trigger blending in worker
  function updateBlending() {
    if (!England) return;
    const active = rasterLayers.filter((l) => selected.includes(l.filename));
    const bitArrays = active.map((l) => l.data);
    blendingProgress.set(0);
    blendWorker.postMessage({ bitArrays, englandMask: England });
  }

  // Parse metadata CSV
  function parseMetadataCsv(csvText) {
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",");
    return lines.slice(1).map((line) => {
      const values = line.split(",");
      const row = {};
      headers.forEach((h, i) => (row[h] = values[i]));
      return row;
    });
  }

  onMount(async () => {
    const geotiff = await fromUrl("./output.tif");
    image = await geotiff.getImage();
    width = image.getWidth();
    height = image.getHeight();

    const metadataRes = await fetch("./bitpacking_metadata.csv");
    const metadataCsv = await metadataRes.text();
    const rasterLayersParsed = parseMetadataCsv(metadataCsv);

    rasters = await image.readRasters();
    unpackWorker.postMessage({
      rasters,
      width,
      height,
      rasterLayers: rasterLayersParsed,
    });
    console.log("sp", startingPosition);

    const lerp = (a, b, t) => (1 - t) * a + t * b;

    // Construct the WGS-84 forward and inverse affine matrices:
    const { ModelPixelScale: s, ModelTiepoint: t } = image.fileDirectory;
    console.log(s, t);
    let [sx, sy, sz] = s;
    let [px, py, k, gx, gy, gz] = t;
    sy = -sy; // WGS-84 tiles have a "flipped" y component

    pixelToGPS = [gx, sx, 0, gy, 0, sy];
    console.log(`pixel to GPS transform matrix:`, pixelToGPS);

    gpsToPixel = [-gx / sx, 1 / sx, 0, -gy / sy, 0, 1 / sy];
    console.log(`GPS to pixel transform matrix:`, gpsToPixel);

    // Convert a GPS coordinate to a pixel coordinate in our tile:
    const [gx1, gy1, gx2, gy2] = image.getBoundingBox();

    const lat = lerp(gy1, gy2, Math.random());

    const long = lerp(gx1, gx2, Math.random());

    console.log(
      `Looking up GPS coordinate (${lat.toFixed(6)},${long.toFixed(6)})`
    );

    const [x, y] = transform(long, lat, gpsToPixel, true);

    console.log(`Corresponding tile pixel coordinate: [${x}][${y}]`);

    // And as each pixel in the tile covers a geographic area, not a single
    // GPS coordinate, get the area that this pixel covers:
    const gpsBBox = [
      transform(x, y, pixelToGPS),
      transform(x + 1, y + 1, pixelToGPS),
    ];

    console.log(`Pixel covers the following GPS area:`, gpsBBox);

    console.log("rasters", rasters);

    // const { width, [0]: flood, [1]: bua, [2]: trees, [3]: england} = rasters;

    // const cover = {flood: flood[x + y * width], bua: bua[x + y * width], trees: trees[x + y * width], england: england[x + y * width]}

    // console.log(`At (${lat.toFixed(6)},${long.toFixed(6)}) the data show ${JSON.stringify(cover)}`);
  });
  $inspect(selected, rasterLayers);
</script>

<h1>[Heading]</h1>
<p>[Description]</p>
<h2>[Headline takeaway statement]</h2>
<p>[potentially visualisations]</p>

<div class="container">
  <div>
    {#await image}
      {console.log("Waiting")}
    {:then image}
      {console.log("done waiting")}
      <Map
        tifLayer={"/output.tif"}
        onclick={logClick}
        mapHeight={500}
        {styleSheet}
      />
    {/await}
  </div>
  <div class="output">
    <h2>Selected filters</h2>
    <details>
      <summary>Expand to adjust</summary>
      <p>Clicked location is {clickedLocation}</p>
      <p>Corresponding tile pixel coordinate: {tileAtClickedLocation}</p>
      <p>Pixel covers the following GPS area: {tileArea}</p>
      <p>Data at this location: {tileData}</p>
    </details>
    <div></div>
  </div>
</div>
<h1>
  The app that answers: How much land in England is not in these categories?
</h1>

{#if rasterLayers.length}
  <p>
    England total: {rasterLayers
      .find((e) => e.filename === "ENGLAND_MASTER_KM.tif")
      ?.area.toLocaleString()} KM2
  </p>

  <fieldset>
    <legend>Layers to turn on/off:</legend>
    <button
      onclick={() => {
        selected.length = 0;
        updateBlending();
        return (selected = selected);
      }}>all off</button
    >
    <button
      onclick={() => {
        selected.length = 0;
        startingPosition.forEach((e) => selected.push(e));
        updateBlending();
        return (selected = selected);
      }}>all on</button
    >
    {#each rasterLayers as layer (layer.filename)}
      {#if layer.filename !== "ENGLAND_MASTER_KM.tif"}
        <div>
          <input
            name="checkbox"
            type="checkbox"
            bind:group={selected}
            value={layer.filename}
            onchange={() => updateBlending()}
          />
          <label for="checkbox">
            {layer.filename.replace(".tif", "")}: {layer.area?.toLocaleString() ??
              0} KM2
          </label>
        </div>
      {/if}
    {/each}
  </fieldset>

  {#if $blendingProgress < 100}
    <p>Blending... {$blendingProgress.toFixed(1)}%</p>
    <progress max="100" value={$blendingProgress}></progress>
  {:else}
    <p>
      <b
        >English land outside selected categories:
        {(
          rasterLayers.find((e) => e.filename === "ENGLAND_MASTER_KM.tif")
            ?.area - blendedArrayLength
        ).toLocaleString()} KM2
      </b>
    </p>
  {/if}
{/if}

<style>
  .container {
    display: grid;
    grid-template-columns: 65% 35%;
  }
  .output {
    padding: 10px;
  }
</style>
