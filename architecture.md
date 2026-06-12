# Architecture

Developer-focused architecture notes for the **Land Analysis Platform**.

This document is based on the current implementation shared from:

- `src/routes/+page.svelte`
- `src/lib/components/OsMap.svelte`
- `src/lib/utils.ts`
- `src/lib/workers/pipelineWorker.js`
- `src/lib/workers/breakdownWorker.js`
- `src/lib/workers/wasmBlendWorker.js`
- `src/lib/workers/uniqueArraysWorker.js`
- `src/lib/workers/simpleZipUnpackWorker.js`

It explains how the app is structured, how data moves through it, and where key responsibilities live.

---

## 1. What this app is

The app is a **client-side raster/index analysis tool** for exploring land-use and development-constraint datasets across England.

At runtime it:

1. loads metadata describing available datasets,
2. lets the user define an area of interest (AOI),
3. loads selected datasets from either built-in static files or uploaded GeoTIFFs,
4. converts everything into shared grid/index representations,
5. computes selected coverage, unique-only coverage, density statistics, and categorical breakdowns,
6. renders results to the map and summary tabs.

The most important architectural idea is:

> **everything meaningful eventually becomes an index array.**

Once AOIs and datasets are represented as arrays of grid-cell indices, most of the application becomes efficient set-like work over typed arrays.

---

## 2. Core mental model

The app is easiest to understand if you think in terms of **grid cells and indices**, not polygons.

### 2.1 Canonical spatial representations

#### Area of interest (AOI)
Usually represented as a `Uint32Array` of cell indices.

In the main page this is usually held in:
- `customArea`

An AOI can come from:
- England default coverage
- a named policy lens
- a selected LPA feature
- a user-drawn feature
- an uploaded GeoJSON feature

#### Dataset layer
A selected layer is normally represented as a `Uint32Array` of indices where that dataset is active.

Examples:
- selected constrained land cells
- selected ownership cells
- policy-lens cells

#### Selected area
The currently selected output area is usually stored in:
- `blendedIndices`

In the current codebase, this is the **deduplicated union** of the selected layers after any AOI/policy-lens restriction has been applied.

#### Unique-only area
Per-layer exclusive coverage is stored as:
- `uniqueCounts`
- `uniqueArrays`

These power the “covered by this category and no others” behaviour.

#### Density raster
Density metrics are loaded as `Uint16Array` values in:
- `densityArray`

Examples include:
- dwellings
- business addresses

#### Breakdown raster
Categorical breakdown rasters are loaded as `Uint16Array` values in:
- `breakdownArray`

Examples include:
- LPA codes
- ownership codes

---

## 3. Top-level architecture

The repo is split into four broad layers:

### A. UI orchestration
Mainly in:
- `src/routes/+page.svelte`

Responsible for:
- app state
- AOI state
- metadata loading
- worker orchestration
- tab state
- downloads
- summary view-model creation

### B. Map integration
Mainly in:
- `src/lib/components/OsMap.svelte`

Responsible for:
- OpenLayers setup
- basemap switching
- AOI drawing/editing
- installing raster overlays into the map
- map hover/click inspection behaviour

### C. Processing workers
Mainly in:
- `src/lib/workers/*`

Responsible for:
- loading static indexed data
- decoding uploaded TIFFs
- union / unique calculations
- categorical breakdown aggregation

### D. Utility / conversion layer
Mainly in:
- `src/lib/utils.ts`

Responsible for:
- CSV parsing
- coordinate/index conversion
- AOI rasterisation
- tile helpers
- density rendering helpers
- filename/metadata helpers

---

## 4. Main application entry point: `+page.svelte`

`src/routes/+page.svelte` is the **composition root** of the app.

It owns the high-level state and coordinates almost all non-map behaviour.

### 4.1 Major state groups inside `+page.svelte`

#### UI state
Examples:
- `selectedTabId`
- `showFilters`
- `mapSize`
- `seeArea`
- `seeDensity`
- `seeBreakdown`
- `opacity`
- `drawing`

#### AOI state
Examples:
- `drawnFeature`
- `customAreaGeometry`
- `customAreaBBox`
- `tileCodes`
- `bbox`
- `width`
- `height`
- `customArea`

#### Dataset selection state
Examples:
- `metadataCsv`
- `startingPosition`
- `selected`
- `filterSections`
- `selectedSubLayers`
- `layersToUnpack`

#### Analysis state
Examples:
- `enrichedLayers`
- `currentBitArrays`
- `lensIndices`
- `blendedIndices`
- `uniqueCounts`
- `uniqueArrays`
- `densityArray`
- `breakdownArray`
- `breakdownData`

#### Render payload state
Examples:
- `dataURL`
- `densityDataURL`
- `breakdownDataURL`

---

## 5. End-to-end data flow

## 5.1 Boot sequence

On mount, the page:

1. creates off-screen canvases for density and breakdown rendering,
2. loads a precomputed England AOI index array,
3. initializes the raster WASM module,
4. loads LPA GeoJSON used for named-area selection.

This gives the app enough state to:
- select named AOIs,
- use England defaults,
- render density and breakdown overlays,
- and respond to map interactions.

---

## 5.2 Metadata loading and grid switching

Grid mode (`hectare` vs `10m`) determines:
- `gridSize`
- `sourceFolder`
- which metadata CSV is loaded
- which datasets are available

Flow:

`gridType`
→ `hectareSettings` / `tenMetreSettings`
→ `csvLocation`
→ `metadataCsv`
→ `startingPosition`
→ initial `selected`
→ unpack/blend pipeline

### Important implication
Switching grid mode is effectively a **pipeline reset**. It is not just a view preference.

---

## 5.3 AOI creation and normalisation

An AOI can enter the system through multiple routes.

### A. England / named policy lens
Used when no custom geometry is active.

### B. Drawn map feature
Created in `OsMap.svelte` using OpenLayers `Draw`.

### C. Edited map feature
Edited in `OsMap.svelte` using OpenLayers `Modify`, then cloned before being reassigned to `drawnFeature`.

### D. Uploaded GeoJSON
Parsed in `+page.svelte` and assigned to `drawnFeature`.

### E. Selected LPA
Read from LPA GeoJSON and converted into a `drawnFeature`.

### Canonical AOI chain

`drawnFeature`
→ `customAreaGeometry`
→ `customAreaBBox`
→ `tileCodes`
→ `bbox`
→ `width` / `height`
→ `geometryToGridHitsScanline(...)`
→ `customArea`

Once the AOI has become `customArea`, downstream code usually no longer cares whether it came from drawing, upload, or named-area selection.

---

## 6. The index / grid model

The utility layer in `src/lib/utils.ts` makes the spatial model explicit.

### 6.1 Origin and cell size
Important constants:
- `originX = hectareBbox[0]`
- `originY = hectareBbox[1]`
- `cellSize = 100`

These are used by:
- `coordToIndex(...)`
- `indexToCoord(...)`

### 6.2 Coordinate ↔ index conversion

#### `coordToIndex(x, y, grid)`
Converts map coordinates into a cell index.

Used in `OsMap.svelte` for:
- hover lookup
- density/breakdown cell inspection

#### `indexToCoord(index, grid)`
Converts an index into map coordinates.

Used for:
- rendering helpers
- locating density maxima
- marker placement

### 6.3 AOI rasterisation

#### `geometryToGridHitsScanline(geometry, bbox, width, height)`
Converts a polygon or multipolygon geometry into a list of hit cell indices using a scanline fill approach.

This is the key bridge between vector AOIs and the app’s internal grid/index representation.

### 6.4 AOI masks

#### `indicesToBinaryMask(indices, width, height)`
Converts sparse selected indices into a dense binary mask.

Used in:
- `breakdownWorker`
- `simpleZipUnpackWorker`
- some rendering paths

### 6.5 Tile helpers

Utilities include:
- `tileIndex`
- `tilesForBBox(...)`
- `getBBoxFromTileCodes(...)`
- `buildTileFilename(...)`

These power the tiled 10m/static-data path.

---

## 7. Dataset metadata model

The filter system is metadata-driven.

### 7.1 General dataset CSV parsing

`parseCsv(csvText)` converts metadata CSV rows into normalized `DataLayerItem`s with:
- `level`
- `tier`
- `category`
- `filename`
- `initiallyChecked`
- `dataLayer`

This metadata is used to build:
- filter panel sections
- selected chip labels
- filenames for analysis loading

### 7.2 Breakdown lookups

`parseCsvForBreakdown(csvText)` parses simpler lookup CSVs used by `breakdownWorker` for:
- area code
- area name
- category index mapping

### 7.3 Tiled dataset metadata

`parseCSVToObject(...)` reveals the expected structure for tiled 10m metadata.

It captures fields such as:
- grid size
- data type
- datum
- data structure
- date
- `tile_codes`

This supports runtime tile discovery and tile filename generation.

---

## 8. Two ingestion pipelines

The app has two distinct data-ingestion pathways.

## 8.1 Built-in static data pipeline

This is the default application path.

### Entry point
`unpackAndBlendLayers()` in `+page.svelte`

### Main worker
`src/lib/workers/pipelineWorker.js`

### Input style
- static indexed `.bin` files
- metadata-driven
- may be tiled or untiled

### Output style
- enriched raster layers
- lens indices
- union result (`blendedIndices`)
- unique counts and arrays
- optional generated bbox/canvas dimensions

---

## 8.2 Uploaded local zip / GeoTIFF pipeline

This is the local-file path.

### Entry point
- `handleFileUpload()`
- `unpackZippedLayers()`

### Main worker
`src/lib/workers/simpleZipUnpackWorker.js`

### Input style
- uploaded zip file
- metadata CSV
- TIFF ArrayBuffers

### Output style
- enriched raster layers derived from TIFF truthy cells
- policy lens area
- lens mask output
- no built-in union or unique computation inside this worker

### Downstream continuation
After `simpleZipUnpackWorker`, the app calls:
- `blendLayers()`
- `wasmBlendWorker`
- `uniqueArraysWorker`

So the upload path is more modular and less integrated than the built-in static path.

---

## 9. Worker architecture in detail

## 9.1 `pipelineWorker.js`

This is the main worker for the built-in static-data path.

### Responsibilities
- initialize WASM once
- load selected dataset arrays from `/data/...`
- support both tiled and untiled datasets
- compute a request-scoped global frame for tiled loading
- transform tile-local indices into a shared global analysis space
- load / apply the current policy lens
- intersect each selected layer with the active lens
- compute:
  - `rasterLayers`
  - `policyLensArea`
  - `lensIndices`
  - `blendedIndices`
  - `uniqueCounts`
  - `uniqueArrays`
- return optional bbox/canvas metadata for globally assembled outputs
- return per-layer tile debug info

### Important implementation details

#### Tiled vs untiled support
For each dataset, the worker checks whether tile metadata exists.

If yes:
- it either loads and globally transforms tiles,
- or concatenates selected tile arrays depending on mode.

If no:
- it loads a single indexed `.bin` array.

#### Global frame generation
`computeGlobalTileFrame(...)` builds a common canvas/index frame across all requested tiled layers.

This is especially important for the `10m` path.

#### Tile-to-global transformation
`loadTiledDatasetGlobal(...)` transforms tile-local indices into one shared coordinate/index space using:
- tile column/row
- tile-local x/y
- global frame offsets

#### Lens application
If a policy lens exists, each loaded layer is intersected with that lens before union/unique analysis.

#### Union semantics
The current `unionAndUniqueSorted(...)` implementation produces:
- a **union** of selected indices (`blendedIndices`)
- not a full set intersection

This matches the current UI concept of “area covered by the selected categories”.

### Key assumptions
- tiled datasets follow current tile-metadata conventions
- tiled assembly currently uses `width = 5000` cells per tile side
- arrays must eventually be aligned into one shared index space before combination

---

## 9.2 `simpleZipUnpackWorker.js`

This worker supports uploaded local TIFF data.

### Responsibilities
- decode uploaded TIFF ArrayBuffers using `geotiff`
- optionally build a binary lens mask from:
  - an uploaded policy-lens TIFF
  - or a custom AOI converted to a binary mask
- scan uploaded rasters pixel-by-pixel
- apply the lens mask while scanning
- convert truthy pixels into sparse `Uint32Array` index arrays
- return enriched raster-layer objects to the main thread

### Key implementation details

#### Dense-mask-first model
Unlike the built-in path, this worker works densely first:
- read raster band
- build `Uint8Array` mask
- then convert to sparse indices with `indicesOfOnes(...)`

#### Pixel semantics
The uploaded path currently interprets:
- non-zero first-band pixel = active
- zero pixel = inactive

#### Output shape
Returns:
- `rasterLayers`
- `policyLensArea`
- `lensIndices`

but does **not** compute union or unique outputs itself.

### Important caveats
- assumes uploaded rasters align with the supplied `width` and `height`
- currently uses only the first band (`rasters[0]`)
- does not validate or reconcile GeoTIFF georeferencing beyond basic shape assumptions

---

## 9.3 `wasmBlendWorker.js`

A lightweight union worker used by `blendLayers()`.

### Responsibilities
- initialize WASM once
- rebuild transferred buffers as `Uint32Array`s
- concatenate input arrays
- sort the merged result
- remove duplicates
- return the deduplicated union and active count

### Important implementation note
Despite its name, the current implementation:
- imports `binary_or`
- but does **not** use it
- and performs the union in plain JavaScript via sort/deduplicate logic

### Architectural role
This appears to be a narrower or older-style union path compared with the richer integrated logic now present in `pipelineWorker`.

---

## 9.4 `uniqueArraysWorker.js`

Computes per-layer exclusive coverage from already-aligned index arrays.

### Responsibilities
- rebuild transferred buffers as `Uint32Array`s
- scan all arrays to find the maximum encountered index
- allocate direct-index tracking arrays (`freq`, `owner`)
- determine which cells appear in exactly one selected array
- return:
  - `uniqueCounts`
  - `uniqueIndicesPerArray`

### Important characteristics
- this powers “unique-only” analysis in the table/map
- memory use scales with the maximum cell index encountered
- assumes arrays are already in the same index space
- implicitly assumes input arrays are deduplicated or near-deduplicated

---

## 9.5 `breakdownWorker.js`

Aggregates a categorical raster against the current selected mask and optional AOI mask.

### Responsibilities
- lazily initialize the raster WASM module
- cache and parse the breakdown lookup CSV
- use `categorical_count_masked(...)` to count selected cells by category
- if an AOI mask is supplied:
  - compute total counts within AOI
  - compute selected counts within AOI
- otherwise fall back to precomputed total-area data from `areas_las_pixels.json`
- attach labels, colours, and proportions
- return UI-ready JSON rows

### Important implementation details

#### Cached CSV lookup
The worker caches the parsed lookup rows per `csvUrl` to avoid repeated fetch + parse work.

#### Hectare-grid assumption
It currently imports `width` and `height` from `hectareSettings`, so the breakdown pipeline is currently hectare-oriented.

#### Code-space coupling
The worker assumes the following align:
- breakdown CSV `index`
- categorical raster values
- `BREAKDOWN_LUT` index
- area-size lookup indexing (with the current `idx + 1` convention)

### Output shape
Rows include:
- `area_code`
- `area_name`
- `selected_area`
- `total_area`
- `selected_area_as_a_proportion_of_total_area`
- `color`

---

## 10. Utility layer (`utils.ts`)

`src/lib/utils.ts` is a critical shared utility module. It is not just miscellaneous helpers; it contains a lot of the repo’s spatial assumptions and shared data-format logic.

## 10.1 Data loading helpers

### `loadIndexedArray(url)`
Loads a `.bin` file into a `Uint32Array`.
Gracefully returns an empty array on missing file / fetch failure.

### `loadIndexedArrayUint16(url)`
Equivalent helper for `Uint16Array` datasets.

These helpers are deliberately tolerant so missing data can be handled as empty coverage rather than hard failure.

---

## 10.2 Filename / metadata helpers

### `makeFileNameReadable(filename, gridType)`
Converts dataset filenames into user-facing labels.

### `makeFileNameDatasetKey(filename)`
Normalizes filenames by removing `.bin` / `.tif` suffixes.

### `buildTileFilename(tileCode, varName, meta)`
Builds tiled dataset filenames from metadata conventions.

This tells us the repo is strongly convention-driven in its file naming.

---

## 10.3 CSV / export helpers

Utilities include:
- `parseCsv(...)`
- `parseCsvForBreakdown(...)`
- `parseCSVToObject(...)`
- `jsonToCsv(...)`
- `downloadJSON(...)`
- `downloadCSV(...)`

These support both:
- runtime data setup
- user export flows

---

## 10.4 Density and canvas helpers

Important functions include:
- `createDensityCanvas(...)`
- `createDensityLayerMobile(...)`
- `createGroupLayer(...)`
- `drawGroupRaster(...)`
- `getFillStyle(...)`
- `unpackABGR(...)`

These functions implement the repo’s density overlay rendering logic and colour conversion.

### Desktop
- create a single raster canvas / blob URL

### Mobile
- split output into tiles
- create multiple `ImageStatic` layers
- return a `LayerGroup`

This same desktop/mobile split appears throughout the app.

---

## 10.5 AOI and index helpers

Important functions include:
- `coordToIndex(...)`
- `indexToCoord(...)`
- `geometryToGridHitsScanline(...)`
- `indicesToBinaryMask(...)`
- `tilesForBBox(...)`
- `getBBoxFromTileCodes(...)`

These are among the most important repo-level helpers because they define how:
- geometry becomes cell indices,
- map coordinates become lookups into analytical arrays,
- and tiles are selected for AOI-based loading.

---

## 11. OpenLayers integration: `OsMap.svelte`

`src/lib/components/OsMap.svelte` is the **OpenLayers integration layer**.

It takes reactive app state from the parent page and translates it into imperative map mutations.

## 11.1 Responsibilities

### Map bootstrapping
- register `EPSG:27700`
- initialize `Map`, `View`, controls, basemaps
- fetch Ordnance Survey service metadata
- apply OS vector tile styling

### Overlay installation
Manage three main overlay concepts:
- selected-area overlay (`tiffLayer`)
- density overlay (`densityLayer`)
- breakdown overlay (`breakdownLayer`)

### AOI interaction
- add `Draw` interaction for new custom areas
- add/remove `Modify` interaction for AOI editing
- keep `drawnFeature` in sync with the parent component

### Geographic inspection
- hover/click named boundaries
- inspect selected cells in density/breakdown modes
- show tooltip content using `breakdownData`, `densityArray`, and `breakdownArray`

### Basemap controls
- switch between OS / OSM / aerial basemaps

### Marker display
- show or hide a marker at the computed density maximum location

---

## 11.2 Desktop vs mobile overlay strategy

This component is where the two rendering payload styles converge.

### Desktop
Expects desktop overlays as image URLs and wraps them in `ImageStatic` / `ImageLayer`.

### Mobile
Expects prebuilt OpenLayers layer/group payloads from the parent and swaps them directly into the map.

This means props like:
- `dataURL`
- `densityDataURL`
- `breakdownDataURL`

are conceptually **overlay payloads**, not always plain URL strings.

---

## 11.3 AOI update model

The component uses OpenLayers `Draw` and `Modify` interactions.

### Draw flow
On `drawend`:
- `drawnFeature` is assigned to the new feature
- `selectedLA` is cleared
- `policyLens` becomes `customArea`

### Modify flow
When the user commits an edited shape, the component currently does:
- clone the edited feature from `drawSource`
- assign the clone back to `drawnFeature`
- clear `selectedLA`

This is an important design choice.

### Why cloning is necessary
OpenLayers mutates feature geometry in place, which does not automatically trigger Svelte reactivity if the same object reference is retained.

So `OsMap.svelte` is responsible for crossing the boundary between:
- imperative OpenLayers mutation
- reactive Svelte state updates

This should be preserved unless the reactive contract is redesigned more explicitly.

---

## 11.4 Hover / inspection model

The map has mode-specific inspection behaviour.

### Area mode (`seeArea`)
Hovering administrative boundary features shows:
- area name
- total area
- selected area
- selected proportion

using `breakdownData`.

### Density / breakdown modes
If the hovered map coordinate belongs to `blendedIndices`, the map shows:
- a decoded breakdown label using `CODES` and `breakdownArray`, or
- a density value using `densityArray` and `densityMetric`

This means hover correctness depends on:
- `coordToIndex(...)`
- the current `bbox`, `width`, `height`
- alignment between analytical arrays and map extent

---

## 12. Rendering architecture

The app renders three kinds of analytical overlay:

1. selected-area overlay
2. density overlay
3. breakdown overlay

## 12.1 Selected-area overlay

### Desktop
Rendered to a single in-memory canvas, then converted to a blob URL.

The main area renderer uses a compact bitmask + colour-LUT strategy to encode:
- selected area
- policy lens area
- category-specific area
- category-unique area

### Mobile
Rendered as many full-resolution tiles and returned as a `LayerGroup` of `ImageStatic` layers.

---

## 12.2 Density overlay

### Inputs
- `blendedIndices` or `customArea`
- `densityArray`
- `DENSITY_LUT`
- `bbox`, `width`, `height`

### Helpers
- `createDensityCanvas(...)`
- `createDensityLayerMobile(...)`

### Output
Either:
- a desktop blob URL
- or a mobile `LayerGroup`

---

## 12.3 Breakdown overlay

Follows the same rendering pattern as density, but uses:
- categorical array values (`breakdownArray`)
- a categorical colour LUT (`currentLUT` / `BREAKDOWN_LUT`)

---

## 13. Analytical outputs

## 13.1 Results tab

Driven mainly by:
- `tableData`
- `blendedArrayLength`
- `policyLensArea`
- `uniqueCounts`
- `selectedRestriction`

Communicates:
- total area covered by current selections
- proportion of selected AOI / policy lens
- unique-only area per selected category
- downloadable CSV and geometry outputs

---

## 13.2 Density tab

Driven mainly by:
- `densityArray`
- `densityStats`
- `densityDataURL`
- `markerLocation`

Uses `computeDensityStats(...)` over either:
- the full AOI (`customArea`)
- or the selected area (`blendedIndices`)

depending on the current “total vs selected” mode.

Typical metrics include:
- count
- sum
- mean
- median
- min
- max
- histogram

---

## 13.3 Breakdown tab

Driven mainly by:
- `breakdownMetric`
- `breakdownArray`
- `breakdownData`
- `summaryByCategory`
- `doughnutChartData`

Supports:
- total area by category
- selected area by category
- selected proportion of category

Current breakdown datasets include:
- LPAs
- ownership

---

## 14. Important implementation conventions and caveats

## 14.1 “Blend” currently means union
Several places in the code use language like “blend”, but the current implementation of the main selected result is a **union of selected layers**, not a strict intersection across all selected datasets.

This matters when changing UI wording or interpreting totals.

---

## 14.2 The repo contains multiple union/unique implementations
The current codebase includes multiple related strategies:
- `pipelineWorker` → integrated union + unique heap merge
- `wasmBlendWorker` → union-only sort/deduplicate path
- `uniqueArraysWorker` → direct-index uniqueness path

This reflects the current shape of the codebase rather than one single universal implementation.

---

## 14.3 The built-in and uploaded pipelines are intentionally different
Static built-in data:
- already preprocessed into sparse index arrays
- can support tiled loading
- uses `pipelineWorker`

Uploaded local TIFF data:
- decoded on the fly via `geotiff`
- uses dense raster scanning first
- converted to sparse indices later
- uses `simpleZipUnpackWorker`

These two paths converge downstream but are not symmetric internally.

---

## 14.4 OpenLayers objects are mutable and not inherently reactive
Any feature/geometry changes made inside OpenLayers need to cross a deliberate reactive boundary before the parent analysis state will update.

Current approach:
- clone edited feature
- assign new reference back to `drawnFeature`

---

## 14.5 `coordToIndex` / hover correctness depends on shared frame assumptions
Map hover inspection in density/breakdown modes depends on:
- coordinate/index conversion
- array extents
- `bbox`
- `width` / `height`

If hover labels are wrong, the bug may be upstream in frame alignment rather than in tooltip rendering.

---

## 14.6 Some helper and worker naming is broader or narrower than current responsibilities
Examples:
- `breakdownWorker` is now more generic than LA-only naming suggests
- `wasmBlendWorker` currently does not use `binary_or`
- `lensIndices` can mean different structures in different paths

These naming mismatches are worth keeping in mind while reading the repo.

---

## 15. Common debugging entry points

## 15.1 AOI / geometry issues
Check:
- `drawnFeature`
- `customAreaGeometry`
- `customAreaBBox`
- `tileCodes`
- `bbox`
- `customArea`

Symptoms:
- map shape updates but stats do not
- uploaded AOI behaves differently from drawn AOI
- wrong tiles selected in 10m mode

---

## 15.2 Dataset-selection issues
Check:
- `metadataCsv`
- `startingPosition`
- `selected`
- `layersToUnpack`
- parsed filename keys

Symptoms:
- filters/chips do not match loaded data
- selected labels do not match result layers
- wrong datasets appear in the table

---

## 15.3 Built-in processing issues
Check:
- `pipelineWorker`
- `debug.layers`
- `globalFrame`
- `lensIndices`
- `blendedIndices`
- `uniqueArrays`

Symptoms:
- missing tiles
- AOI unexpectedly clipped
- 10m mode gives wrong extent
- totals lower than expected because some tiles were not loaded

---

## 15.4 Uploaded zip issues
Check:
- parsed zip CSV metadata
- TIFF buffers present for expected filenames
- `simpleZipUnpackWorker`
- width/height assumptions
- resulting `rasterLayers`

Symptoms:
- uploaded data appears empty
- lens mismatches uploaded layers
- local TIFFs load but cover the wrong area

---

## 15.5 Density issues
Check:
- `densityMetric`
- `densityArray`
- `densityStats`
- `densityDataURL`
- `markerLocation`

Symptoms:
- density overlay missing
- histogram inconsistent with visible selection
- max marker looks wrong

---

## 15.6 Breakdown issues
Check:
- `breakdownMetric`
- `chunkUrls`
- `breakdownArray`
- `breakdownData`
- `BREAKDOWN_LUT`
- breakdown CSV lookup alignment

Symptoms:
- empty doughnut chart
- wrong category colours/labels
- proportions do not line up with expected totals

---

## 16. Known limitations

Current limitations visible in the current implementation include:

- multi-feature GeoJSON upload currently effectively uses only the first feature,
- OpenLayers AOI editing needs explicit feature replacement to trigger reactivity,
- `breakdownWorker` is currently tied to hectare-grid dimensions,
- uploaded TIFF support assumes compatible raster alignment and truthy first-band semantics,
- large AOIs / dense modes may stress hover hit-testing and direct-index uniqueness approaches,
- the top-level page still owns many responsibilities and may benefit from decomposition.

---

## 17. Suggested future refactors

These are improvements to architecture clarity rather than urgent fixes.

### 17.1 Unify union / unique logic
At the moment, union and uniqueness are computed in multiple places using different strategies.

A future cleanup could make one path authoritative and reduce duplication.

### 17.2 Make AOI state more explicit
A dedicated AOI module/store could normalize:
- England
- policy lens
- selected named area
- drawn/uploaded feature

into one explicit internal AOI model before raster conversion.

### 17.3 Clarify built-in vs uploaded contracts
A small internal doc/table for:
- expected raster alignment
- index space assumptions
- lens representation differences

would make onboarding easier.

### 17.4 Narrow presentation logic in workers
Some workers currently return presentation-enriched data (e.g. colours in `breakdownWorker`).

That is workable, but a future refactor could make worker/UI boundaries more consistent.

### 17.5 Break up `+page.svelte`
The page currently combines:
- state orchestration
- worker coordination
- analysis setup
- render payload preparation
- download logic

Splitting some of those into feature-specific modules or stores would improve maintainability.

---

## 18. Summary

The current repo architecture is built around a simple but powerful principle:

> convert geometry and raster data into shared grid-cell index arrays, then do fast typed-array operations over those indices.

That principle shows up everywhere:
- AOI rasterisation (`geometryToGridHitsScanline`)
- tiled dataset assembly (`pipelineWorker`)
- uploaded TIFF conversion (`simpleZipUnpackWorker`)
- union/unique analysis (`pipelineWorker`, `wasmBlendWorker`, `uniqueArraysWorker`)
- breakdown aggregation (`breakdownWorker`)
- hover inspection (`coordToIndex` + analytical arrays)
- rendering (desktop canvas and mobile tiled layers)

The result is a browser-based analysis system that can:
- work interactively with large datasets,
- support both built-in and local-uploaded data,
- and keep a single conceptual model across maps, tables, density views, and categorical breakdowns.
