<script>
  import { onMount } from "svelte";
  import { fromUrl } from "geotiff";
  import { writable } from "svelte/store";
  import { browser } from "$app/environment";
  import { CheckBox } from "@communitiesuk/svelte-component-library";
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

  let dataURL = $state();

  // UI + state
  let width = $state(0),
    height = $state(0);
  let bbox = $state([]);
  let canvas = $state();
  let ctx = $state();
  let imageData = $state();
  let rasterLayers = $state([]);
  let lookup = [];
  let bitLayers = [];
  let England;
  let selected = $state([]);
  let blendedArray = $state([]);
  let blendedArrayLength = $state(0);
  let startingPosition;
  let styleSheet = $state();
  let redValue = Math.random() * 255;
  let greenValue = Math.random() * 255;
  let blueValue = Math.random() * 255;
  let checkboxOptions = $state();
  $inspect(blendedArray.length);
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
        blendedArray = e.data.result;
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
  $inspect(rasters);
  onMount(async () => {
    const geotiff = await fromUrl("./Multilayer84.tif");
    image = await geotiff.getImage();
    width = image.getWidth();
    height = image.getHeight();
    bbox = image.getBoundingBox();
    console.log(image, width, height, bbox);
    const metadataRes = await fetch("./bitpacking_metadata.csv");
    const metadataCsv = await metadataRes.text();
    const rasterLayersParsed = parseMetadataCsv(metadataCsv);

    rasters = await image.readRasters();

    //Stripping out the border that's left from reprojecting
    rasters = rasters.map((raster) => raster.map((d) => (d === 255 ? 0 : d)));

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

    //   async function addRaster(tifLayer) {
    // console.log("ihsafd");
    // Create canvas
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    ctx = canvas.getContext("2d");

    // rasterLayers.forEach((layer) => {
    imageData = ctx.createImageData(width, height);

    // const res = await fromUrl(tifLayer);
    // console.log("res", res);
    // const image = await res.getImage();
    // console.log("img", image.getGeoKeys());

    // const [originX, pixelWidth, , originY, , pixelHeight] =
    //   image.getGeoKeys().ModelPixelScale;

    // const width = image.getWidth();
    // const height = image.getHeight();

    // const rasters = await image.readRasters({ interleave: true });
    // const band = rasters; // 1 band: Float32Array or Uint8Array, depending on TIFF
    // const band = $derived(blendedArray);

    // function getMinMax(arr) {
    //   let min = Infinity,
    //     max = -Infinity;
    //   for (let i = 0; i < arr.length; i++) {
    //     if (!isNaN(arr[i])) {
    //       if (arr[i] < min) min = arr[i];
    //       if (arr[i] > max) max = arr[i];
    //     }
    //   }
    //   return [min, max];
    // }
    // $inspect(band);
    // Normalize values to 0-255
    // const [min, max] = getMinMax(blendedArray);
    // const scale = 255 / (max - min);

    // Fill imageData with raster values

    // console.log({ imageData });

    // });

    // Define image bounds from GeoTIFF metadata
    // const bbox = image.getBoundingBox(); // [minX, minY, maxX, maxY]
    // console.log(bbox);

    // // Add as image source
    // map.addSource("geotiff-image", {
    //   type: "image",
    //   url: dataURL,
    //   coordinates: [
    //     [bbox[0], bbox[3]], // top-left
    //     [bbox[2], bbox[3]], // top-right
    //     [bbox[2], bbox[1]], // bottom-right
    //     [bbox[0], bbox[1]], // bottom-left
    //   ],
    // });

    // // map.removeLayer("geotiff-layer");

    // map.addLayer({
    //   id: "geotiff-layer",
    //   source: "geotiff-image",
    //   type: "raster",
    //   paint: { "raster-opacity": 0.55 },
    // });
    // }
  });
  // $inspect(selected, rasterLayers);
  $effect(() => {
    console.log(blendedArrayLength, blendedArray.length);
    for (let i = 0; i < blendedArray.length; i++) {
      const value = blendedArray[i];
      // console.log(value);
      imageData.data[i * 4 + 0] = 255; // redValue; //R
      imageData.data[i * 4 + 1] = 255; // greenValue; //G
      imageData.data[i * 4 + 2] = 255; // blueValue; //B
      imageData.data[i * 4 + 3] = value !== 0 ? 255 : 0; //Alpha
    }

    if (canvas) {
      ctx.putImageData(imageData, 0, 0);

      // Convert canvas to data URL
      dataURL = canvas.toDataURL();
    }

    styleSheet = {
      version: 8,
      sources: {
        "geotiff-image":
          dataURL && bbox
            ? {
                type: "image",
                url: dataURL,
                coordinates: [
                  [bbox[0], bbox[3]], // top-left
                  [bbox[2], bbox[3]], // top-right
                  [bbox[2], bbox[1]], // bottom-right
                  [bbox[0], bbox[1]], // bottom-left
                ],
              }
            : {},
        labels: {
          type: "raster",
          tiles: [
            "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution:
            "Labels © Esri — Source: Esri and the GIS User Community",
        },
        esri: {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution:
            "Imagery © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        },
      },
      layers: [
        {
          id: "esri-imagery",
          type: "raster",
          source: "esri",
        },
        {
          id: "geotiff-layer",
          source: "geotiff-image",
          type: "raster",
          paint: { "raster-opacity": 1 },
        },
        {
          id: "esri-labels",
          type: "raster",
          source: "labels",
        },
      ],
    };
    if (rasterLayers.length) {
      checkboxOptions = rasterLayers
        .filter((d) => d.filename !== "ENGLAND_MASTER_KM.tif")
        .map((d) => {
          return {
            label: `${d.filename.replace(".tif", "").replaceAll("_", " ")}: ${
              d.area?.toLocaleString() ?? 0
            } kM2`,
            value: d.filename,
          };
        });
    }

    // console.log(checkboxOptions);
  });

  $inspect(checkboxOptions);
  let selectionsLength = $derived(selected.length);
  $effect(() => {
    selectionsLength = selected.length;
    updateBlending();
  });
</script>

<h1>[Heading]</h1>
<p>[Description]</p>
<h2>
  The total area of land in England is {rasterLayers
    .find((e) => e.filename === "ENGLAND_MASTER_KM.tif")
    ?.area.toLocaleString()} kM2, removing undevelopable land there is {(
    rasterLayers.find((e) => e.filename === "ENGLAND_MASTER_KM.tif")?.area -
    blendedArrayLength
  ).toLocaleString()} kM2
</h2>
<p>[potentially visualisations]</p>

<div class="container">
  <div>
    {#await image}
      {console.log("")}
    {:then image}
      {console.log("done waiting")}
      <!-- {#if dataURL && bbox} -->
      <!-- {console.log(bbox)} -->
      <Map onclick={logClick} mapHeight={700} {styleSheet} />
      <!-- {/if} -->
    {/await}
  </div>
  <div class="output">
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

        <!-- 
           <CheckBox
          legend={""}
          small={true}
          name={"checkboxes"}
          options={checkboxOptions}
          bind:selectedValues={selected}
        />    
-->
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
  </div>
</div>

<h2>Selected area</h2>
<details open>
  <summary>Expand to adjust</summary>
  <p>Clicked location is {clickedLocation}</p>
  <p>Corresponding tile pixel coordinate: {tileAtClickedLocation}</p>
  <p>Pixel covers the following GPS area: {tileArea}</p>
  <p>Data at this location: {tileData}</p>
</details>

<style>
  .container {
    display: grid;
    grid-template-columns: 65% 35%;
  }
  .output {
    padding: 10px;
  }
</style>
