# DLAP Land Ownership Raster QA Methodology (Technical Summary)

## Purpose

This methodology defines a reproducible approach to:

Eliminate non-raster sources of error in land ownership statistics and isolate the residual difference attributable to rasterisation.

Non-raster error sources include:
- Duplicate rows and geometries
- Overlapping legal interests (stacking)
- Underground/mineral title artefacts
- CCOD / OCOD precedence issues
- SQL classification or filtering errors

---

## Core Measurement Framework

Three area measures are calculated per category:

| Measure | Definition | Behaviour |
|--------|-----------|----------|
| ha_sum | Sum of all polygon areas | Double-counts overlaps |
| ha_union | Dissolved footprint (ST_UnaryUnion) | True surface area |
| ha_raster | Raster-derived area | Pixel-based approximation |

### Error decomposition

Total gap = ha_sum − ha_raster

= (ha_sum − ha_union)     → overlap / SQL artefacts
+ (ha_union − ha_raster)  → rasterisation effect

---

## Data Preprocessing (QA Steps)

### 1. Remove duplicate rows

Eliminate exact duplicates:
- Same title_no
- Same geometry (geom_hash)

### 2. Identify and manage duplicate geometries

- Multiple titles sharing the same geometry are common and valid
- These represent legal overlaps, not errors
- Do not remove blindly

### 3. Remove underground / mineral titles

Exclude titles representing subsurface rights rather than surface land using CCOD text fields.

Patterns used:
- mine, mines
- mineral, minerals
- subsoil, substrata
- evaporite
- below a depth

Applied to:
- property_address
- proprietor_name_1

### 4. Validate CCOD vs OCOD precedence

Check for titles appearing in both datasets.

Expected:
- CCOD should take precedence
- OCOD-only titles should not overlap with CCOD

### 5. Quantify overlap inflation

Measure non-raster inflation:

ha_overlap_inflation = ha_sum − ha_union

---

## Ultimate QA Query

```sql
WITH base AS (
  SELECT DISTINCT ON (cat, title_no, geom_hash)
    cat, title_no, geom_hash, geom
  FROM nps_categorised
  ORDER BY cat, title_no, geom_hash
),
enriched AS (
  SELECT
    b.*,
    c.property_address,
    c.proprietor_name_1,
    (c.title_number IS NOT NULL) AS in_ccod,
    EXISTS (
      SELECT 1 FROM ocod_full_2025_12 o
      WHERE o.title_number = b.title_no
    ) AS in_ocod
  FROM base b
  LEFT JOIN ccod_full_2025_12 c
    ON c.title_number = b.title_no
),
filtered AS (
  SELECT *
  FROM enriched
  WHERE NOT (
    in_ccod AND (
      COALESCE(property_address,'') ILIKE ANY (ARRAY[
        '%mine%','%mineral%','%subsoil%',
        '%substrata%','%evaporite%',
        '%below a depth%'
      ])
      OR COALESCE(proprietor_name_1,'') ILIKE '%mineral%'
    )
  )
)

SELECT
  cat,
  COUNT(*) AS n_features,
  COUNT(DISTINCT title_no) AS n_titles,
  COUNT(DISTINCT geom_hash) AS n_unique_geoms,

  SUM(ST_Area(geom))/10000.0 AS ha_sum,
  ST_Area(ST_UnaryUnion(ST_Collect(geom)))/10000.0 AS ha_union,
  (SUM(ST_Area(geom)) - ST_Area(ST_UnaryUnion(ST_Collect(geom))))/10000.0 AS ha_overlap_inflation,

  percentile_cont(0.5) WITHIN GROUP (ORDER BY ST_Area(geom)/10000.0) AS median_hectares,

  AVG(in_ccod::int) AS pct_in_ccod,
  AVG(in_ocod::int) AS pct_in_ocod

FROM filtered
GROUP BY cat
ORDER BY ha_union DESC;
```

---

## Interpretation Guidelines

- Large ha_sum − ha_union → overlaps / SQL artefacts
- Large ha_union − ha_raster → rasterisation effects
- Small overlap + large raster gap → expected raster behaviour

---

## Expected Outcomes

After applying QA steps:

- Major artificial inflation sources removed
- Mineral rights artefacts eliminated
- Duplicate geometries controlled
- Precedence errors minimised

Remaining discrepancy represents rasterisation behaviour.

Typical residual: 5–15%

---

## Key Insight

Large discrepancies are primarily driven by data artefacts and SQL issues, not rasterisation.

---

## Recommended Standard

Use ha_union (footprint), not ha_sum, when comparing with raster results.
