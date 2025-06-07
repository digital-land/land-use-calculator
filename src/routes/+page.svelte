<script>
  import { onMount } from "svelte";
  import { fromUrl } from "geotiff";
  import Map from '$lib/map/Map.svelte';


  let width = $state(0);
  let height = $state(0);
let count = $state(0)
 
  function transform(a, b, M, roundToInt = false) {
    const round = (v) => (roundToInt ? v | 0 : v);
    return [
      round(M[0] + M[1] * a + M[2] * b),
      round(M[3] + M[4] * a + M[5] * b),
    ];
  }

  let gpsToPixel, pixelToGPS;
  let rasterData = { data: null, width: 0 };

let rasters = $state([]);

  onMount(async () => {
    const res = await fromUrl(`./base.tif`);
    const image = await res.getImage();

    const { ModelPixelScale: s, ModelTiepoint: t } = image.fileDirectory;
    let [sx, sy, sz] = s;
    let [px, py, k, gx, gy, gz] = t;
    sy = -sy;

    pixelToGPS = [gx, sx, 0, gy, 0, sy];
    gpsToPixel = [-gx / sx, 1 / sx, 0, -gy / sy, 0, 1 / sy];

    const [gx1, gy1, gx2, gy2] = image.getBoundingBox();
    const lerp = (a, b, t) => (1 - t) * a + t * b;
    const lat = lerp(gy1, gy2, Math.random());
    const long = lerp(gx1, gx2, Math.random());
    const [x, y] = transform(long, lat, gpsToPixel, true);

    rasters = await image.readRasters({ samples: [0, 1, 2], interleave: false });
    width = image.getWidth();
    height = image.getHeight();
    rasterData = {
      data: rasters,
      width
    };

    console.log(`At pixel [${x},${y}]:`, rasters.map(band => band[x + y * width]));
  });

  let clickedLocation = $state(undefined);
  let tileAtClickedLocation = $derived(
    clickedLocation ? transform(clickedLocation.lng, clickedLocation.lat, gpsToPixel, true) : undefined
  );

  let tileArea = $derived(
    tileAtClickedLocation
      ? [
          transform(tileAtClickedLocation[0], tileAtClickedLocation[1], pixelToGPS),
          transform(tileAtClickedLocation[0] + 1, tileAtClickedLocation[1] + 1, pixelToGPS),
        ]
      : undefined
  );

  let tileData = $derived(
    tileAtClickedLocation && rasterData.data
      ? rasterData.data.map(layer => layer[tileAtClickedLocation[0] + tileAtClickedLocation[1] * rasterData.width])
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
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: 'Imagery © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
      },
      labels: {
        type: 'raster',
        tiles: [
          'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: 'Labels © Esri — Source: Esri and the GIS User Community'
      }
    },
    layers: [
      {
        id: 'esri-imagery',
        type: 'raster',
        source: 'esri'
      },
      {
        id: 'esri-labels',
        type: 'raster',
        source: 'labels'
      }
    ]
  };

//Count empty pixels in England
$effect(() => {
  if (!rasters || rasters.length === 0) return;

  count = 0;
  const numPixels = rasters[0].length;

  for (let i = 0; i < numPixels; i++) {
    if (
      rasters[0][i] === 1 &&
      rasters.slice(1).every(band => band[i] === 0)
    ) {
      count++;
    }
  }

  console.log("Pixels where only band 1 has a value:", count);
});

$inspect("rastas",rasters)

</script>

<h1>GeoTIFF app</h1>

<Map onclick={logClick} mapHeight={500} {styleSheet} />

<p>Clicked location is {clickedLocation}</p>
<p>Corresponding tile pixel coordinate: {tileAtClickedLocation}</p>
<p>Pixel covers the following GPS area: {tileArea}</p>
<p>Data at this location: {tileData}</p>
<p>Size of England: {count}Ha</p>

