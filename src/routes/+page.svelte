<script>
  import { onMount } from "svelte";
  import { fromUrl, fromBlob } from "geotiff";
  import { writable } from "svelte/store";
  import { browser } from "$app/environment";
  import { CheckBox } from "@communitiesuk/svelte-component-library";
  import Map from "$lib/map/Map.svelte";
  import OsMap from "$lib/map/OSMap.svelte";
  // import OSstyle from "./Maptilerstyle.json";
  import proj4 from "proj4";
  import { base } from "$app/paths";
  import Table from "$lib/Table.svelte";

  // let gpsToPixel,
  //   pixelToGPS,
  //   rasters,
  //   image = $state();

  // function logClick(e) {
  //   clickedLocation = e.lngLat;
  // }

  let dataURL = $state();

  // UI + state
  let width = $state(0),
    height = $state(0);
  let bbox = $state([]);
  let canvas = $state();
  let ctx = $state();
  let image = $state();
  let imageData = $state();
  let rasterLayers = $state([]);
  let lookup = [];
  let bitLayers = $state([]);
  let England;
  let selected = $state([]);
  let blendedArray = $state([]);
  let blendedArrayLength = $state(0);
  let startingPosition;
  // let styleSheet = $state();
  // let redValue = Math.random() * 255;
  // let greenValue = Math.random() * 255;
  // let blueValue = Math.random() * 255;
  let checkboxOptions = $state();
  // $inspect(blendedArray.length);
  const blendingProgress = writable(0);
  let geotiffFile = $state();
  $inspect(geotiffFile);
  let tiffLocation = $derived(
    geotiffFile?.length > 0 ? geotiffFile[0] : `${base}/data/output.tif`
  );
  $inspect({ tiffLocation });
  let metadataCsv = $state();
  let geotiff = $state();
  $inspect(geotiff);

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
        (l) => l.filename === "ENGLAND_100M.tif"
      )?.data;
      selected = rasterLayers
        .map((e) => e.filename)
        .filter((e) => e != "ENGLAND_100M.tif");

      startingPosition = rasterLayers
        .map((e) => e.filename)
        .filter((e) => e != "ENGLAND_100M.tif");
      updateBlending();
    };

    unpackWorker.onerror = (e) => {
      console.log("ERROR", e);
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

  // // Util: Count '1's
  // function countOnes(arr) {
  //   return arr.reduce((sum, val) => sum + val, 0);
  // }

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
  // $inspect(rasters);
  $effect(async () => {
    geotiff =
      geotiffFile?.length > 0
        ? await fromBlob(tiffLocation)
        : await fromUrl(tiffLocation);
    image = await geotiff.getImage();
    width = image.getWidth();
    height = image.getHeight();
    bbox = image.getBoundingBox();
    console.log(image, width, height, bbox[0]);
    const metadataRes = await fetch("./bitpacking_metadata.csv");
    metadataCsv = await metadataRes.text();

    // console.log("SENDING UNPACK MESSAGE");
    if (metadataCsv) {
      unpackWorker.postMessage({
        url: tiffLocation,
        metadataCsv: metadataCsv,
      });
    }

    // console.log("sp", startingPosition);

    // const lerp = (a, b, t) => (1 - t) * a + t * b;

    // // Construct the WGS-84 forward and inverse affine matrices:
    // const { ModelPixelScale: s, ModelTiepoint: t } = image.fileDirectory;
    // console.log(s, t);
    // let [sx, sy, sz] = s;
    // let [px, py, k, gx, gy, gz] = t;
    // sy = -sy; // WGS-84 tiles have a "flipped" y component
    // pixelToGPS = [gx, sx, 0, gy, 0, sy];
    // console.log(`pixel to GPS transform matrix:`, pixelToGPS);
    // gpsToPixel = [-gx / sx, 1 / sx, 0, -gy / sy, 0, 1 / sy];
    // console.log(`GPS to pixel transform matrix:`, gpsToPixel);

    // // Convert a GPS coordinate to a pixel coordinate in our tile:
    // const [gx1, gy1, gx2, gy2] = image.getBoundingBox();
    // const lat = lerp(gy1, gy2, Math.random());
    // const long = lerp(gx1, gx2, Math.random());

    // console.log(
    //   `Looking up GPS coordinate (${lat.toFixed(6)},${long.toFixed(6)})`
    // );
    // const [x, y] = transform(long, lat, gpsToPixel, true);
    // console.log(`Corresponding tile pixel coordinate: [${x}][${y}]`);

    // const gpsBBox = [
    //   transform(x, y, pixelToGPS),
    //   transform(x + 1, y + 1, pixelToGPS),
    // ];

    // console.log(`Pixel covers the following GPS area:`, gpsBBox);
    // console.log("rasters", rasters);

    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
    imageData = ctx.createImageData(width, height);
  });
  // $inspect(selected, rasterLayers);
  $effect(() => {
    console.log(blendedArrayLength, blendedArray.length);
    for (let i = 0; i < blendedArray.length; i++) {
      const value = blendedArray[i];

      imageData.data[i * 4 + 0] = 0; // redValue; //R
      imageData.data[i * 4 + 1] = 0; // greenValue; //G
      imageData.data[i * 4 + 2] = 0; // blueValue; //B
      imageData.data[i * 4 + 3] = value !== 0 ? 255 : 0; //Alpha
    }

    if (canvas) {
      ctx.putImageData(imageData, 0, 0);

      // Convert canvas to data URL
      dataURL = canvas.toDataURL();
    }

    // const apiKey = "";

    // // Define the projections
    // const epsg3857 = "EPSG:3857";
    // const wgs84 = "EPSG:4326";

    // Define the bounding box in EPSG:3857 format
    // const bbox3857 = [minX, minY, maxX, maxY];
    // if (bbox[0]) {
    //   // Convert the coordinates
    //   const minLngLat = proj4(epsg3857, wgs84, [
    //     parseInt(bbox[0]),
    //     parseInt(bbox[1]),
    //   ]);
    //   const maxLngLat = proj4(epsg3857, wgs84, [
    //     parseInt(bbox[2]),
    //     parseInt(bbox[3]),
    //   ]);

    //   // Bounding box in LngLat format
    //   const bboxLngLat = [
    //     minLngLat[0],
    //     minLngLat[1],
    //     maxLngLat[0],
    //     maxLngLat[1],
    //   ];

    //   console.log("Bounding box in LngLat format:", bboxLngLat);

    //   styleSheet = {
    //     version: 8,
    //     sources: {
    //       "geotiff-image":
    //         dataURL && bbox
    //           ? {
    //               type: "image",
    //               url: dataURL,
    //               coordinates: [
    //                 [bboxLngLat[0], bboxLngLat[3]], // top-left
    //                 [bboxLngLat[2], bboxLngLat[3]], // top-right
    //                 [bboxLngLat[2], bboxLngLat[1]], // bottom-right
    //                 [bboxLngLat[0], bboxLngLat[1]], // bottom-left
    //               ],
    //             }
    //           : {},
    //       // "raster-tiles": {
    //       //   type: "raster",
    //       //   tiles: ["https://api.os.uk/maps/raster/v1/wmts?" + queryString],
    //       //   tileSize: 256,
    //       // },
    //       // "raster-tiles": {
    //       //   type: "raster",
    //       //   tiles: [
    //       //     "/api/maps/raster/v1/zxy/Light_3857/{z}/{x}/{y}.png?key=" + apiKey,
    //       //   ],
    //       //   tileSize: 256,
    //       // },
    //       labels: {
    //         type: "raster",
    //         tiles: [
    //           "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    //         ],
    //         tileSize: 256,
    //         attribution:
    //           "Labels © Esri — Source: Esri and the GIS User Community",
    //       },
    //       esri: {
    //         type: "raster",
    //         tiles: [
    //           "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    //         ],
    //         tileSize: 256,
    //         attribution:
    //           "Imagery © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    //       },
    //     },
    //     layers: [
    //       {
    //         id: "esri-imagery",
    //         type: "raster",
    //         source: "esri",
    //       },
    //       // {
    //       //   id: "os-maps-wmts",
    //       //   type: "raster",
    //       //   source: "raster-tiles",
    //       // },
    //       // {
    //       //   id: "os-maps-zxy",
    //       //   type: "raster",
    //       //   source: "raster-tiles",
    //       // },
    //       {
    //         id: "geotiff-layer",
    //         source: "geotiff-image",
    //         type: "raster",
    //         paint: { "raster-opacity": 1 },
    //       },
    //       {
    //         id: "esri-labels",
    //         type: "raster",
    //         source: "labels",
    //       },
    //     ],
    //     // projection: {
    //     //   type: [
    //     //     "interpolate",
    //     //     ["linear"],
    //     //     ["zoom"],
    //     //     10,
    //     //     "vertical-perspective",
    //     //     12,
    //     //     "mercator",
    //     //   ],
    //     // },
    //   };
    // }
    if (rasterLayers.length) {
      checkboxOptions = rasterLayers
        .filter((d) => d.filename !== "ENGLAND_100M.tif")
        .map((d) => {
          return {
            label: `${d.filename.replace(".tif", "").replaceAll("_", " ")}: ${
              d.area?.toLocaleString() ?? 0
            } ha`,
            value: d.filename,
          };
        });
    }

    // console.log(checkboxOptions);
  });

  // $inspect(checkboxOptions);
  let selectionsLength = $derived(selected.length);
  $effect(() => {
    // if (metadataCsv) {
    //   console.log(metadataCsv);
    //   unpackWorker.postMessage({
    //     url: tiffLocation,
    //     metadataCsv: metadataCsv,
    //   });
    // }

    selectionsLength = selected.length;
    updateBlending();
  });

  let englandArea = $derived(
    rasterLayers.find((e) => e.filename === "ENGLAND_100M.tif")?.area
  );

  let tableData = $derived(
    selected.map((layer) => {
      return {
        name: layer.replace(".tif", "").replaceAll("_", " "),
        area: rasterLayers.find((d) => d.filename == layer).area,
      };
    })
  );

  let tableMetadata = {
    name: { explainer: "About name", label: "Name", shortLabel: "Name" },
    area: { explainer: "about area", label: "Area", shortLabel: "Area" },
  };

  let sortState = $state({ column: "sortedColumn", order: "ascending" });
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@10.5.0/ol.css" />
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/gh/OrdnanceSurvey/os-api-branding@0.3.1/os-api-branding.css"
  />
  <script
    src="https://cdn.jsdelivr.net/npm/proj4@2.15.0/dist/proj4.js"
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/ol/dist/ol.js"></script>
  <script src="https://unpkg.com/ol-mapbox-style@12.3.5/dist/olms.js"></script>
  <script
    src="https://cdn.jsdelivr.net/gh/OrdnanceSurvey/os-api-branding@0.3.1/os-api-branding.js"
  ></script>
</svelte:head>

<!-- <h1>[Heading]</h1> -->
<!-- <p>[Description]</p> -->
<h2>
  The total area of land in England is {englandArea
    ? englandArea.toLocaleString()
    : "..."} ha, removing undevelopable land there is {englandArea
    ? (englandArea - blendedArrayLength).toLocaleString()
    : "..."} ha
</h2>
<!-- <p>[potentially visualisations]</p> -->

<div class="container">
  <div class="output">
    <div>
      <details>
        <summary>Upload a file (optional)</summary>
        <br />
        <label for="file-upload">Upload a geotiff file:</label>
        <input
          bind:files={geotiffFile}
          accept="image/tiff"
          id="file-upload"
          type="file"
        />
      </details>
    </div>
    {#if rasterLayers.length}
      <p>
        England total: {rasterLayers
          .find((e) => e.filename === "ENGLAND_100M.tif")
          ?.area.toLocaleString()} ha
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
          {#if layer.filename !== "ENGLAND_100M.tif"}
            <div>
              <input
                name="checkbox"
                type="checkbox"
                bind:group={selected}
                value={layer.filename}
                onchange={() => updateBlending()}
              />

              <label for="checkbox">
                {layer.filename.replace(".tif", "").replaceAll("_", " ")}
                <!-- : {layer.area?.toLocaleString() ?? 0} ha -->
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
              rasterLayers.find((e) => e.filename === "ENGLAND_100M.tif")
                ?.area - blendedArrayLength
            ).toLocaleString()} ha
          </b>
        </p>
      {/if}
    {/if}
  </div>
  <div>
    {#await image}
      {console.log("waiting")}
      <p>Generating the map...</p>
    {:then image}
      {console.log("done waiting")}
      <!-- {#if dataURL && bbox} -->
      <!-- <Map onclick={logClick} mapHeight={700} {styleSheet} /> -->

      <div class="os-map-container">
        {#key tiffLocation}
          <OsMap {dataURL} {bbox} {tiffLocation} />
        {/key}
      </div>
      <!-- {/if} -->
    {/await}
  </div>
  <div class="table">
    {#key tableData}
      {#if tableData}
        <Table
          caption={""}
          data={tableData}
          metaData={tableMetadata}
          colourScale={"Off"}
          bind:sortState
        />
      {/if}
    {/key}
  </div>
</div>

<!-- <h2>Selected area</h2>
<details open>
  <summary>Expand to adjust</summary>
  <p>Clicked location is {clickedLocation}</p>
  <p>Corresponding tile pixel coordinate: {tileAtClickedLocation}</p>
  <p>Pixel covers the following GPS area: {tileArea}</p>
  <p>Data at this location: {tileData}</p>
</details> -->

<style>
  .container {
    display: grid;
    grid-template-columns: 20% 40% 40%;
    font-family: sans-serif;
  }
  .output,
  .table {
    padding: 10px;
  }
  .os-map-container {
    height: 700px;
  }
</style>
