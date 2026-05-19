import * as turf from "@turf/turf";
import proj4 from "proj4";

/* EPSG:27700 definition */
proj4.defs(
  "EPSG:27700",
  "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 " +
    "+x_0=400000 +y_0=-100000 +ellps=airy " +
    "+towgs84=446.448,-125.157,542.06,0.1502,0.2470,0.8421,-20.4894 +units=m +no_defs",
);

const proj27700toWGS84 = proj4("EPSG:27700", "EPSG:4326");

export function indicesToGeoJSON(
  indices: Uint32Array,
  width: number,
  height: number,
  origin: [number, number],
  res: [number, number],
) {
  // if (typeof indices === undefined) return;
  const [xMin, yMax] = origin;
  const [xRes, yRes] = res;

  // --- Prepare fast lookup of filled pixels ---
  const filledSet = new Set<number>(indices);

  // --- labels array ---
  const labels = new Uint32Array(width * height);
  let currentLabel = 1;

  const inGrid = (y: number, x: number) =>
    x >= 0 && y >= 0 && x < width && y < height;

  // --- Iterative flood-fill ---
  for (const i of indices) {
    if (labels[i] > 0) continue; // already labeled

    const queue: [number, number][] = [];
    const x = i % width;
    const y = Math.floor(i / width);
    queue.push([y, x]);

    while (queue.length) {
      const [cy, cx] = queue.shift()!;
      const idx = cy * width + cx;

      if (!inGrid(cy, cx)) continue;
      if (!filledSet.has(idx)) continue;
      if (labels[idx] > 0) continue;

      labels[idx] = currentLabel;

      queue.push([cy - 1, cx], [cy + 1, cx], [cy, cx - 1], [cy, cx + 1]);
    }

    currentLabel++;
  }

  // --- pixel → projected coordinates ---
  function pixelToGeo(x: number, y: number) {
    return [xMin + x * xRes, yMax + y * yRes];
  }

  // --- merge horizontal runs into polygons ---
  const features: turf.Feature<turf.Polygon>[] = [];

  for (let y = 0; y < height; y++) {
    let runStart = -1;
    let runLabel = 0;

    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const label = labels[idx];

      if (label > 0) {
        if (runStart === -1) {
          runStart = x;
          runLabel = label;
        }
      } else if (runStart !== -1) {
        // end of run → create polygon
        const ring = [
          pixelToGeo(runStart, y),
          pixelToGeo(x, y),
          pixelToGeo(x, y + 1),
          pixelToGeo(runStart, y + 1),
          pixelToGeo(runStart, y),
        ];
        features.push(turf.polygon([ring], { clusterId: runLabel }));
        runStart = -1;
      }
    }

    // if run continues to end of row
    if (runStart !== -1) {
      const ring = [
        pixelToGeo(runStart, y),
        pixelToGeo(width, y),
        pixelToGeo(width, y + 1),
        pixelToGeo(runStart, y + 1),
        pixelToGeo(runStart, y),
      ];
      features.push(turf.polygon([ring], { clusterId: runLabel }));
    }
  }

  // --- dissolve clusters into proper polygons with holes ---
  const fc = turf.featureCollection(features);
  const dissolved = turf.dissolve(fc, { propertyName: "clusterId" });

  // --- reproject to WGS84 ---
  const reprojected = JSON.parse(JSON.stringify(dissolved));

  reprojected.features.forEach((f: any) => {
    if (f.geometry.type === "Polygon") {
      f.geometry.coordinates = f.geometry.coordinates.map((ring: number[][]) =>
        ring.map(([x, y]) => proj27700toWGS84.forward([x, y])),
      );
    } else if (f.geometry.type === "MultiPolygon") {
      f.geometry.coordinates = f.geometry.coordinates.map(
        (poly: number[][][]) =>
          poly.map((ring: number[][]) =>
            ring.map(([x, y]) => proj27700toWGS84.forward([x, y])),
          ),
      );
    }
  });

  return reprojected;
}
