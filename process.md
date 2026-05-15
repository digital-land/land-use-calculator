# Land Ownership Data Processing Pipeline

This document provides a structured and annotated version of the original script. It explains the purpose and logic of each major block, converting raw shell and SQL commands into a clear, readable workflow for setting up and managing the **Landstats** PostGIS database.

---
Download "National Polygon Service" (NPS) from https://use-land-property-data.service.gov.uk/
### my-datasets
Download "UK companies that own property in England and Wales" from https://use-land-property-data.service.gov.uk/
### my-datasets
Download "Overseas companies that own property in England and Wales" from https://use-land-property-data.service.gov.uk/
### my-datasets
Move all 3 zip files to Documents/land_stats_raw_data/
Unzip and then delete zip files
NPS are shapefiles. They need to be saved to a database table. We'll call the database "landstats" and name the table after the dataset: "NSD_FULL_2025_09"

###  Create the database
createdb landstats

###  Enable PostGIS extension
psql -d mydb -c "CREATE EXTENSION postgis;"

### create a table to house the NSD data. Populate it with teh first shapefile.
DBNAME="landstats"
SRID=27700
TARGET_TABLE="NSD_FULL_2025_09"

###  Use -I to add index, -s for SRID
shp2pgsql -I -s $SRID NSD_FULL_2025_09/LR_POLY_FULL_SEP_2025_0.shp
```bash $TARGET_TABLE | psql -d $DBNAME

### Get the rest of the shapefiles and add them to the table
for shp in NSD_FULL_2025_09/*.shp
```bash; do
  if [[ "$shp" != *"LR_POLY_FULL_SEP_2025_0.shp
```bash" ]]; then
    echo "Appending $shp into $TARGET_TABLE..."
    shp2pgsql -a -s $SRID "$shp" $TARGET_TABLE | psql -d $DBNAME
  fi
done

### the above might take a few hours. 

### verify

```sql
SELECT COUNT(*) FROM NSD_FULL_2025_09;

```sql
SELECT ST_SRID(geom) FROM NSD_FULL_2025_09 LIMIT 1;

### create tables for UK and Overseas companies
head -n 1 CCOD_FULL_2025_09.CSV
head -n 1 OCOD_FULL_2025_09.CSV
result:
Title Number,Tenure,Property Address,District,County,Region,Postcode,Multiple Address Indicator,Price Paid,Proprietor Name (1),Company Registration No. (1),Proprietorship Category (1),Proprietor (1) Address (1),Proprietor (1) Address (2),Proprietor (1) Address (3),Proprietor Name (2),Company Registration No. (2),Proprietorship Category (2),Proprietor (2) Address (1),Proprietor (2) Address (2),Proprietor (2) Address (3),Proprietor Name (3),Company Registration No. (3),Proprietorship Category (3),Proprietor (3) Address (1),Proprietor (3) Address (2),Proprietor (3) Address (3),Proprietor Name (4),Company Registration No. (4),Proprietorship Category (4),Proprietor (4) Address (1),Proprietor (4) Address (2),Proprietor (4) Address (3),Date Proprietor Added,Additional Proprietor Indicator
Title Number,Tenure,Property Address,District,County,Region,Postcode,Multiple Address Indicator,Price Paid,Proprietor Name (1),Company Registration No. (1),Proprietorship Category (1),Country Incorporated (1),Proprietor (1) Address (1),Proprietor (1) Address (2),Proprietor (1) Address (3),Proprietor Name (2),Company Registration No. (2),Proprietorship Category (2),Country Incorporated (2),Proprietor (2) Address (1),Proprietor (2) Address (2),Proprietor (2) Address (3),Proprietor Name (3),Company Registration No. (3),Proprietorship Category (3),Country Incorporated (3),Proprietor (3) Address (1),Proprietor (3) Address (2),Proprietor (3) Address (3),Proprietor Name (4),Company Registration No. (4),Proprietorship Category (4),Country Incorporated (4),Proprietor (4) Address (1),Proprietor (4) Address (2),Proprietor (4) Address (3),Date Proprietor Added,Additional Proprietor Indicator
ROP TABLE IF EXISTS uk_companies;

```sql
CREATE TABLE uk_companies (
    title_number text,
    tenure text,
    property_address text,
    district text,
    county text,
    region text,
    postcode text,
    multiple_address_indicator text,
    price_paid text,
    proprietor_name_1 text,
    company_registration_no_1 text,
    proprietorship_category_1 text,
    proprietor_1_address_1 text,
    proprietor_1_address_2 text,
    proprietor_1_address_3 text,
    proprietor_name_2 text,
    company_registration_no_2 text,
    proprietorship_category_2 text,
    proprietor_2_address_1 text,
    proprietor_2_address_2 text,
    proprietor_2_address_3 text,
    proprietor_name_3 text,
    company_registration_no_3 text,
    proprietorship_category_3 text,
    proprietor_3_address_1 text,
    proprietor_3_address_2 text,
    proprietor_3_address_3 text,
    proprietor_name_4 text,
    company_registration_no_4 text,
    proprietorship_category_4 text,
    proprietor_4_address_1 text,
    proprietor_4_address_2 text,
    proprietor_4_address_3 text,
    date_proprietor_added text,
    additional_proprietor_indicator text
);

```sql
DROP TABLE

```sql
CREATE TABLE
landstats=
###  
landstats=
###  
```sql
DROP TABLE IF EXISTS overseas_companies;

```sql
CREATE TABLE overseas_companies (
    title_number text,
    tenure text,
    property_address text,
    district text,
    county text,
    region text,
    postcode text,
    multiple_address_indicator text,
    price_paid text,
    proprietor_name_1 text,
    company_registration_no_1 text,
    proprietorship_category_1 text,
    country_incorporated_1 text,
    proprietor_1_address_1 text,
    proprietor_1_address_2 text,
    proprietor_1_address_3 text,
    proprietor_name_2 text,
    company_registration_no_2 text,
    proprietorship_category_2 text,
    country_incorporated_2 text,
    proprietor_2_address_1 text,
    proprietor_2_address_2 text,
    proprietor_2_address_3 text,
    proprietor_name_3 text,
    company_registration_no_3 text,
    proprietorship_category_3 text,
    country_incorporated_3 text,
    proprietor_3_address_1 text,
    proprietor_3_address_2 text,
    proprietor_3_address_3 text,
    proprietor_name_4 text,
    company_registration_no_4 text,
    proprietorship_category_4 text,
    country_incorporated_4 text,
    proprietor_4_address_1 text,
    proprietor_4_address_2 text,
    proprietor_4_address_3 text,
    date_proprietor_added text,
    additional_proprietor_indicator text
);

### Get rid of a pesky "row count" at the bottom of the tables
grep -v '^"Row Count:' CCOD_FULL_2025_09.CSV > CCOD_clean.CSV
grep -v '^"Row Count:' OCOD_FULL_2025_09.CSV > OCOD_clean.CSV

### load the CSVs to the empty tables
psql -d landstats -c "\copy uk_companies FROM 'CCOD_clean.CSV' CSV HEADER"
psql -d landstats -c "\copy overseas_companies FROM 'OCOD_clean.CSV' CSV HEADER"
Check empty space on laptop (251GB)

### save CCOD and OCOD into a single table called CCOD_OCOD_2025_09 with a column called "overseas" which would have a value of 1 if the row is from OCOD and 0 if the data is from CCOD. I then want to drop the two separate tables I have created. I only want this table to include records where "tenure" is "Freehold". I want to omit any records where property_address includes the string " mine" (case insensitive and a whitespace before it).

```sql
DROP TABLE IF EXISTS ccod_ocod_2025_09;

```sql
CREATE TABLE ccod_ocod_2025_09 AS
SELECT
    title_number,
    tenure,
    property_address,
    district,
    county,
    region,
    postcode,
    multiple_address_indicator,
    price_paid,
    proprietor_name_1,
    company_registration_no_1,
    proprietorship_category_1,
    NULL::text AS country_incorporated_1,
    proprietor_1_address_1,
    proprietor_1_address_2,
    proprietor_1_address_3,
    proprietor_name_2,
    company_registration_no_2,
    proprietorship_category_2,
    NULL::text AS country_incorporated_2,
    proprietor_2_address_1,
    proprietor_2_address_2,
    proprietor_2_address_3,
    proprietor_name_3,
    company_registration_no_3,
    proprietorship_category_3,
    NULL::text AS country_incorporated_3,
    proprietor_3_address_1,
    proprietor_3_address_2,
    proprietor_3_address_3,
    proprietor_name_4,
    company_registration_no_4,
    proprietorship_category_4,
    NULL::text AS country_incorporated_4,
    proprietor_4_address_1,
    proprietor_4_address_2,
    proprietor_4_address_3,
    date_proprietor_added,
    additional_proprietor_indicator,
    0 AS overseas
FROM uk_companies
WHERE tenure = 'Freehold'
  AND property_address !~* ' mine'
UNION ALL
SELECT
    title_number,
    tenure,
    property_address,
    district,
    county,
    region,
    postcode,
    multiple_address_indicator,
    price_paid,
    proprietor_name_1,
    company_registration_no_1,
    proprietorship_category_1,
    country_incorporated_1,
    proprietor_1_address_1,
    proprietor_1_address_2,
    proprietor_1_address_3,
    proprietor_name_2,
    company_registration_no_2,
    proprietorship_category_2,
    country_incorporated_2,
    proprietor_2_address_1,
    proprietor_2_address_2,
    proprietor_2_address_3,
    proprietor_name_3,
    company_registration_no_3,
    proprietorship_category_3,
    country_incorporated_3,
    proprietor_3_address_1,
    proprietor_3_address_2,
    proprietor_3_address_3,
    proprietor_name_4,
    company_registration_no_4,
    proprietorship_category_4,
    country_incorporated_4,
    proprietor_4_address_1,
    proprietor_4_address_2,
    proprietor_4_address_3,
    date_proprietor_added,
    additional_proprietor_indicator,
    1 AS overseas
FROM overseas_companies
WHERE tenure = 'Freehold'
  AND property_address !~* ' mine';
Drop the old tables (to save space - currenty 253GB free)

```sql
DROP TABLE uk_companies;

```sql
DROP TABLE overseas_companies;
(239 GB free)
CREATE EXTENSION IF NOT EXISTS pg_trgm; (fast substring and case-insensitive matches)
-- 1. Title number (fast joins with NPS polygons)
CREATE INDEX idx_ccod_ocod_title_number
    ON ccod_ocod_2025_09 (title_number);
-- 2. Proprietorship category (fast filter/group queries)
CREATE INDEX idx_ccod_ocod_proprietorship_category_1
    ON ccod_ocod_2025_09 (proprietorship_category_1);
-- 3. Overseas flag (tiny column, still good for filtering)
CREATE INDEX idx_ccod_ocod_overseas
    ON ccod_ocod_2025_09 (overseas);
-- 4. Property address (case-insensitive search, text matching)
CREATE INDEX idx_ccod_ocod_property_address
    ON ccod_ocod_2025_09 USING gin (property_address gin_trgm_ops);
clean up
```sql
VACUUM ANALYZE ccod_ocod_2025_09;
(239GB free)
CREATE INDEX idx_nsd_title_no
    ON nsd_full_2025_09 (title_no);
CREATE INDEX idx_nsd_geom
    ON nsd_full_2025_09
    USING gist (geom);
Now I want to add the polygon form NSD to ccod_ocod_2025_09 where the title numbers match
-- 1. Add a geometry column
ALTER TABLE ccod_ocod_2025_09
ADD COLUMN geom geometry(MultiPolygon, 27700);
-- 2. Populate it from NSD

```sql
UPDATE ccod_ocod_2025_09 c
SET geom = n.geom
FROM nsd_full_2025_09 n
WHERE c.title_number = n.title_no;

### This takes maybe an hour
(memory )
Download a shapefile of England's boundary (BGC = generalised to 20m) from https://geoportal.statistics.gov.uk/datasets/0139831c7166457ab1f7b3ab1f919cba_0/explore?filters=eyJDVFJZMjROTSI6WyJFbmdsYW5kIl19&location=51.288045%2C-0.559214%2C7.53
Unzip and save to raw_data renamed as england_boundary.shp
```bash
Save to a table
shp2pgsql -I -s 27700 Countries_December_2024_Boundaries_UK_BGC_4519888760047378310/CTRY_DEC_2024_UK_BGC.shp
```bash england_boundary | psql -d landstats 
Remove records from the new companies table that fall outside England

```sql
DELETE FROM ccod_ocod_2025_09 c
USING england_boundary e
WHERE NOT ST_Intersects(c.geom, e.geom);
(removes 196221 records)
Clean up (takes a couple of minutes)
```sql
VACUUM ANALYZE ccod_ocod_2025_09;
(memory is 257GB free )
Check in QGIS (new connection - Name: landstats, Database: landstats, no authentication)
Looking good, but some coastal water areas are included. Leave for now.
Create a shapefile that is all land not covered by NSD
Index first
CREATE INDEX IF NOT EXISTS idx_nsd_geom
    ON nsd_full_2025_09
    USING gist (geom);
then do the work - this should be an efficient way of doing it without tiling

```sql
DROP TABLE IF EXISTS england_uncovered;

```sql
CREATE TABLE england_uncovered AS

```sql
SELECT 
    ST_Multi(ST_Difference(e.geom, nsd_union.geom)) AS geom
FROM england_boundary e
CROSS JOIN (
    
```sql
SELECT ST_UnaryUnion(geom) AS geom
    FROM nsd_full_2025_09
) nsd_union;
(free space dropped to 208GB then rose to 254GB)
(started 12:52. finished (failed) at 14:14)
Break the new geom object into smaller parts for further processing

```sql
DROP TABLE IF EXISTS england_uncovered_dumped;

```sql
CREATE TABLE england_uncovered_dumped AS

```sql
SELECT (ST_Dump(geom)).geom AS geom
FROM england_uncovered;
After fail: Make all geometries valid
-- Fix NSD polygons
ALTER TABLE nsd_full_2025_09
ALTER COLUMN geom TYPE geometry(MultiPolygon, 27700)
USING ST_Multi(
        ST_CollectionExtract(ST_MakeValid(geom), 3)
      );
-- Fix England boundary
ALTER TABLE england_boundary
ALTER COLUMN geom TYPE geometry(MultiPolygon, 27700)
USING ST_Multi(
        ST_CollectionExtract(ST_MakeValid(geom), 3)
      );
(started 14:19, completed 14:50)
(memory dropped to 236 then returned to 255)
Generate a grid of tiles over England

```sql
DROP TABLE IF EXISTS england_tiles;
WITH bounds AS (
    
```sql
SELECT ST_Extent(geom) AS geom_extent
    FROM england_boundary
),
xy AS (
    
```sql
SELECT 
        FLOOR(ST_XMin(geom_extent))::integer AS xmin,
        FLOOR(ST_YMin(geom_extent))::integer AS ymin,
        CEIL(ST_XMax(geom_extent))::integer AS xmax,
        CEIL(ST_YMax(geom_extent))::integer AS ymax
    FROM bounds
),
grid AS (
    
```sql
SELECT 
        ST_MakeEnvelope(x, y, x + 10000, y + 10000, 27700) AS tile
    FROM xy,
         generate_series(xmin, xmax, 10000) AS x,
         generate_series(ymin, ymax, 10000) AS y
)

```sql
SELECT row_number() OVER () AS tile_id,
       tile
INTO england_tiles
FROM grid
WHERE ST_Intersects(tile, (
```sql
SELECT ST_Union(geom) FROM england_boundary));

Create england_uncovered tiles

```sql
CREATE TABLE england_uncovered_tiled AS

```sql
SELECT 
    t.tile_id,
    ST_Multi(ST_Difference(t.tile, nsd_union.geom)) AS geom
FROM england_tiles t
CROSS JOIN (
    
```sql
SELECT ST_UnaryUnion(geom) AS geom
    FROM nsd_full_2025_09
) nsd_union;

```sql
CREATE TABLE england_uncovered_dumped AS

```sql
SELECT tile_id, (ST_Dump(geom)).geom AS geom
FROM england_uncovered_tiled;
(start 14:59 end:)
(memory dropped from 253(ish) to 5)
create unregistered land geometry in tiles, using process_tile_tile.sql and run_tiles_tiles.sh
deflate the re-inflate to remove roads

```sql
DROP TABLE IF EXISTS england_uncovered_polygons_clean25;

```sql
CREATE TABLE england_uncovered_polygons_clean25 AS

```sql
SELECT 
    tile_id,
    ST_Multi(
      ST_Buffer(
        ST_Buffer(geom, -25), 
        25
      )
    )::geometry(MultiPolygon, 27700) AS geom
FROM england_uncovered_polygons_raw
WHERE geom IS NOT NULL;
calculate difference between unregistered with roads and without roads

```sql
SELECT 
    (
```sql
SELECT SUM(ST_Area(geom)) / 1000000.0 
     FROM england_uncovered_polygons_raw)      AS raw_area_km2,
    (
```sql
SELECT SUM(ST_Area(geom)) / 1000000.0 
     FROM england_uncovered_polygons_clean25) AS clean25_area_km2,
    ((
```sql
SELECT SUM(ST_Area(geom)) 
      FROM england_uncovered_polygons_raw) -
     (
```sql
SELECT SUM(ST_Area(geom)) 
      FROM england_uncovered_polygons_clean25)) / 1000000.0
     AS reduction_km2,
    100.0 * (
        (
```sql
SELECT SUM(ST_Area(geom)) 
         FROM england_uncovered_polygons_raw) -
        (
```sql
SELECT SUM(ST_Area(geom)) 
         FROM england_uncovered_polygons_clean25)
    ) / NULLIF((
```sql
SELECT SUM(ST_Area(geom)) 
                FROM england_uncovered_polygons_raw), 0) 
    AS percent_reduction
;
   raw_area_km2    | clean25_area_km2  |   reduction_km2    | percent_reduction 
-------------------+-------------------+--------------------+-------------------
 9736.938418491518 | 6417.366999736615 | 3319.5714187548897 | 34.09255842114261
 Start to add categories and sub-categories to ccod_ocod_2025_09
-- 1. Add the new column (varchar(12) = up to 12 characters)
ALTER TABLE ccod_ocod_2025_09
ADD COLUMN cat VARCHAR(12)
CREATE INDEX idx_ccod_ocod_2025_09_cat
ON ccod_ocod_2025_09 (cat)
-- 1. Add the new column (varchar(12) = up to 12 characters)
ALTER TABLE ccod_ocod_2025_09
ADD COLUMN subcat VARCHAR(12)
 CREATE INDEX idx_ccod_ocod_2025_09_subcat
ON ccod_ocod_2025_09 (subcat)
 
```sql
UPDATE ccod_ocod_2025_09
SET cat = 'church',
    subcat = 'commissioner'
WHERE proprietor_name_1 ILIKE '%church commissioner%'
  AND property_address NOT ILIKE '% mine%'

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'church',
    subcat = 'diocese'
where (
proprietor_name_1 ilike '%dioc%')
and proprietor_name_1 not ilike '%church commissioner%'
and property_address not ilike '% mine%'

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'church',
    subcat = 'other'
where (
proprietor_name_1 ilike '%salvation army%'
or proprietor_name_1 ilike '%mormon%'
or proprietor_name_1 ilike '%quaker%'
or proprietor_name_1 ilike '%gospel%'
or proprietor_name_1 ilike '%mosque%'
or proprietor_name_1 ilike '%islam%'
or proprietor_name_1 ilike '%judai%'
or proprietor_name_1 ilike '%synag%'
or proprietor_name_1 ilike '%hebrew%'
or proprietor_name_1 ilike '%catholic%'
or proprietor_name_1 ilike '%apastolic%'
or proprietor_name_1 ilike '%methodist%'
or proprietor_name_1 ilike '%order of%'
or proprietor_name_1 ilike '%sikh%'
or proprietor_name_1 ilike '%bhuddist%'
or proprietor_name_1 ilike '%baptist%'
or proprietor_name_1 ilike '%quaker%'
or proprietor_name_1 ilike '%cathedral of %'
or proprietor_name_1 ilike '%cathedral church %'
or proprietor_name_1 ilike '% chapel of %'
or proprietor_name_1 ilike '% church of %'
or proprietor_name_1 ilike '% St %''s church%')
and property_address not ilike '% mine%'
and proprietor_name_1 not ilike '%THE PRESIDENT AND SCHOLARS OF%'
and proprietor_name_1 not ilike '%MERCHANT TAYLORS%'
and proprietor_name_1 not ilike '%dioc%'
and proprietor_name_1 not ilike '%church commissioner%'

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'LA',
    subcat = 'mayor'
where proprietor_name_1 ilike '%mayor%'

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'LA',
    subcat = 'county'
WHERE proprietorship_category_1 LIKE 'County Council'

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'LA',
    subcat = 'district'
WHERE proprietorship_category_1 LIKE 'Local Authority'

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'LA',
    subcat = 'parish_town'
WHERE (proprietor_name_1 ILIKE '%Parish Council%'
OR proprietor_name_1 ILIKE '%Town Council%') and cat is NULL
WITH to_update AS (
  SELECT
    ctid AS rowid,
    CASE
      WHEN proprietor_name_1 ILIKE '%DEFENCE%' OR proprietor_name_1 ILIKE '%ROYAL NAVY%' OR proprietor_name_1 ILIKE '%AIR FORCE%' OR proprietor_name_1 ILIKE '%ROYAL AIR%' THEN 'defence'
      WHEN proprietor_name_1 ILIKE '%TRANSPORT%' OR proprietor_name_1 ILIKE '%DEPARTMENT FOR TRANSPORT%' OR proprietor_name_1 ILIKE '%DEPARTMENT OF TRANSPORT%' THEN 'transport'
      WHEN proprietor_name_1 ILIKE '%ENVIRONMENT%' OR proprietor_name_1 ILIKE '%DEFRA%' OR proprietor_name_1 ILIKE '%RURAL AFFAIRS%' OR proprietor_name_1 ILIKE '%FISHERIES%' THEN 'environment'
      WHEN proprietor_name_1 ILIKE '%JUSTICE%' OR proprietor_name_1 ILIKE '%NATIONAL OFFENDER%' OR proprietor_name_1 ILIKE '%PRISON%' THEN 'justice'
      WHEN proprietor_name_1 ILIKE '%HEALTH%' OR proprietor_name_1 ILIKE '%SOCIAL CARE%' OR proprietor_name_1 ILIKE '%NHS%' THEN 'health'
      WHEN proprietor_name_1 ILIKE '%EDUCATION%' OR proprietor_name_1 ILIKE '%SCHOOL%' THEN 'education'
      WHEN proprietor_name_1 ILIKE '%HOUSING%' OR proprietor_name_1 ILIKE '%COMMUNITIES%' OR proprietor_name_1 ILIKE '%LEVELLING UP%' OR proprietor_name_1 ILIKE '%HOMES ENGLAND%' THEN 'housing'
      WHEN proprietor_name_1 ILIKE '%CULTURE%' OR proprietor_name_1 ILIKE '%MEDIA%' OR proprietor_name_1 ILIKE '%SPORT%' OR proprietor_name_1 ILIKE '%HERITAGE%' OR proprietor_name_1 ILIKE '%MUSEUM%' THEN 'culture'
      WHEN proprietor_name_1 ILIKE '%HOME DEPARTMENT%' OR proprietor_name_1 ILIKE '%HOME SECRETARY%' OR proprietor_name_1 ILIKE '%HOME DEPT%' THEN 'home_office'
      WHEN proprietor_name_1 ILIKE '%INDUSTRY%' OR proprietor_name_1 ILIKE '%TRADE%' THEN 'business'
      ELSE 'other'
    END AS new_subcat
  FROM ccod_ocod_2025_09
  WHERE proprietor_name_1 IS NOT NULL
    AND (
      proprietor_name_1 ILIKE '%SECRETARY OF STATE%'
      OR proprietor_name_1 ILIKE 'DEPARTMENT %'
      OR proprietor_name_1 ILIKE 'DEPARTMENT FOR %'
      OR proprietor_name_1 ILIKE 'HOMES ENGLAND%'
      OR proprietor_name_1 ILIKE '%COMMUNITIES AGENCY%'
    )
)

```sql
UPDATE ccod_ocod_2025_09 t
SET cat = 'gov',
    subcat = u.new_subcat
FROM to_update u
WHERE t.ctid = u.rowid

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'hsng_assc',
    subcat = 'general'
WHERE proprietor_name_1  ILIKE '%Housing association%';

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'charity',
    subcat = 'trust'
WHERE proprietor_name_1 ILIKE '% trust%'
and proprietor_name_1 not like 'THE PUBLIC TRUSTEE'
and proprietor_name_1 not ilike '%NATIONAL TRUST FOR%'
and proprietorship_category_1 like 'Corporate Body'

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'infra'
WHERE geom IS NOT NULL
  AND (
    proprietor_name_1 ILIKE '% water %'
    OR proprietor_name_1 ILIKE '% utilit%'
    OR proprietor_name_1 ILIKE '% power %'
    OR proprietor_name_1 ILIKE '% electricity %'
    OR proprietor_name_1 ILIKE '% energy%'
    OR proprietor_name_1 ILIKE '% gas %'
    OR proprietor_name_1 ILIKE '%national grid%'
    OR proprietor_name_1 ILIKE '% transmission %'
    OR proprietor_name_1 ILIKE '% generation %'
    OR proprietor_name_1 ILIKE '% nuclear %'
    OR proprietor_name_1 ILIKE '% rail %'
    OR proprietor_name_1 ILIKE '% railway %'
    OR proprietor_name_1 ILIKE '% railways %'
    OR proprietor_name_1 ILIKE '% highways %'
    OR proprietor_name_1 ILIKE '% port %'
    OR proprietor_name_1 ILIKE '% ports %'
    OR proprietor_name_1 ILIKE '% ports'
    OR proprietor_name_1 ILIKE '%ABP%'
    OR proprietor_name_1 ILIKE '%DP WORLD%'
    OR proprietor_name_1 ILIKE '%Shell UK%'
    OR proprietor_name_1 ILIKE '%EDF %'
    OR proprietor_name_1 ILIKE '% OVO%'
    OR proprietor_name_1 ILIKE '%E.ON%'
    OR proprietor_name_1 ILIKE '% Cracknore%'
    OR proprietor_name_1 ILIKE '% Kilbride%'
  )
  AND proprietor_name_1 NOT ILIKE '% sport%'
  AND proprietor_name_1 NOT ILIKE '%water ski%'
  AND proprietor_name_1 NOT ILIKE '%water park%'
  AND proprietor_name_1 NOT ILIKE '%ROYCE%'
  AND proprietor_name_1 NOT ILIKE '%burners%'
  AND proprietor_name_1 NOT ILIKE '% trust%'
  AND proprietor_name_1 NOT ILIKE '% preservation %'
  AND proprietor_name_1 NOT ILIKE '% pension%'
  AND proprietor_name_1 NOT ILIKE '% meadow%'
  AND proprietor_name_1 NOT ILIKE '% wheel %'
  AND proprietor_name_1 NOT ILIKE '% aquatic%'
  AND proprietor_name_1 NOT ILIKE '% recreation%'
  AND proprietor_name_1 NOT ILIKE '% water mill%'
  AND proprietor_name_1 NOT ILIKE '%mineral water%'
  AND proprietor_name_1 NOT ILIKE '%water garden%'
  AND proprietor_name_1 NOT ILIKE '%water house%'
  AND proprietor_name_1 NOT ILIKE '%water filter%'
  AND cat IS NULL;
CREATE VIEW infra_view AS

```sql
SELECT *
FROM ccod_ocod_2025_09
WHERE cat = 'infra';

```sql
DELETE FROM ccod_ocod_2025_09
WHERE ctid IN (
    
```sql
SELECT ctid
    FROM (
        
```sql
SELECT ctid,
               ROW_NUMBER() OVER (
                   PARTITION BY title_number
                   ORDER BY title_number
               ) AS rn
        FROM ccod_ocod_2025_09
    ) sub
    WHERE rn > 1
);
NACRO is a big charity CIVITAS might be too
SOVEREIGN NETWORK GROUP rents homes

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'farm'
WHERE geom IS NOT NULL
  AND (
    proprietor_name_1 ILIKE '% farm%')
   and cat is null
   
```sql
UPDATE ccod_ocod_2025_09
SET cat = 'company',
    subcat = 'holding_co'
WHERE proprietor_name_1 ILIKE '%holding%'
and cat is null
SET cat = 'company',
    subcat = 'supermarket'
WHERE proprietor_name_1 ILIKE '%asda%'
or  proprietor_name_1 ILIKE '%associated dairies%'
or  proprietor_name_1 ILIKE '%sainsbury%'
or  proprietor_name_1 ILIKE '%lidl%'
or  proprietor_name_1 ILIKE '%waitrose%'
or  proprietor_name_1 ILIKE '%aldi%'
or  proprietor_name_1 ILIKE '%tesco%'
and cat is null

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'education',
    subcat = 'school'
WHERE proprietor_name_1 ILIKE '%school%'
or  proprietor_name_1 ILIKE '%college%'
or  proprietor_name_1 ILIKE '%NACRO%'
and  proprietor_name_1 not ILIKE '%university%'
and cat is null

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'housing',
    subcat = 'development'
WHERE proprietor_name_1 ILIKE '%housing%'
or  proprietor_name_1 ILIKE '%communities%'
or  proprietor_name_1 ILIKE '%homes%'
or  proprietor_name_1 ILIKE '%construction%'
or  proprietor_name_1 ILIKE '%homes%'
or  proprietor_name_1 ILIKE '% land %'
or  proprietor_name_1 ILIKE '%sovereign network%'
and cat is null
   
```sql
UPDATE ccod_ocod_2025_09
SET cat = 'company',
    subcat = 'investment'
WHERE proprietor_name_1 ILIKE '%investment%'
OR proprietor_name_1 ILIKE '%properties%'
OR proprietor_name_1 ILIKE '%property%'
OR proprietor_name_1 ILIKE '%assurance%'
OR proprietor_name_1 ILIKE '%mutual%'
OR proprietor_name_1 ILIKE '%pension%'
and cat is null
   
```sql
UPDATE ccod_ocod_2025_09
SET cat = 'company',
    subcat = 'trustee'
WHERE proprietor_name_1 ILIKE '%trustee%'
and cat is null
   
```sql
UPDATE ccod_ocod_2025_09
SET cat = 'gov',
    subcat = 'NHS'
WHERE proprietor_name_1 ILIKE '%NHS%'
OR proprietor_name_1 ILIKE '%National health service%'
and cat is null


```sql
SELECT proprietor_name_1, proprietorship_category_1, cat, subcat, COUNT(*) AS cnt, ROUND(SUM(ST_Area(geom))/10000)  AS Ha
FROM ccod_ocod_2025_09
where cat is null and geom is not null
group by proprietor_name_1 , proprietorship_category_1, cat, subcat
order by Ha  desc

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'gov',
    subcat = 'env_agnc'
WHERE proprietor_name_1 ILIKE '%environment agency%'
and cat is null

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'gov',
    subcat = 'nat_pk'
WHERE proprietor_name_1 ILIKE '%national park%'
and cat is null

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'gov',
    subcat = 'nat_eng'
WHERE proprietor_name_1 ILIKE '%natural england%'
and cat is null

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'company',
    subcat = 'estate'
WHERE proprietor_name_1 ILIKE '%estate%'
and cat is null

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'education',
    subcat = 'university'
WHERE proprietor_name_1 ILIKE '%university%'

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'company',
    subcat = 'estate'
WHERE proprietor_name_1 ILIKE '%nominee%'

```sql
SELECT proprietor_name_1, COUNT(*) AS cnt, ROUND(SUM(ST_Area(geom))/10000)  AS Ha
FROM ccod_ocod_2025_09
where subcat = 'estate'
group by proprietor_name_1
order by Ha desc;
// ESTATES LOOKING GOOD!

```sql
SELECT cat, subcat,  COUNT(*) AS cnt, ROUND(SUM(ST_Area(geom))/10000)  AS Ha
FROM ccod_ocod_2025_09
group by cat, subcat
order by Ha desc;
change supermarket to retail. Add macdonalds

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = m.cat,
    subcat = m.subcat
FROM (
    VALUES
        ('MRH MINERALS LIMITED','company','extraction'),
        ('HANSON QUARRY PRODUCTS EUROPE LIMITED','company','extraction'),
        ('DALEMAIN LLP','company','estate'),
        ('CORLANDS MINERALS LIMITED','company','extraction'),
        ('ASHWICKEN SPORTING LLP','recreation','sport'),
        ('CEMEX UK OPERATIONS LIMITED','company','extraction'),
        ('THE OFFICIAL CUSTODIAN FOR CHARITIES','charity','other'),
        ('TAYLOR WIMPEY UK LIMITED','housing','development'),
        ('THE CROUCH HARBOUR AUTHORITY','infra',NULL),
        ('TATA STEEL UK LIMITED','company','industrial'),
        ('MILLS & REEVE TRUST CORPORATION LIMITED','company','investment'),
        ('TARMAC TRADING LIMITED','company','extraction'),
        ('PORT OF LONDON AUTHORITY','infra',NULL),
        ('F&K','company','investment'),
        ('STRUTT & PARKER (FARMS) LIMITED','farm',NULL),
        ('THE KENNEL CLUB LIMITED','charity','other'),
        ('BDW TRADING LIMITED','housing','development'),
        ('WESTCOUNTRY MINERALS LIMITED','company','extraction'),
        ('FARMLAND RESERVE UK LIMITED','farm',NULL),
        ('WOMBLE BOND DICKINSON (TRUST CORPORATION) LIMITED','company','investment'),
        ('SAVILLS TRUST COMPANY LIMITED','company','investment'),
        ('T J MORRIS GROUP LIMITED','company','supermarket'),
        ('IMERYS MINERALS LIMITED','company','extraction'),
        ('MORION 1 LIMITED','company','estate'),
        ('PARKERS OF LEICESTER LIMITED','housing','development'),
        ('PORT OF SHEERNESS LIMITED','infra',NULL),
        ('TARMAC AGGREGATES LIMITED','company','extraction'),
        ('WME 2023 LIMITED','housing','development'),
        ('ALBANWISE LIMITED','farm',NULL),
        ('RAMSBURY S.A.R.L','company','estate'),
        ('SIR RICHARD SUTTON LIMITED','company','estate'),
        ('ALLENHEADS LIMITED','company','investment'),
        ('BRITISH GYPSUM LIMITED','company','extraction'),
        ('THE DICKINSON TRUST LIMITED','charity','other'),
        ('BLACK COMBE PARK LIMITED','company','investment'),
        ('SIBELCO UK LIMITED','company','extraction'),
        ('MAWLEY HALL LLP','company','estate'),
        ('BURGHLEY HOUSE PRESERVATION TRUST LIMITED','company','estate'),
        ('THE COWDRAY TRUST LIMITED','company','estate'),
        ('DALE LIMITED','company','investment'),
        ('RAMSBURY S.A.R.L.','company','estate'),
        ('SC BEDFORD LIMITED','company','estate'),
        ('PRIMSHIRE LIMITED','company','investment'),
        ('O&H Q7 LIMITED','housing','development'),
        ('HAYES GRANGE LLP','company','investment'),
        ('STRUTT AND PARKER (FARMS) LIMITED','farm',NULL),
        ('THE CHAMBERLAINS COMMON COUNCIL AND FREEMEN OF THE BOROUGH OF ALNWICK','LA','parish_town'),
        ('ELBA SECURITIES LIMITED','company','investment'),
        ('INOVYN ENTERPRISES LIMITED','company','investment'),
        ('BRYANSTON (RFE) LIMITED','company','investment'),
        ('WESTERNHOPE LIMITED','housing','development'),
        ('TAYBERRY LIMITED','company','supermarket'),
        ('ARMERIA (UK) LLP','company','estate'),
        ('THE PRIVATE FIDUCIARY CORPORATION','housing','development'),
        ('MEYLAU 1 LIMITED','farm',NULL),
        ('SIBELCO (UK) LIMITED','company','extraction'),
        ('FIRST CORPORATE SHIPPING LIMITED','infra',NULL),
        ('RAGLEY TRUST COMPANY LIMITED','company','estate'),
        ('STONEWOOD LIMITED','housing','development'),
        ('F & A GEORGE LIMITED','farm',NULL),
        ('FIM TIMBERLAND GENERAL PARTNER LIMITED','company','investment'),
        ('PROCTER (BORDLEY) LIMITED','company','investment'),
        ('PEEL (KNOWLMERE) COMPANY','company','investment'),
        ('NUCLEAR DECOMMISSIONING AUTHORITY','infra',NULL),
        ('THE MASTER WARDENS AND COMMONALTY OF MERCHANT VENTURERS OF THE CITY OF BRISTOL','infra',NULL),
        ('WINTERQUAY LIMITED','farm',NULL),
        ('GIANTFLOW LIMITED','company','extraction'),
        ('B BUSH & SONS LIMITED','farm',NULL),
        ('STANSTED AIRPORT LIMITED','infra',NULL),
        ('THE MANOR OF BOSHAM AND THE HUNDRED LIMITED','housing','development'),
        ('FARMCARE TRADING LIMITED','farm',NULL)
) AS m(proprietor_name_1, cat, subcat)
WHERE t.proprietor_name_1 = m.proprietor_name_1;


```sql
UPDATE ccod_ocod_2025_09
SET cat = 'farm'
WHERE proprietor_name_1 ILIKE '%farm%'
and cat is not null

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'farm'
WHERE proprietor_name_1 ILIKE '%farm%'
and cat is null
//invest, pension, 

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = m.cat,
    subcat = m.subcat
FROM (
    VALUES
        ('J H & F W GREEN LIMITED','farm',NULL),
        ('THE MASTER WARDENS AND COMMONALTY OF MERCHANT VENTURERS OF THE CITY OF BRISTOL','infra',NULL),
        ('THE MANCHESTER SHIP CANAL COMPANY LIMITED','infra',NULL),
        ('THE WARDENS AND ASSISTANTS OF ROCHESTER BRIDGE IN THE COUNTY OF KENT','company','estate'),
        ('THARROS LIMITED','farm',NULL),
        ('WILLERBY WOLD PIGGERIES LIMITED','farm',NULL),
        ('PEEL NRE LIMITED','infra',NULL),
        ('BADLESMERE LIMITED','company','extraction'),
        ('RATHBONES TRUST COMPANY LIMITED','company','estate'),
        ('BRITISH TELECOMMUNICATIONS PLC','infra',NULL),
        ('BEN SMITH & SONS (WANTAGE) LIMITED','farm',NULL),
        ('HAVEN LEISURE LIMITED','company','supermarket'),
        ('CAMAS UK LIMITED','company','extraction'),
        ('LETCHWORTH GARDEN CITY HERITAGE FOUNDATION','charity','trust'),
        ('HEATHROW AIRPORT LIMITED','infra',NULL),
        ('THE GUINNESS PARTNERSHIP LIMITED','housing','development'),
        ('SNSE LIMITED','housing','development'),
        ('SUFFOLK LIFE ANNUITIES LIMITED','company','investment'),
        ('HEART OF ENGLAND FOREST LIMITED','charity','other'),
        ('VERNAL AGRICULTURAL ENTERPRISES LIMITED','farm',NULL),
        ('EPE NO 1 LTD','company','investment'),
        ('THE TWO CHAPLAINS AND THIRTEEN POOR MEN OF EWELME IN THE COUNTY OF OXFORD','charity','trust'),
        ('VENN BRIDGE LLP','charity','trust'),
        ('TRANSPORT FOR LONDON','infra',NULL),
        ('ROBERT HITCHINS LIMITED','housing','development'),
        ('LEE VALLEY REGIONAL PARK AUTHORITY','gov','nat_pk'),
        ('ROSKEAR MINERALS LLP','company','extraction'),
        ('TILLSIDE LIMITED','company','investment'),
        ('JTT MANAGEMENT CO. NO.1 LTD','company','investment'),
        ('HARLASTON (PACKINGTON) LIMITED','farm',NULL),
        ('AMPLIUS LIVING','housing','development'),
        ('WINSORTAN LIMITED','farm',NULL),
        ('THE PROPANE COMPANY LIMITED','infra',NULL),
        ('TARMAC CEMENT AND LIME LIMITED','company','extraction'),
        ('REACHSWITCH LIMITED','farm',NULL),
        ('BRIAN J. DALE & COMPANY LIMITED','farm',NULL),
        ('PARK HOLIDAYS UK LIMITED','company','supermarket'),
        ('PEABODY TRUST','charity','trust'),
        ('ALEXANDRA SAW MILLS LIMITED','company','estate'),
        ('JELSON LIMITED','housing','development'),
        ('HET1 LIMITED','company','investment'),
        ('THE HEART OF ENGLAND FOREST','charity','other'),
        ('SHOBY PRIORY AGRICULTURAL LIMITED','farm',NULL),
        ('CLIPSHAM QUARRY COMPANY LIMITED','company','extraction'),
        ('FOXCOTE CORPORATION','farm',NULL),
        ('THE TITSEY FOUNDATION CIO','charity','trust'),
        ('RATHBONE TRUST COMPANY LIMITED','charity','trust'),
        ('NEWETT LIMITED','housing','development'),
        ('METALUBE LTD','company','industrial')
) AS m(proprietor_name_1, cat, subcat)
WHERE t.proprietor_name_1 = m.proprietor_name_1;
//now there are a few bad mixes such as farm + industrial that need to be addressed
update ccod_ocod_2025_09 set subcat = null where cat='farm'

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = 'gov',
    subcat = 'environment'
    where t.proprietor_name_1 like '%MINISTER OF AGRICULTUR%'
    
```sql
UPDATE ccod_ocod_2025_09
SET cat = 'infra'
WHERE geom IS NOT NULL
  AND (
    proprietor_name_1 ILIKE '%port %'
  )
  AND proprietor_name_1 NOT ILIKE '% sport%'
  AND proprietor_name_1 NOT ILIKE '%water ski%'
  AND proprietor_name_1 NOT ILIKE '%water park%'
  AND proprietor_name_1 NOT ILIKE '%ROYCE%'
  AND proprietor_name_1 NOT ILIKE '%burners%'
  AND proprietor_name_1 NOT ILIKE '% trust%'
  AND proprietor_name_1 NOT ILIKE '% preservation %'
  AND proprietor_name_1 NOT ILIKE '% pension%'
  AND proprietor_name_1 NOT ILIKE '% meadow%'
  AND proprietor_name_1 NOT ILIKE '% wheel %'
  AND proprietor_name_1 NOT ILIKE '% aquatic%'
  AND proprietor_name_1 NOT ILIKE '% recreation%'
  AND proprietor_name_1 NOT ILIKE '% water mill%'
  AND proprietor_name_1 NOT ILIKE '%mineral water%'
  AND proprietor_name_1 NOT ILIKE '%water garden%'
  AND proprietor_name_1 NOT ILIKE '%water house%'
  AND proprietor_name_1 NOT ILIKE '%water filter%'
  AND cat IS NULL;
  //this seems to work well for charitable trusts
  
```sql
SELECT proprietor_name_1, proprietorship_category_1, cat, subcat, COUNT(*) AS cnt, ROUND(SUM(ST_Area(geom))/10000)  AS Ha
FROM ccod_ocod_2025_09
where cat is null and geom is not null
and proprietor_name_1 ilike '% trust l%'
group by proprietor_name_1 , proprietorship_category_1, cat, subcat
order by Ha  desc
//so...
update ccod_ocod_2025_09
set cat = 'charity', subcat = 'trust'
where cat is null and geom is not null
and proprietor_name_1 ilike '% trust l%'
update ccod_ocod_2025_09
set cat = 'society', subcat = 'club'
where cat is null and geom is not null
and proprietor_name_1 ilike '% club%'
CREATE VIEW society AS

```sql
SELECT *
FROM ccod_ocod_2025_09
WHERE cat = 'society';

```sql
SELECT proprietor_name_1, proprietorship_category_1, cat, subcat, COUNT(*) AS cnt, ROUND(SUM(ST_Area(geom))/10000)  AS Ha
FROM ccod_ocod_2025_09
where cat is null and geom is not null and proprietorship_category_1 = 'Corporate Body'
group by proprietor_name_1 , proprietorship_category_1, cat, subcat
order by Ha  desc;

```sql
UPDATE ccod_ocod_2025_09 SET cat='charity', subcat='maybe'
where cat is null and geom is not null and proprietorship_category_1 = 'Corporate Body'

```sql
SELECT proprietor_name_1, proprietorship_category_1, cat, subcat, COUNT(*) AS cnt, ROUND(SUM(ST_Area(geom))/10000)  AS Ha
FROM ccod_ocod_2025_09
where cat is null and geom is not null
group by proprietor_name_1 , proprietorship_category_1, cat, subcat
order by Ha  desc;

```sql
UPDATE ccod_ocod_2025_09 SET cat='company', subcat='investment'
where cat is null and geom is not null and proprietor_name_1 ilike '%trust company%' or proprietor_name_1 ilike '%trust corporation%'

```sql
UPDATE ccod_ocod_2025_09 SET cat='company', subcat='industry'
where cat is null and geom is not null and proprietor_name_1 ilike '%waste%' or proprietor_name_1 ilike '%steel%'

```sql
SELECT cat, subcat, COUNT(*) AS cnt, ROUND(SUM(ST_Area(geom))/10000)  AS Ha
FROM ccod_ocod_2025_09
group by cat, subcat
order by Ha  desc;
update ccod_ocod_2025_09
set cat='club', subcat='golf'
where proprietor_name_1 ilike '%golf%'
update ccod_ocod_2025_09
set cat='club'
where cat = 'society'
update ccod_ocod_2025_09
set cat='company', subcat='farm'
where cat = 'farm'
update ccod_ocod_2025_09
set subcat='ownership_co'
where subcat = 'trustee' or subcat = 'holding_co';
update ccod_ocod_2025_09
set cat = 'company', subcat = 'housing' where subcat='development';
update ccod_ocod_2025_09
set cat = 'all' where cat='infra';
update ccod_ocod_2025_09
set cat = 'business' where cat='company';
WITH words AS (
    
```sql
SELECT lower(
               regexp_replace(
                   unnest(regexp_split_to_array(proprietor_name_1, '\s+')),
                   '[^a-zA-Z0-9]+',  -- remove everything except letters/numbers
                   '',
                   'g'
               )
           ) AS word
    FROM ccod_ocod_2025_09
    WHERE cat is null
)

```sql
SELECT word, COUNT(*) AS freq
FROM words
WHERE word <> ''  -- skip empty strings
GROUP BY word
ORDER BY freq DESC
LIMIT 50;
limited
ltd
    management
company
group
plc
the
road
    fairhold
services
uk
and
court
    huddersfield
    tapestart
home
hill
west
house
north
j
midland
    freehold
living
heart
riverside
    residents
sons
northern
    bank
co
notting
park
    places
genesis
a
capital
london
    electricity
llp
for
2
    residential
    hh
people
    association
securities
yorkshire
    bpha
    builders
    update ccod_ocod_2025_09
set cat = 'business', subcat='housing' where proprietor_name_1 ilike '%tapestart%' or proprietor_name_1 ilike '%fairhold%' or proprietor_name_1 ilike '%resident%' or proprietor_name_1 ilike '%bpha%'
update ccod_ocod_2025_09
set cat = 'business', subcat='builder' where proprietor_name_1 ilike '%builder%'
and cat is null
update ccod_ocod_2025_09
set cat = 'business', subcat='housing' where proprietor_name_1 ilike '%living%'
and cat is null
update ccod_ocod_2025_09
set cat = 'infra', subcat='all' where proprietor_name_1 ilike '%electricity%'
and cat is null
update ccod_ocod_2025_09
set cat = 'infra', subcat='all' where proprietor_name_1 ilike '%powergrid%'
and cat is null
update ccod_ocod_2025_09
set cat = 'business', subcat='investment' where proprietor_name_1 ilike '%asset%' or proprietor_name_1 ilike '%securities%' or proprietor_name_1 ilike '%rents%'
and cat is null;
update ccod_ocod_2025_09
set cat = 'business', subcat='investment' where proprietor_name_1 ilike '%bank%'
and cat is null;
update ccod_ocod_2025_09
set cat = 'business', subcat='housing' where proprietor_name_1 ilike '%abri%' or  proprietor_name_1 ilike '%greensquareaccord%' or  proprietor_name_1 ilike '%lettings%'
and cat is null;
update ccod_ocod_2025_09
set cat = 'infra', subcat='all' where proprietor_name_1 ilike '%manweb%' or  proprietor_name_1 ilike '%electric %'
and cat is null;
update ccod_ocod_2025_09
set cat = 'business', subcat='housing' where proprietor_name_1 ilike '%propco%'
and cat is null;
update ccod_ocod_2025_09
set cat = 'business', subcat='housing' where proprietor_name_1 ilike '%care%'
and cat is null;
update ccod_ocod_2025_09
set cat = 'business', subcat='ownership_co' where overseas = 1;

```sql
SELECT proprietor_name_1, COUNT(*) AS cnt, ROUND(SUM(ST_Area(geom))/10000)  AS Ha
FROM ccod_ocod_2025_09
where cat='business' and subcat='other'
group by proprietor_name_1
order by Ha  desc;

```sql
SELECT proprietor_name_1, COUNT(*) AS cnt, ROUND(SUM(ST_Area(geom))/10000)  AS Ha
FROM ccod_ocod_2025_09
where cat='business' and subcat='other'
group by proprietor_name_1
order by cnt desc;
"proprietor_name_1"
MIDLAND HEART LIMITED
THE RIVERSIDE GROUP LIMITED
NOTTING HILL GENESIS
HOME GROUP LIMITED
//all housing associations
update ccod_ocod_2025_09
set cat = 'business', subcat='housing' where proprietor_name_1 in ('MIDLAND HEART LIMITED',
'THE RIVERSIDE GROUP LIMITED',
'NOTTING HILL GENESIS',
'HOME GROUP LIMITED')
update ccod_ocod_2025_09
set cat = 'infra', subcat='all' where proprietor_name_1 in ('SSE SERVICES PLC',
'LONDON UNDERGROUND LIMITED')

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'business',
    subcat = 'retail'
WHERE proprietor_name_1 ILIKE '%PUB%'
   OR proprietor_name_1 ILIKE '%TAVERN%'
   OR proprietor_name_1 ILIKE '%INN%'
   OR proprietor_name_1 ILIKE '%BREWERY%'
   OR proprietor_name_1 ILIKE '%GREENE KING%'
   OR proprietor_name_1 ILIKE '%MITCHELLS & BUTLERS%'
   OR proprietor_name_1 ILIKE '%PUNCH PARTNERSHIPS%'
   OR proprietor_name_1 ILIKE '%WEATHERSPOON%';

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = 'business',
    subcat = 'housing'
FROM (
    VALUES
        ('ORBIT GROUP LIMITED'),
        ('TORUS62 LIMITED'),
        ('ACIS GROUP LIMITED'),
        ('ANCHOR HANOVER GROUP'),
        ('BERNICIA GROUP'),
        ('REGENDA LIMITED'),
        ('A2DOMINION SOUTH LIMITED'),
        ('CURO PLACES LIMITED'),
        ('BOLTON AT HOME LIMITED'),
        ('THE GUINNESS PARTNERSHIP LIMITED'),
        ('SNSE LIMITED'),
        ('ROBERT HITCHINS LIMITED'),
        ('AMPLIUS LIVING'),
        ('JELSON LIMITED'),
        ('NEWETT LIMITED')
) AS housing(proprietor_name_1)
WHERE t.proprietor_name_1 = housing.proprietor_name_1;

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = 'business',
    subcat = 'single_prop'
WHERE proprietor_name_1 IN (
    
```sql
SELECT proprietor_name_1
    FROM ccod_ocod_2025_09
    GROUP BY proprietor_name_1
    HAVING COUNT(*) = 1
)
and cat='business' and subcat='other';

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = 'business',
    subcat = 'smll_prtflio'
WHERE proprietor_name_1 IN (
    
```sql
SELECT proprietor_name_1
    FROM ccod_ocod_2025_09
    GROUP BY proprietor_name_1
    HAVING COUNT(*) < 11
)
and cat='business' and subcat='other';
update ccod_ocod_2025_09
set cat = 'business', subcat='housing' where proprietor_name_1 ilike '%hh%'

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = m.cat,
    subcat = m.subcat
FROM (
    VALUES
        ('HAWKES LIMITED','business','estate'),
        ('HOLMEDALE VALLEY LIMITED','business','estate'),
        ('WILDERNESS RESERVE SUFFOLK LIMITED','business','estate'),
        ('COKENACH LIMITED','business','estate'),
        ('ELLERGREEN GROUP LLP','business','estate'),
        ('CHARLTON ABBOTTS LIMITED LIABILITY PARTNERSHIP','business','estate'),
        ('ANTAS LIMITED','business','estate'),
        ('FORTERRA BUILDING PRODUCTS LIMITED','business','builder'),
        ('VEOLIA ES LANDFILL LIMITED','business','extraction'),
        ('NEATHAM LIMITED','business','estate'),
        ('THE DORSET TRUST FOR NATURE CONSERVATION LIMITED','charity','trust'),
        ('AMOS NELSON LIMITED','business','estate'),
        ('MAURICE MASON LIMITED','business','farm'),
        ('BITHIA LIMITED','business','estate'),
        ('G H DEAN & CO LIMITED','business','farm'),
        ('S. J. PHILLIPS & SONS (KEMBLE) LIMITED','business','farm'),
        ('CASTLE CEMENT LIMITED','business','extraction'),
        ('BREEDON CEMENT LIMITED','business','extraction'),
        ('PETER STRAWSON LIMITED','business','farm'),
        ('BREEDON SOUTHERN LIMITED','business','extraction'),
        ('FELDON HERBS LTD','business','farm'),
        ('CREST NICHOLSON OPERATIONS LIMITED','business','housing'),
        ('P.J. LEE & SONS LIMITED','business','farm'),
        ('FREDERICK HIAM LIMITED','business','farm'),
        ('SUMMERLEAZE LIMITED','business','estate'),
        ('PENNTRUST LIMITED','business','investment'),
        ('J WHARTON (SHIPPING) LIMITED','business','other'),
        ('C & S TAYLOR LLP','business','farm'),
        ('JOHN GRANT (DONINGTON)','business','farm'),
        ('GEORGE TANNER (SHALFORD) LIMITED','business','builder'),
        ('THE MANYDOWN COMPANY LIMITED','business','estate'),
        ('GENTOO GROUP LIMITED','business','housing'),
        ('YAREAL HUMBY LIMITED','business','estate'),
        ('PADFIELD (HAYLEYS) LIMITED','business','farm'),
        ('M R TIZZARD LIMITED','business','farm'),
        ('LONGCLIFFE QUARRIES LIMITED','business','extraction'),
        ('RICHARD LONG GROUP LIMITED','business','estate'),
        ('A & E G HEADING LIMITED','business','farm'),
        ('JOHN A. WELLS LIMITED','business','farm'),
        ('D A PHILLIPS & CO LIMITED','business','farm'),
        ('H R BOURN & SONS (LINWOOD) LIMITED','business','farm'),
        ('CHARLES WHARTON LIMITED','business','estate'),
        ('JUST RETIREMENT LIMITED','business','investment'),
        ('RALPH POCKLINGTON LIMITED','business','farm'),
        ('WIENERBERGER LIMITED','business','industry'),
        ('BROADTRENCH LIMITED','business','estate'),
        ('PEEL NRE ENVIRONMENTAL LIMITED','infra','all'),
        ('ARQIVA LIMITED','infra','all'),
        ('LITTLE MONGEHAM LIMITED','business','farm'),
        ('THE MERSEY DOCKS AND HARBOUR COMPANY LIMITED','infra','all'),
        ('ADRIAN MARSH LIMITED','business','farm'),
        ('JOSEPH E SWIERS LIMITED','business','farm'),
        ('BRITISH SUGAR PLC','business','industry'),
        ('GEORGE J GOFF LIMITED','business','farm'),
        ('PHOENIX LIFE LIMITED','business','investment'),
        ('R H LAMYMAN LIMITED','business','farm'),
        ('PATRICK DEAN LIMITED','business','farm'),
        ('LIGHTFOOTING LIMITED','business','estate'),
        ('A H WORTH AND COMPANY LIMITED','business','farm'),
        ('ARC AGGREGATES LIMITED','business','extraction'),
        ('WILLIAM DAVIS LIMITED','business','builder'),
        ('CALA MANAGEMENT LIMITED','business','builder'),
        ('BERNARD COX LIMITED','business','farm'),
        ('ALAN FIRMIN LIMITED','business','farm'),
        ('A W SMITH & SONS LIMITED','business','farm'),
        ('CATTLE (HOLDERNESS) LIMITED','business','farm'),
        ('ORWELL PARK LIMITED','business','estate'),
        ('GREENSANDS LIMITED','business','estate'),
        ('BAE SYSTEMS MARINE LIMITED','gov','defence'),
        ('JAMES STOCKDALE LIMITED','business','farm'),
        ('JOHN SAUL LIMITED','business','farm'),
        ('GLEESON REGENERATION LIMITED','business','housing'),
        ('HEATHPATCH LIMITED','business','estate'),
        ('ROWE AGRICULTURAL LIMITED','business','farm'),
        ('BOWMANS CROSS LTD','business','housing'),
        ('SCOTTISH & NEWCASTLE LIMITED','business','retail'),
        ('BREEDON AGGREGATES ENGLAND LIMITED','business','extraction')
) AS m(proprietor_name_1, cat, subcat)
WHERE t.proprietor_name_1 = m.proprietor_name_1;

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = m.cat,
    subcat = m.subcat
FROM (
    VALUES
        ('J WHARTON (SHIPPING) LIMITED','business','other'),
        ('FROYLE MILL LLP','business','estate'),
        ('A. & E. G. HEADING LIMITED','business','farm'),
        ('RICHARDSON & COCK LIMITED','business','farm'),
        ('E. W. BOWSER & SON LIMITED','business','farm'),
        ('BETCHTON LIMITED','business','estate'),
        ('MARTIN CLIFTON LIMITED','business','estate'),
        ('BRETT AGGREGATES LIMITED','business','extraction'),
        ('COVERLAND UK LIMITED','business','industry'),
        ('MARSHALLS MONO LIMITED','business','industry'),
        ('SPEYCREST LIMITED','business','estate'),
        ('NESS HALL LIMITED','business','estate'),
        ('HEXHAM AUCTION MART COMPANY LIMITED','business','farm'),
        ('HAGLEY PARK LIMITED LIABILITY PARTNERSHIP','business','estate'),
        ('L. NETTLETON & SON LIMITED','business','farm'),
        ('WM MORRISON SUPERMARKETS LIMITED','business','retail'),
        ('C.C.PROJECTS','business','estate'),
        ('SILFIELD LIMITED','business','farm'),
        ('ALVIS BROTHERS LIMITED','business','farm'),
        ('CDI HOLDCO LIMITED','business','investment'),
        ('ASHMARDEN LIMITED','business','estate'),
        ('STAPLES BROTHERS LIMITED','business','farm'),
        ('QINETIQ LIMITED','gov','defence'),
        ('SETTLE GROUP','business','housing'),
        ('BAE SYSTEMS (OPERATIONS) LIMITED','gov','defence'),
        ('THENHURST AGRICULTURAL LIMITED','business','farm'),
        ('UNIPER UK LIMITED','business','industry'),
        ('DAVID BLACK & SON LIMITED','business','farm'),
        ('RANDLE BROOKS LIMITED','business','farm'),
        ('A HINGE & SONS LIMITED','business','farm'),
        ('WILSON ENTERPRISES LIMITED','business','estate'),
        ('RALPH HARRISON & COMPANY LIMITED','business','farm'),
        ('E C DRUMMOND (AGRICULTURE) LTD','business','farm'),
        ('LOVE BROTHERS LIMITED','business','farm'),
        ('WCK FAMILY MILK PROCESSING LIMITED','business','industry'),
        ('CPE TRUST CO NO.1 LTD','business','investment'),
        ('BURTTS OF DOWSBY LIMITED','business','farm'),
        ('TYMURE LLP','business','estate'),
        ('E W BOWSER & SON LIMITED','business','farm'),
        ('PEDDARS PIGS LIMITED','business','farm'),
        ('R J & A E GODFREY','business','farm'),
        ('RADSTOCK CO-OPERATIVE SOCIETY LIMITED','business','retail'),
        ('SUEZ UK ENVIRONMENT LTD','gov','environment'),
        ('RAILWAY PATHS LIMITED','infra','all'),
        ('METACRE LIMITED','business','estate'),
        ('DARRINGTON QUARRIES LIMITED','business','extraction'),
        ('RUMFORD LIMITED','business','estate'),
        ('INGREBOURNE VALLEY LIMITED','business','extraction'),
        ('ALLEN (HANFORD) LIMITED','business','farm'),
        ('FLOWER OF MAY HOLIDAY PARKS LIMITED','business','retail'),
        ('CARTER AND WARD OF WICKFORD LIMITED','business','builder'),
        ('GASCOINES GROUP LIMITED','business','estate'),
        ('FRANK RICHARDSON & SON LIMITED','business','farm'),
        ('BRINKLOW QUARRY LIMITED','business','extraction'),
        ('MUD HUT MANAGEMENT LIMITED','business','estate'),
        ('BREEDON TRADING LIMITED','business','extraction'),
        ('THOMAS ARMSTRONG (AGGREGATES) LIMITED','business','extraction'),
        ('O.A. TAYLOR & SONS BULBS LIMITED','business','farm'),
        ('ST JAMES GROUP LIMITED','business','housing'),
        ('PROCTOR BROS. (GOSBERTON) LIMITED','business','farm'),
        ('ARTHUR''S PARTNERS LLP','business','estate'),
        ('PGL TRAVEL LIMITED','business','retail'),
        ('FRED WALTER & SONS LIMITED','business','farm'),
        ('ONE MANCHESTER LIMITED','business','housing'),
        ('BRITT BROADBENT LIMITED','business','farm'),
        ('PAUL SPINK LIMITED','business','farm'),
        ('CAUDWELL & SONS LIMITED','business','farm'),
        ('NORINCO LIMITED','gov','defence'),
        ('D A PHILLIPS & CO LTD','business','farm'),
        ('ROYAL MAIL GROUP LIMITED','infra','all'),
        ('M.B. GOODWIN (SKIPSEA) LIMITED','business','farm'),
        ('TERRAREGEN UK LIMITED','business','estate'),
        ('R CAUDWELL (PRODUCE) LIMITED','business','farm'),
        ('LEVERTON BROTHERS LIMITED','business','farm'),
        ('BLUE ANCHOR LEISURE LIMITED','business','retail'),
        ('ARTHUR MARKILLIE LIMITED','business','farm'),
        ('DULWICH STORAGE COMPANY LIMITED','business','other'),
        ('G S SHROPSHIRE & SONS LIMITED','business','farm'),
        ('HEGCO 139 LIMITED','business','estate'),
        ('JOHN A WELLS LIMITED','business','farm'),
        ('MORNACOTT CONSERVATION LIMITED','charity','other'),
        ('F.H. BOWSER LIMITED','business','farm'),
        ('C W PARKER (WAINFLEET) LIMITED','business','farm'),
        ('CLASSIC LODGES LIMITED','business','retail'),
        ('K B TEBBIT LIMITED','business','farm'),
        ('MAN OF ROSS LIMITED','business','retail'),
        ('R.J. & A.E. GODFREY','business','farm'),
        ('TUDOR GRIFFITHS LIMITED','business','extraction'),
        ('M A GRIGG (AGRICULTURAL) LIMITED','business','farm'),
        ('MORETON C CULLIMORE (GRAVELS) LIMITED','business','extraction'),
        ('RICHARD HARTLEY LIMITED','business','farm'),
        ('L E TUCKWELL LIMITED','business','farm'),
        ('ROBERT PADFIELD LIMITED','business','farm'),
        ('SMITH & SONS (BLETCHINGTON) LIMITED','business','extraction'),
        ('INVESTACC LIMITED','business','investment'),
        ('PARK RESORTS LIMITED','business','retail'),
        ('TARMAC CEMENT AND LIME LIMITED','business','extraction'),
        ('TAPWELL PARK LIMITED','business','estate'),
        ('GAZELEY UK LIMITED','business','builder'),
        ('ADVANCED RESEARCH CLUSTERS GP LIMITED','business','estate'),
        ('E. J. MACKELDEN & SONS (BOBBING) LIMITED','business','farm'),
        ('RICHARD BOWDLER LIMITED','business','farm'),
        ('SUEZ RECYCLING AND RECOVERY UK LTD','gov','environment'),
        ('YORKWOLD PIGPRO LIMITED','business','farm'),
        ('PEEL L&P (PORTS) LIMITED','infra','all'),
        ('FOUR ASHES LIMITED','business','estate'),
        ('CHARLES LONG LIMITED','business','farm'),
        ('BOTHAM FIRS LTD','business','farm'),
        ('WARRENDALE GROUP LIMITED','business','farm'),
        ('ASHTON AGRICULTURAL & GENERAL LIMITED','business','farm')
) AS m(proprietor_name_1, cat, subcat)
WHERE t.proprietor_name_1 = m.proprietor_name_1;

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = m.cat,
    subcat = m.subcat
FROM (
    VALUES
        ('J WHARTON (SHIPPING) LIMITED','business','other'),
        ('DULWICH STORAGE COMPANY LIMITED','business','other'),
        ('TARMAC CEMENT AND LIME LIMITED','business','extraction'),
        ('SUEZ RECYCLING AND RECOVERY NORTH EAST LTD','gov','environment'),
        ('EASTERN QUARRY LIMITED','business','extraction'),
        ('MANOR HOUSE HOTEL (OKEHAMPTON) LIMITED','business','retail'),
        ('MAUNA KEA LIMITED','business','estate'),
        ('SEH MANAGER LIMITED','business','builder'),
        ('HABTON RACING','business','other'),
        ('DUCKMORE LIMITED','business','estate'),
        ('E J MACKELDEN & SONS (BOBBING) LIMITED','business','farm'),
        ('ROTHESAY LIFE PLC','business','investment'),
        ('JOHN A WELLS LTD','business','farm'),
        ('F.K. KEMSLEY & SONS LIMITED','business','farm'),
        ('MERLIN ATTRACTIONS OPERATIONS LIMITED','business','retail'),
        ('ACRESFORD SAND AND GRAVEL LIMITED','business','extraction'),
        ('FRIDAYS LIMITED','business','farm'),
        ('F H EASTON LIMITED','business','farm'),
        ('ALLTRUST SIPP LIMITED','business','investment'),
        ('BONDGRIP LIMITED','business','industry'),
        ('BROCK LIMITED','business','estate'),
        ('FGS AGRI LIMITED','business','farm'),
        ('CANADA LIFE LIMITED','business','investment'),
        ('J H DORRINGTON & SON (DUNSBY) LIMITED','business','farm'),
        ('S. HALGARTH LIMITED','business','farm'),
        ('J ALSTON & SONS LIMITED','business','farm'),
        ('HALTON PIGS LIMITED','business','farm'),
        ('ALFRED HYMAS LIMITED','business','industry'),
        ('BOULTBEE BROOKS LIMITED','business','estate'),
        ('BPB UNITED KINGDOM LIMITED','business','industry'),
        ('H PRINS LIMITED','business','farm'),
        ('TRAPOC LIMITED','business','estate'),
        ('ADAMES (FLANSHAM) LIMITED','business','estate'),
        ('BOURNE HOLIDAYS LIMITED','business','retail'),
        ('CYRIL COOPER & SONS LIMITED','business','farm'),
        ('BURRY AND KNIGHT LIMITED','business','estate'),
        ('EMBRYO ANGLING HABITATS LIMITED','charity','other'),
        ('WHITBREAD GROUP PLC','business','retail'),
        ('ANGLO AMERICAN WOODSMITH LIMITED','business','extraction'),
        ('UP CERNE LIMITED','business','farm'),
        ('JOHN DOBSON & SON (CARLTON) LIMITED','business','farm'),
        ('TAMAR (SELBY) LIMITED','business','estate'),
        ('G E GREEN LIMITED','business','farm'),
        ('SIZEWELL C LIMITED','infra','all'),
        ('HUGH CRANE LIMITED','business','industry'),
        ('CHANDLER & DUNN LIMITED','business','farm'),
        ('FARCET FEN LIMITED','business','estate'),
        ('RYALL HOUSE LIMITED','business','estate'),
        ('LUNETTE SERVICES ONE LIMITED','business','investment'),
        ('ESSAR OIL (UK) LIMITED','business','industry'),
        ('R DUNTHORNE LIMITED','business','farm'),
        ('J A CUSSONS LIMITED','business','industry'),
        ('MAY BROTHERS LIMITED','business','farm'),
        ('THE BERKELEY LEISURE GROUP LIMITED','business','retail'),
        ('CO-OPERATIVE GROUP LIMITED','business','retail'),
        ('GEORGE HAY & SONS LIMITED','business','farm'),
        ('MAURICE CROUCH (GROWERS) LIMITED','business','farm'),
        ('MARK H POSKITT LIMITED','business','farm'),
        ('UNIVERSITIES SUPERANNUATION SCHEME LIMITED','business','investment'),
        ('WELLAND AND DEEPINGS INTERNAL DRAINAGE BOARD','gov','environment'),
        ('PAUL RACKHAM LIMITED','business','estate'),
        ('TAYLOR & SONS (GROWERS) LIMITED','business','farm'),
        ('FOSTER YEOMAN LIMITED','business','extraction'),
        ('A & M TURNEY LIMITED','business','farm'),
        ('RMB 102 LIMITED','business','estate'),
        ('ROLLS-ROYCE PLC','gov','defence'),
        ('FENWICK BROTHERS LIMITED','business','farm'),
        ('STONYDELPH LIMITED','business','estate'),
        ('MOY PARK LIMITED','business','farm'),
        ('MAINLINE PIPELINES LIMITED','infra','all'),
        ('LEWISIA LIMITED','business','estate'),
        ('THE GRANGE HAMPSHIRE LLP','business','estate'),
        ('T.J. MORRIS LIMITED','business','retail'),
        ('ARCHIBALD BATHGATE GROUP LIMITED','business','extraction'),
        ('SUSTRANS LIMITED','charity','other'),
        ('ERNEST V WADDINGTON LIMITED','business','farm'),
        ('D.A. PHILLIPS & CO LIMITED','business','farm'),
        ('SHOEMAKER GP LIMITED','business','investment'),
        ('INOVYN CHLORVINYLS LIMITED','business','industry'),
        ('SEGRO (JUNCTION 15) LIMITED','business','builder'),
        ('GRAY & SONS (CHELMSFORD) LIMITED','business','farm'),
        ('LOVELL PARTNERSHIPS LIMITED','business','builder'),
        ('HOLGATES (CARAVAN PARKS) LIMITED','business','retail'),
        ('DWR CYMRU CYFYNGEDIG','infra','all'),
        ('FRANK FEHR & COMPANY LIMITED','business','industry'),
        ('SHELL U.K. LIMITED','business','industry'),
        ('THE BRIDGEWATER CANAL COMPANY LIMITED','infra','all'),
        ('HILLS UK LIMITED','business','builder'),
        ('PROCTOR BROS. (LONG SUTTON) LIMITED','business','farm'),
        ('NORTHUMBRIAN LEISURE LIMITED','business','retail'),
        ('TWH CLARKE & SON (1954) LIMITED','business','farm'),
        ('NOBLE FOODS LIMITED','business','farm'),
        ('MORRIS & PERRY (GURNEY SLADE QUARRIES) LIMITED','business','extraction'),
        ('SPINKO LIMITED','business','estate'),
        ('P.D. HOOK (GROUP) LIMITED','business','farm'),
        ('E & R FULLER LIMITED','business','farm'),
        ('P J SOUTHGATE LIMITED','business','farm'),
        ('SECOND TRINITY LIMITED','business','estate'),
        ('PEAR TREE PROJECTS LIMITED','business','housing'),
        ('CLH PIPELINE SYSTEM (CLH-PS) LTD','infra','all'),
        ('DIGNITY FUNERALS LIMITED','business','retail'),
        ('M H POSKITT LLP','business','farm'),
        ('TANNINGTON PIGS LIMITED','business','farm'),
        ('CANNINGTON ENTERPRISES LIMITED','business','farm'),
        ('HUWS GRAY LIMITED','business','builder'),
        ('GREEN LABEL POULTRY LIMITED','business','farm'),
        ('NORMON GRUNDY & SON LIMITED','business','farm'),
        ('MAIZELANDS LIMITED','business','farm'),
        ('CARNSWORTH LIMITED','business','estate'),
        ('ELECTRO OIL AND GAS BURNERS LIMITED','business','industry'),
        ('MANOR OF ROSCRADDOC LIMITED','business','estate'),
        ('JOHN BRINDLEY & SONS LIMITED','business','farm'),
        ('REASSURE LIMITED','business','investment'),
        ('COASTFIELDS LEISURE LIMITED','business','retail'),
        ('COMMUNITY GATEWAY ASSOCIATION LIMITED','business','housing'),
        ('EURO GARAGES LIMITED','business','retail'),
        ('WEAVERS CLOSE LIMITED','business','estate'),
        ('W HOYES & SONS LIMITED','business','farm'),
        ('HOME GROWN HOTELS LIMITED','business','retail'),
        ('JOB EARNSHAW & BROS LIMITED','business','farm'),
        ('SENDTOUR LIMITED','business','estate'),
        ('MOTO HOSPITALITY LIMITED','business','retail'),
        ('BURLING BROTHERS LIMITED','business','farm'),
        ('HILLIER NURSERIES LIMITED','business','farm'),
        ('NETHERBY HALL LIMITED','business','estate'),
        ('ADVANCE NORTHUMBERLAND (COMMERCIAL) LIMITED','LA','district'),
        ('BOULEH LIMITED','business','estate'),
        ('VITALOGRAPH (UK) LIMITED','business','industry'),
        ('F C STARK LIMITED','business','farm'),
        ('HANSON PACKED PRODUCTS LIMITED','business','industry'),
        ('VICTORY JACK LIMITED','business','estate'),
        ('R H TOPHAM & SONS LIMITED','business','farm'),
        ('EI GROUP PLC','business','retail'),
        ('BP OIL UK LIMITED','business','industry'),
        ('TODHUNTER LIMITED','business','farm'),
        ('EDWARD VINSON LIMITED','business','farm'),
        ('AVIVA INVESTORS GROUND RENT GP LIMITED','business','investment'),
        ('MARK CAUDWELL LIMITED','business','farm'),
        ('COAL CONTRACTORS LIMITED','business','extraction'),
        ('INVESTFRONT LIMITED','business','investment'),
        ('FREDERIC ROBINSON LIMITED','business','retail'),
        ('GREENBELT GROUP LIMITED','charity','trust'),
        ('VISTRY PARTNERSHIPS LIMITED','business','builder'),
        ('L J FAIRBURN & SON LIMITED','business','farm'),
        ('IBSTOCK BRICK LIMITED','business','industry'),
        ('COSTCO WHOLESALE UK LIMITED','business','retail'),
        ('ANGUS BEEF COMPANY LIMITED','business','farm'),
        ('TENDLEY QUARRIES LIMITED','business','extraction'),
        ('BURY''S DRYANSTORE LIMITED','business','estate'),
        ('GRORDIC LIMITED','business','estate'),
        ('M B GOODWIN (SKIPSEA) LIMITED','business','farm'),
        ('W. CUMBER & SON (THEALE) LIMITED','business','builder'),
        ('BRITISH FLUORSPAR LIMITED','business','extraction'),
        ('WYBOSTON LAKES LIMITED','business','retail'),
        ('M F BENNION (POTATOES) LIMITED','business','farm'),
        ('STUART PARTNERS LIMITED','business','farm'),
        ('OLDERSHAWS OF MOULTON LIMITED','business','farm'),
        ('WHARFEDALE LIMITED','business','estate'),
        ('HUNTSMANS QUARRIES LIMITED','business','extraction'),
        ('P A WRIGHT & SONS LIMITED','business','farm'),
        ('THE FENLAND DISTRICT LODGE OF THE ODDFELLOWS','club','other'),
        ('FORESTRY RESOURCE LTD','business','farm'),
        ('W.S. CHAPMAN & SONS LIMITED','business','farm'),
        ('J M BUBB & SON LLP','business','farm'),
        ('RICHARD HARDY (FISHTOFT)','business','farm'),
        ('LEA VALLEY LIMITED','business','estate'),
        ('HILLSIDE ANIMAL SANCTUARY LIMITED','charity','other'),
        ('FLAMBOROUGH HOLIDAYS LIMITED','business','retail'),
        ('OMNIVALE LIMITED','business','estate'),
        ('A E BECKETT & SONS LIMITED','business','farm'),
        ('ELLIS BROS (CONTRACTORS) LIMITED','business','builder'),
        ('PRESCOT BUSINESS PARK LIMITED','business','estate'),
        ('PEEL L&P (PORTS NO.3) LIMITED','infra','all'),
        ('COLN PARK LLP','business','estate'),
        ('IAN MOSEY LIMITED','business','farm'),
        ('HARRISON LEISURE UK LIMITED','business','retail'),
        ('32 GROSVENOR SQUARE LIMITED','business','estate'),
        ('TIMBERLAINE LIMITED','business','estate'),
        ('JACKAMAX LIMITED','business','estate'),
        ('CRAVEN CATTLE MARTS LIMITED','business','farm')
) AS m(proprietor_name_1, cat, subcat)
WHERE t.proprietor_name_1 = m.proprietor_name_1;

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = m.cat,
    subcat = m.subcat
FROM (
    VALUES
        ('J WHARTON (SHIPPING) LIMITED','business','other'),
        ('DULWICH STORAGE COMPANY LIMITED','business','other'),
        ('TARMAC CEMENT AND LIME LIMITED','business','extraction'),
        ('HABTON RACING','business','other'),
        ('MALCOLM WRISDALE LIMITED','business','estate'),
        ('BLUEHOOD LIMITED','business','estate'),
        ('FRIENDS TRUSTS LIMITED','charity','trust'),
        ('LONGTHORP (KILPIN) LIMITED','business','estate'),
        ('TINGDENE PARKS LIMITED','business','retail'),
        ('REAPER LIMITED','business','estate'),
        ('PLASMOR LIMITED','business','industry'),
        ('IBSTOCK BRICKS (1996) LIMITED','business','industry'),
        ('PENGETHLEY POTATOES LIMITED','business','farm'),
        ('W H STRAWSON (NOTTS) LIMITED','business','farm'),
        ('SPARROW GREEN LIMITED','business','farm'),
        ('MONTE BLACKBURN LIMITED','business','estate'),
        ('CEYLON TEA GROWERS ASSOCIATION LIMITED','business','farm'),
        ('TAYLOR LINDSEY LIMITED','business','industry'),
        ('BAE SYSTEMS PLC','gov','defence'),
        ('TARMAC BUILDING PRODUCTS LIMITED','business','industry'),
        ('CRANSWICK COUNTRY FOODS PLC','business','farm'),
        ('NOMBANS LIMITED','business','estate'),
        ('COUNTRYWIDE ASSURED PLC','business','housing'),
        ('CRAMSCENE LIMITED','business','estate'),
        ('HOLLY DOWN LLP','business','estate'),
        ('PRIORY HOLDCO LIMITED','business','investment'),
        ('G-VEG LIMITED','business','farm'),
        ('LONDON YORK FUND MANAGERS LIMITED','business','investment'),
        ('THE NATIONAL FOREST COMPANY','gov','environment'),
        ('PRAEDIUS UK (NO 1) LIMITED','business','investment'),
        ('SOUTH CROFTY LIMITED','business','extraction'),
        ('COCK OF THE NORTH (POULTRY) LIMITED','business','farm'),
        ('S NOTARO LIMITED','business','farm'),
        ('WITHAM (SPECIALIST VEHICLES) LIMITED','business','industry'),
        ('SUNTRUST LIMITED','business','investment'),
        ('OAKOVER NURSERIES LIMITED','business','farm'),
        ('HINGLEY & CALLOW OILS LIMITED','business','industry'),
        ('COTTERHILL LIMITED','business','estate'),
        ('BRITANNIA HOTELS LIMITED','business','retail'),
        ('NEW STREET LLP','business','investment'),
        ('URENCO UK LIMITED','business','industry'),
        ('UTOPIA LEISURE LIMITED','business','retail'),
        ('BACKFIELD (2003) LIMITED','business','estate'),
        ('FLEXSPACE NO 1 LLP','business','investment'),
        ('SLM PERCIVAL LTD','business','industry'),
        ('ARLA FOODS LIMITED','business','farm'),
        ('ARNOLD CLARK AUTOMOBILES LIMITED','business','retail'),
        ('H. W. COATES LIMITED','business','estate'),
        ('MCDONALD''S RESTAURANTS LIMITED','business','retail'),
        ('JOHN FOWLER HOLIDAYS LIMITED','business','retail'),
        ('LEO SAWRIJ LIMITED','business','estate'),
        ('WESTERNRANGE LIMITED','business','estate'),
        ('SAXON WEALD','business','housing'),
        ('LONDONMETRIC DISTRIBUTION LIMITED','business','retail'),
        ('AVIAGEN TURKEYS LIMITED','business','farm'),
        ('F.C. STARK LIMITED','business','farm'),
        ('ASHTENNE (AIF) LIMITED','business','investment'),
        ('DAVID AUSTIN ROSES LIMITED','business','farm'),
        ('GASKAINS LIMITED','business','farm'),
        ('W CLIFFORD WATTS LIMITED','business','farm'),
        ('HAULFRYN GROUP LIMITED','business','retail'),
        ('PERENCO UK LIMITED','business','industry'),
        ('A. HINGE & SONS LIMITED','business','farm'),
        ('SWYNSON LIMITED','business','estate'),
        ('D.A. PHILLIPS & CO. LIMITED','business','farm'),
        ('G R WARD & CO','business','farm'),
        ('IAMP LLP','business','investment'),
        ('C N OVERTON LIMITED','business','farm'),
        ('GROOM BROS LIMITED','business','farm'),
        ('C.C. PROJECTS','business','investment'),
        ('TRAGO MILLS LIMITED','business','retail'),
        ('ESSO PETROLEUM COMPANY, LIMITED','business','industry'),
        ('E W PEPPER LIMITED','business','farm'),
        ('CELESTIAL HBS LTD','business','investment'),
        ('NOTCUTTS LIMITED','business','retail'),
        ('TILIA CROSS KEYS DEV LLP','business','housing'),
        ('C T SHELDON LIMITED','business','farm'),
        ('CARRON LODGE LIMITED','business','estate'),
        ('THE DUNCHURCH LODGE STUD COMPANY','business','farm'),
        ('A W PHOENIX & SONS LIMITED','business','farm'),
        ('FACCENDA FOODS LIMITED','business','farm'),
        ('RIVAR LIMITED','business','estate'),
        ('WARWEST LIMITED','business','farm'),
        ('TNT UK LIMITED','business','retail'),
        ('ROCHDALE CANAL COMPANY','infra','all'),
        ('WILLIAM GOSNEY LIMITED','business','farm'),
        ('LAVER LEISURE (OAKAMOOR) LIMITED','business','retail'),
        ('MEAD REALISATIONS LIMITED','business','investment'),
        ('RG CARTER GROUP LIMITED','business','builder'),
        ('THE WOODLAND TRUST','charity','ntnl_trst'),
        ('OTTER NURSERIES LIMITED','business','farm'),
        ('WITHERSLACK GROUP LIMITED','business','retail'),
        ('BROWNBRINK LIMITED','business','estate'),
        ('BINDWELL LIMITED','business','estate'),
        ('CHARLES RANSFORD & SON LIMITED','business','farm'),
        ('PROCTOR BROS (LONG SUTTON) LIMITED','business','farm'),
        ('WILSON CONNOLLY LIMITED','business','retail'),
        ('ABBEY MANOR GROUP LIMITED','business','retail'),
        ('BERKELEY LEISURE GROUP LIMITED','business','retail'),
        ('WYRESIDE LEISURE LIMITED','business','retail'),
        ('WILLIAM BOYER & SONS LIMITED','business','farm'),
        ('LOCKHILL BRIARS COMPANY LIMITED','business','estate'),
        ('MEADOWHALL CONTRACTS LIMITED','business','builder'),
        ('FCC RECYCLING (UK) LIMITED','business','industry'),
        ('P D HOOK (GROUP) P LIMITED','business','farm'),
        ('ESHTON PARK LIMITED','business','estate'),
        ('YACHT HAVENS LIMITED','business','retail'),
        ('PATERSON ENTERPRISES LIMITED','business','estate'),
        ('WILLIAM GILDER LIMITED','business','estate'),
        ('HUMBERSIDE COMMUNICATION EQUIPMENT LIMITED','business','industry'),
        ('ST JAMES''S PLACE UK PLC','business','investment'),
        ('NORTHERN SERVICES LIMITED','business','retail'),
        ('HALL & WOODHOUSE LIMITED','business','retail'),
        ('SPINCREST LIMITED','business','estate'),
        ('GEORGE WIMPEY SOUTH MIDLANDS LIMITED','business','builder'),
        ('W H BOND & SONS LIMITED','business','farm'),
        ('ELTEAM LTD','business','industry')
) AS m(proprietor_name_1, cat, subcat)
WHERE t.proprietor_name_1 = m.proprietor_name_1;

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = m.cat,
    subcat = m.subcat
FROM (
    VALUES
        ('J WHARTON (SHIPPING) LIMITED','business','other'),
        ('DULWICH STORAGE COMPANY LIMITED','business','other'),
        ('TARMAC CEMENT AND LIME LIMITED','business','extraction'),
        ('HABTON RACING','business','other'),
        ('P D HOOK (GROUP) LIMITED','business','farm'),
        ('WENNINGDALE LEISURE LIMITED','business','retail'),
        ('LEONARD TOWLER & COMPANY','business','estate'),
        ('IAN P LAIRD UNLIMITED','business','estate'),
        ('DENIS N GRUNDY LIMITED','business','estate'),
        ('TIMETOKEN LIMITED','business','investment'),
        ('BIRMINGHAM ANGLERS ASSOCIATION LIMITED','club','sport'),
        ('DA PHILLIPS & CO LIMITED','business','farm'),
        ('FULLER SMITH & TURNER PLC','business','retail'),
        ('DS SMITH PAPER LIMITED','business','industry'),
        ('PEEL L&P (PORTS NO. 3) LIMITED','infra','all'),
        ('BOC LIMITED','business','industry'),
        ('ARTYSEA LIMITED','business','farm'),
        ('TULIP LIMITED','business','farm'),
        ('MANHEIM AUCTIONS LIMITED','business','retail'),
        ('ROBERT WISEMAN & SONS LIMITED','business','retail'),
        ('SUE GP LLP','business','investment'),
        ('DANDARA SOUTH EAST LIMITED','business','housing'),
        ('PEEL SOUTH EAST LIMITED','infra','all'),
        ('WOODTHORPE HALL GARDEN CENTRES LIMITED','business','retail'),
        ('FP MCCANN GROUP LIMITED','business','industry'),
        ('HPUT A LIMITED','business','investment'),
        ('PAK MECCA MEATS LIMITED','business','retail'),
        ('MCCARTHY & STONE RETIREMENT LIFESTYLES LIMITED','business','housing'),
        ('HOWARD TENENS LIMITED','business','retail'),
        ('BEARSTONE STUD LIMITED','business','farm'),
        ('EOS INC. LTD','business','industry'),
        ('JOHN W. SHEPPARD (WYKIN) LIMITED','business','farm'),
        ('PROJECT GENESIS LIMITED','business','investment'),
        ('THOMAS BATES AND SON LIMITED','business','farm'),
        ('SPRINGFIELD COUNTRY HOTEL (STOBOROUGH) LIMITED','business','retail'),
        ('LONGHURST GROUP LIMITED','business','housing'),
        ('GEORGE WIMPEY NORTH EAST LIMITED','business','builder'),
        ('SOCIAL CELLAR (GAMMA) LIMITED','business','retail'),
        ('SMURFIT KAPPA UK LIMITED','business','industry'),
        ('RENISHAW PLC','business','industry'),
        ('GEORGE WIMPEY NORTH YORKSHIRE LIMITED','business','builder'),
        ('ELSHAM LINC LIMITED','business','estate'),
        ('MOTOR FUEL LIMITED','business','retail'),
        ('G T BIRKETT LIMITED','business','farm'),
        ('ATBOL HOLDCO 123 LIMITED','business','investment'),
        ('MARLEY LIMITED','business','industry'),
        ('AMAZON UK SERVICES LTD','business','retail'),
        ('THE ROYAL AGRICULTURAL BENEVOLENT INSTITUTION','charity','trust'),
        ('BLUE DIAMOND UK LIMITED','business','farm'),
        ('DRAKELANDS RESTORATION LIMITED','business','estate'),
        ('WOOLACOMBE BAY HOLIDAY VILLAGE LIMITED','business','retail'),
        ('EDEN RESORTS LIMITED','business','retail'),
        ('D A PHILLIPS & CO. LIMITED','business','farm'),
        ('LADBROKE PROJECTS LTD','business','investment'),
        ('ALEXANDER CARUS & SONS LIMITED','business','farm'),
        ('STOKE-ON-TRENT REGENERATION LIMITED','business','builder'),
        ('ERBELON LIMITED','business','industry'),
        ('WHITSTABLE OYSTER COMPANY LIMITED','business','farm'),
        ('BENTLEY MOTORS LIMITED','business','industry'),
        ('MIDCO 1 LIMITED','business','investment'),
        ('LOWFIELDS LEISURE LIMITED','business','retail'),
        ('FRONTIER AGRICULTURE LIMITED','business','farm'),
        ('DS SMITH PACKAGING LIMITED','business','industry'),
        ('ERNEST V. WADDINGTON LIMITED','business','farm'),
        ('THE BATH PRIORY LIMITED','business','retail'),
        ('HUMBERSIDE AGGREGATES LIMITED','business','extraction'),
        ('WELLFIELD COMMERCIAL LIMITED','business','retail'),
        ('HESMALONEY LIMITED','business','investment'),
        ('SHEPHERD NEAME LIMITED','business','retail'),
        ('CHARLES BISHOP LIMITED','business','farm'),
        ('PREMIER FOODS GROUP LIMITED','business','retail'),
        ('NORTH WEST TURF LIMITED','business','farm'),
        ('PARK TOP LIMITED','business','farm'),
        ('J S BLOOR (TEWKESBURY) LIMITED','business','builder'),
        ('CADDICK (SCARBOROUGH) LIMITED','business','builder'),
        ('TW NCA LIMITED','business','investment'),
        ('DUNBIA (UK)','business','industry'),
        ('W J SKIPPER (HAULAGE) LIMITED','business','industry'),
        ('SKEG GRAIN LIMITED','business','farm'),
        ('GRIST GROUP LIMITED','business','industry'),
        ('A & J MUCKLOW & CO LIMITED','business','farm'),
        ('VISION ENGINEERING LIMITED','business','industry'),
        ('MCMULLEN & SONS LIMITED','business','farm'),
        ('MARKET HOLDCO GRPC 3 LLP','business','investment'),
        ('DEWDOWN LIMITED','business','farm'),
        ('PALL MALL 3 LIMITED','business','retail'),
        ('NATS (EN ROUTE) PLC','gov','transport'),
        ('J P MATTHEWS LIMITED','business','farm'),
        ('MORRIS & COMPANY LIMITED','business','farm'),
        ('DRAPER TOOLS LIMITED','business','industry'),
        ('AG RETALLACK LIMITED','business','farm'),
        ('WALKER & SON (HAULIERS) LIMITED','business','industry'),
        ('TURNERS (SOHAM) LIMITED','business','retail'),
        ('GEORGE WIMPEY NORTH WEST LIMITED','business','builder'),
        ('URBAN LOGISTICS ACQUISITIONS 6 LIMITED','business','investment'),
        ('THE CHANNEL TUNNEL GROUP LIMITED','infra','all'),
        ('JOHNSON MATTHEY PLC','business','industry'),
        ('CHICHESTER HARBOUR TRUST','charity','trust'),
        ('AEDIFICA UK LIMITED','business','investment'),
        ('HORNSEA LEISURE LIMITED','business','retail'),
        ('THE WHEEL CENTRE ENTERPRISES LIMITED','business','retail'),
        ('HARDGAIN LIMITED','business','farm'),
        ('CAPITOL PARK BARNSLEY LIMITED','business','estate'),
        ('DARTLAND LIMITED','business','estate'),
        ('COUNTRYSIDE ZEST (BEAULIEU PARK) LLP','business','housing'),
        ('HELLENS GROUP LIMITED','business','estate'),
        ('CHARLES WELLS LIMITED','business','retail'),
        ('M BAKER (PRODUCE) LIMITED','business','farm'),
        ('MARINADA LIMITED','business','farm'),
        ('FAIRBAR LIMITED','business','retail'),
        ('SEVENTH-DAY ADVENTIST ASSOCIATION LIMITED','charity','other'),
        ('TURNERS (BRITANNIA PARKS) LIMITED','business','retail'),
        ('T J MORRIS LIMITED','business','retail'),
        ('MEPC MILTON PARK NO.1 LIMITED','business','investment'),
        ('THE BLUE CROSS (INCORPORATING OUR DUMB FRIENDS LEAGUE)','charity','trust'),
        ('LONGLEAT ENTERPRISES LIMITED','business','retail'),
        ('LANDMARK (BOLTON) LIMITED','business','retail'),
        ('PORTLAND STONE FIRMS LIMITED','business','industry'),
        ('BPT LIMITED','business','investment'),
        ('BOWLER ADAMS LLP','business','investment'),
        ('BENNETT PLC','business','retail'),
        ('HAMPTON (PETERBOROUGH) MANAGEMENT LIMITED','business','investment'),
        ('ISHGUARD LIMITED','business','industry'),
        ('WADDETON PARK LIMITED','business','estate'),
        ('TAWNYWOOD LIMITED','business','estate'),
        ('HOMELEIGH GARDEN CENTRE LIMITED','business','retail'),
        ('LICKHILL MANOR LIMITED','business','estate'),
        ('SAGE RENTED LIMITED','business','investment'),
        ('CHANNACK ROSS LIMITED','business','investment'),
        ('FLOWER OF MAY HOLIDAY PARK LIMITED','business','retail'),
        ('BLUE BARN GROUP LIMITED','business','retail'),
        ('DB CARGO (UK) LIMITED','business','industry'),
        ('LONG TERM REVERSIONS (TORQUAY) LIMITED','business','investment'),
        ('HONEYCOMB GROUP LIMITED','business','retail'),
        ('LINDUM GROUP LIMITED','business','builder'),
        ('EAST OF ENGLAND CO-OPERATIVE SOCIETY LIMITED','business','retail'),
        ('GEORGE WIMPEY NORTH MIDLANDS LIMITED','business','builder'),
        ('MCCARTHY CARAVANS LIMITED','business','retail'),
        ('VEOLIA ES (UK) LIMITED','business','industry'),
        ('POLESWORTH GARAGE LIMITED','business','retail'),
        ('HALEWELL LIMITED','business','estate'),
        ('SEASIDE LEISURE PARKS LIMITED','business','retail'),
        ('HEDDON STABLES LIMITED','business','farm'),
        ('ALLHALLOWS LIMITED','church','other'),
        ('ASPRIS CHILDREN''S SERVICES LIMITED','business','other'),
        ('ARMSTRONGS AGGREGATES LIMITED','business','extraction'),
        ('SOUTHERN HOME OWNERSHIP LIMITED','business','housing'),
        ('R M BECKETT LIMITED','business','farm'),
        ('LEOWARE LIMITED','business','investment'),
        ('PENRICE HOUSE (ST AUSTELL) LIMITED','business','estate'),
        ('GEORGE WIMPEY NORTH LONDON LIMITED','business','builder'),
        ('HAULFRYN LIMITED','business','retail'),
        ('THE MAGNIFICENT SEVEN LLP','business','investment'),
        ('HUNTAPAC PRODUCE LIMITED','business','farm'),
        ('ADNAMS PLC','business','retail'),
        ('AUREUS LEISURE LIMITED','business','retail'),
        ('GOODALES ORCHARDS LIMITED','business','farm'),
        ('BRUNTWOOD MTL LIMITED','business','investment'),
        ('CENTRAL ENGLAND CO-OPERATIVE LIMITED','business','retail'),
        ('GRACEFAVOUR LIMITED','business','farm'),
        ('HAZELL CARR (PN) SERVICES LIMITED','business','farm'),
        ('GEORGE WIMPEY SOUTH YORKSHIRE LIMITED','business','builder'),
        ('FLYING TRADE GROUP PLC','business','industry'),
        ('URBAN LOGISTICS ACQUISITIONS 4 LIMITED','business','investment'),
        ('CURO ENTERPRISE LIMITED','business','investment'),
        ('HOURWATCH LIMITED','business','investment'),
        ('GALLIFORD SOUTHERN LIMITED','business','builder'),
        ('G CROOK & SONS LIMITED','business','farm'),
        ('SCIENCE (UK) LIMITED','business','industry'),
        ('HAZELEY GROUP LIMITED','business','investment'),
        ('THE BURWOOD HOUSE GROUP LIMITED','business','retail'),
        ('JUPITER HOTELS LIMITED','business','retail'),
        ('PROLOGIS UK LIMITED','business','investment'),
        ('PILKINGTON UNITED KINGDOM LIMITED','business','industry'),
        ('NOTTING HILL HOME OWNERSHIP LIMITED','business','housing'),
        ('TULSESENSE LIMITED','business','investment'),
        ('URBAN LOGISTICS ACQUISITIONS 2 LIMITED','business','investment'),
        ('MARLIEMOTHAMS LIMITED','business','investment'),
        ('D. A. PHILLIPS & CO. LIMITED','business','farm'),
        ('MAKRO SELF SERVICE WHOLESALERS LIMITED','business','retail'),
        ('WALNEY ISLAND SOUTH END CARAVAN SITE LIMITED','business','retail'),
        ('ALLEN (PARK FOOT) LIMITED','business','estate'),
        ('FUTURES HOMEWAY LIMITED','business','housing'),
        ('MARKET HOLDCO GRPC 2 LLP','business','investment'),
        ('BERKELEY SEVENTY-SIX LIMITED','business','investment'),
        ('GEORGE WIMPEY SOUTH WEST LIMITED','business','builder'),
        ('ABTAP LIMITED','business','investment'),
        ('JOHN MAUNDERS GROUP PLC','business','retail'),
        ('STABLEWOOD LEISURE GROUP LIMITED','business','retail'),
        ('D. A. PHILLIPS & CO LIMITED','business','farm'),
        ('D A HARRISON AND COMPANY WIGTON','business','farm'),
        ('COPPARD PLANT HIRE LIMITED','business','industry'),
        ('ASHBOURNE SELF CATERING LIMITED','business','retail'),
        ('WAVIN LIMITED','business','industry')
) AS m(proprietor_name_1, cat, subcat)
WHERE t.proprietor_name_1 = m.proprietor_name_1;
select st_area(geom)/10000 as Ha, * from ccod_ocod_2025_09 co where subcat = 'single_prop' order by Ha desc
select st_area(geom), * from ccod_ocod_2025_09 co where subcat = 'smll_prtflio' order by st_area(geom) desc

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = 'business',
    subcat = 'estate'
    WHERE (subcat = 'smll_prtflio' OR subcat = 'single_prop')
    AND property_address ILIKE '% estate%'

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = 'business',
    subcat = 'farm'
    WHERE (subcat = 'smll_prtflio' OR subcat = 'single_prop')
    AND property_address ILIKE '% farm%'

```sql
SELECT proprietor_name_1, COUNT(*) AS cnt, ROUND(SUM(ST_Area(geom))/10000)  AS Ha
FROM ccod_ocod_2025_09
where cat='charity' and subcat='maybe'
group by proprietor_name_1
order by ha desc;

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = m.cat,
    subcat = m.subcat
FROM (
    VALUES
        ('MALVERN HILLS CONSERVATORS','gov','environment'),
        ('WILL WOODLANDS','charity','trust'),
        ('NATIONAL ASSEMBLY FOR WALES','gov','other'),
        ('CHRIST''S HOSPITAL','education','school'),
        ('ENVIRONMENT  AGENCY','gov','env_agnc'),
        ('MRS D M FRANCE-HAYHURST FOUNDATION','charity','trust'),
        ('THE MINISTER AND TWELVE POOR MEN OF THE HOSPITAL OF QUEEN ELIZABETH IN DONNINGTON','charity','trust'),
        ('CHICHESTER HARBOUR CONSERVANCY','gov','transport'),
        ('WITHAM FOURTH DISTRICT INTERNAL DRAINAGE BOARD','gov','other'),
        ('BRANSBY HORSES','charity','other'),
        ('RESERVE FORCES AND CADETS ASSOCIATION FOR THE SOUTH EAST','gov','home_office'),
        ('THE DONKEY SANCTUARY','charity','other'),
        ('THE JOHN STRUTT CONSERVATION FOUNDATION','charity','trust'),
        ('THE MORLEY AGRICULTURAL FOUNDATION','charity','trust'),
        ('REDWINGS HORSE SANCTUARY','charity','other'),
        ('PROPANE COMPANY LIMITED(THE)','business','industry'),
        ('A C HULME & SONS','business','farm'),
        ('HISTORIC BUILDINGS AND MONUMENTS COMMISSION FOR ENGLAND','gov','culture'),
        ('THE COAL AUTHORITY','gov','other'),
        ('MAGENTA LIVING','business','housing'),
        ('THE ZOOLOGICAL SOCIETY OF LONDON','charity','ntnl_trst'),
        ('THE SMB GROUP','business','investment'),
        ('THE HEALTH AND SAFETY EXECUTIVE','gov','other'),
        ('SOUTH HOLLAND INTERNAL DRAINAGE BOARD','gov','other'),
        ('G. R. WARD & CO','business','farm'),
        ('BRITISH BROADCASTING CORPORATION','gov','culture'),
        ('SECRETARY  OF STATE FOR ENVIRONMENT FOOD AND RURAL  AFFAIRS','gov','env_agnc'),
        ('PUDDLETOWN LLP','business','investment'),
        ('ARCHBISHOP HOLGATE HOSPITAL IN HEMSWORTH','charity','trust'),
        ('THE RESERVE FORCES AND CADETS ASSOCIATION FOR THE NORTH OF ENGLAND','gov','home_office'),
        ('THE WARDENS & COMMONALTY OF THE MISTERY OF DYERS OF THE CITY OF LONDON','charity','trust'),
        ('WESSEX RESERVE FORCES AND CADETS ASSOCIATION','gov','home_office'),
        ('NORTH LEVEL DISTRICT INTERNAL DRAINAGE BOARD','gov','other'),
        ('ST JOHN''S LICHFIELD','church','diocese'),
        ('ROYAL AGRICULTURAL BENEVOLENT INSTITUTION','charity','trust'),
        ('BADER INTERNATIONAL STUDY CENTRE','education','school'),
        ('THE RAMSBURY MANOR FOUNDATION','charity','trust'),
        ('J W GRANT','business','farm'),
        ('HUGH SEXEY''S HOSPITAL','charity','trust'),
        ('LINCOLNSHIRE AGRICULTURAL SOCIETY','charity','trust'),
        ('LEAGUE AGAINST CRUEL SPORTS','charity','other'),
        ('EDWIN H DAVEY (LIMBER) & CO','business','farm'),
        ('THE GOVERNORS OF THE LANDS AND POSSESSIONS OF THE POOR OF THE CITY OR TOWN OF ELY','charity','trust'),
        ('FRIENDS OF QUANTOCK','charity','other'),
        ('AVON NEEDS TREES','charity','other'),
        ('J.E. PICCAVER & CO (GEDNEY MARSH)','business','farm'),
        ('THE CHAPLAINS AND POOR OF THE HOSPITAL OF WILLIAM WYGGESTON IN THE CITY OF LEICESTER OF THE FOUNDATION OF THE SAME WILLIAM','charity','trust'),
        ('MILLFIELD','education','school'),
        ('STONYHURST','education','school'),
        ('THE GOVERNORS OF JESUS HOSPITAL, ROTHWELL','charity','trust'),
        ('FOWEY HARBOUR COMMISSIONERS','gov','transport'),
        ('THE NORTH OF ENGLAND ZOOLOGICAL SOCIETY','charity','ntnl_trst'),
        ('THE ROYAL HORTICULTURAL SOCIETY','charity','royal_soc'),
        ('THE BURTON CONSTABLE FOUNDATION','charity','trust'),
        ('THE MINSTER OF AGRICULTURE, FISHERIES AND FOOD','gov','env_agnc'),
        ('OFFICIAL CUSTODIAN FOR CHARITIES','gov','other'),
        ('THE LEE VALLEY REGIONAL PARK AUTHORITY','gov','environment'),
        ('CEDARVALE','charity','trust'),
        ('THE ROTHSCHILD FOUNDATION','charity','trust'),
        ('BUTTERFLY CONSERVATION','charity','ntnl_trst'),
        ('BOURNE UNITED CHARITIES','charity','trust'),
        ('THE HISTORIC BUILDINGS AND MONUMENTS COMMISSION FOR ENGLAND','gov','culture'),
        ('THE WELLAND AND DEEPINGS INTERNAL DRAINAGE BOARD','gov','other'),
        ('RJ AND AE GODFREY','business','farm'),
        ('GUY''S AND ST THOMAS'' FOUNDATION','charity','trust'),
        ('ARCHBISHOP HOLGATE''S HOSPITAL IN HEMSWORTH','charity','trust'),
        ('THE MASTER WARDENS AND ASSISTANTS OF THE GUILD FRATERNITY OR BROTHERHOOD OF THE MOST GLORIOUS AND UNDIVIDED TRINITY AND OF ST CLEMENT IN THE PARISH OF DEPTFORD STROND IN THE COUNTY OF KENT COMMONLY CALLED THE CORPORATION OF THE TRINITY HOUSE OF DEPTFORD STROND','charity','trust'),
        ('THE ALMSHOUSES OF JOHN ISBURY AND JACOB HARDRETT','charity','trust'),
        ('THE WHITGIFT FOUNDATION','charity','trust'),
        ('MITCHAM COMMON CONSERVATORS','gov','environment'),
        ('FRIMLEY FUEL ALLOTMENTS CIO','charity','trust'),
        ('COUNTRYSIDE LEARNING','education','school'),
        ('HYPERION VENTURES','business','investment'),
        ('COPYHOLD VERMOGENSVERWALTUNGS GMBH','business','investment'),
        ('ROYAL MERCHANT NAVY EDUCATION FOUNDATION','charity','trust'),
        ('ROYAL AGRICULTURAL SOCIETY OF ENGLAND','charity','trust'),
        ('ST MARY''S ABBEY, QUARR','church','other'),
        ('STANSTED PARK FOUNDATION','charity','trust'),
        ('A C HULME AND SONS','business','farm'),
        ('YORKSHIRE SCULPTURE PARK','charity','other'),
        ('THE MERCHANT SEAMEN''S WAR MEMORIAL SOCIETY (INCORPORATED)','charity','trust'),
        ('E. W. PORTER & SON','business','farm'),
        ('BROADS AUTHORITY','gov','environment'),
        ('E W PORTER & SON','business','farm'),
        ('THE BROADS AUTHORITY','gov','environment'),
        ('THE ROYAL BATH AND WEST OF ENGLAND SOCIETY','charity','trust'),
        ('DINWOODIE CHARITABLE COMPANY','charity','trust'),
        ('GRESHAM HOUSE FOREST GROWTH & SUSTAINABILITY LP','business','investment'),
        ('THE DIXON FOUNDATION','charity','trust'),
        ('H J HAGGAS & SON','business','farm'),
        ('DARTMOOR PRESERVATION ASSOCIATION','charity','other'),
        ('WEST YORKSHIRE COMBINED AUTHORITY','gov','other'),
        ('RURAL COMMUNITY ACTION NOTTINGHAMSHIRE','charity','other'),
        ('J.S.DAKIN & COMPANY','business','farm'),
        ('THE NATIONAL SOCIETY FOR EPILEPSY','charity','other'),
        ('THE MINSTER OF AGRICULTURE FISHERIES AND FOOD','gov','env_agnc'),
        ('WESTON PARK FOUNDATION','charity','trust'),
        ('THE LYNCHMERE SOCIETY','charity','other'),
        ('ACTIVATE LEARNING','education','school'),
        ('THE MARE AND FOAL SANCTUARY','charity','other'),
        ('NATIONAL COAL BOARD','gov','other'),
        ('GREEN BRITAIN FOUNDATION','charity','trust'),
        ('BMAT','education','school'),
        ('HEAL REWILDING','charity','other'),
        ('MARWELL WILDLIFE','charity','ntnl_trst'),
        ('YMCA NORTH TYNESIDE','charity','other'),
        ('KING''S LYNN INTERNAL DRAINAGE BOARD','gov','other'),
        ('LEEDS CASTLE FOUNDATION','charity','trust'),
        ('CAMBRIDGE PAST, PRESENT & FUTURE','charity','trust'),
        ('GLENVALE PARK LLP','business','investment'),
        ('ANGUISH''S EDUCATIONAL FOUNDATION','charity','trust'),
        ('IKIGAI MISCELLANY COMMUNITY INTEREST COMPANY','charity','other'),
        ('E. W. BELL & CO','business','farm'),
        ('NEWARK & NOTTINGHAMSHIRE AGRICULTURAL SOCIETY','charity','trust'),
        ('NENTHEAD MINES CONSERVATION SOCIETY','charity','other'),
        ('MERSEYSIDE WASTE DISPOSAL AUTHORITY','gov','other'),
        ('J. E. PICCAVER & CO. (GEDNEY MARSH)','business','farm'),
        ('GREAT BRITISH NUCLEAR','business','industry'),
        ('BRIGHTLINGSEA HARBOUR COMMISSIONERS','gov','transport'),
        ('THE LONDON PLAYING FIELDS SOCIETY','charity','trust'),
        ('PHOENIX SPORTS AND RECREATION (ROTHERHAM)','charity','other'),
        ('INTERNATIONAL BIBLE STUDENTS ASSOCIATION','charity','other'),
        ('THE GOVERNORS OF THE FOUNDATION KNOWN AS HORNBIE''S FOUNDATION','charity','trust'),
        ('HARRIS FEDERATION','education','school'),
        ('FRIENDS OF THE LAKE DISTRICT','charity','other'),
        ('THE GUIDE ASSOCIATION','charity','other'),
        ('CAPERNWRAY MISSIONARY FELLOWSHIP OF TORCHBEARERS','charity','other'),
        ('THE GREAT TORRINGTON COMMONS CONSERVATORS','gov','environment'),
        ('THE JIM CRONIN MEMORIAL FUND FOR PRIMATE WELFARE AND CONSERVATION','charity','trust'),
        ('ETABLISSEMENT FACCOMBE','business','industry'),
        ('VERSUS ARTHRITIS','charity','other'),
        ('THE ROYAL FORESTRY SOCIETY','charity','trust'),
        ('CHILDRENS HOSPICE SOUTH WEST','charity','other'),
        ('G L MOORE RACING LLP','business','farm'),
        ('HEART OF ENGLAND FOREST','charity','other'),
        ('D. A. HARRISON AND COMPANY WIGTON','business','farm'),
        ('HONITON & DISTRICT AGRICULTURAL ASSOCIATION','charity','trust'),
        ('THE ROYAL BRITISH LEGION','charity','trust'),
        ('THE NATURE RECOVERY PROJECT','charity','other'),
        ('WEST MIDLANDS COMBINED AUTHORITY','gov','other'),
        ('RUTLAND AGRICULTURAL SOCIETY','charity','trust'),
        ('FRED GRANT','business','farm'),
        ('DEARNSDALE FRUIT','business','farm'),
        ('BLYTH HARBOUR COMMISSIONERS','gov','transport'),
        ('ELEVEN ARCHES','business','investment'),
        ('SOUTH OF ENGLAND AGRICULTURAL SOCIETY','charity','trust'),
        ('POLICE AND CRIME COMMISSIONER FOR LANCASHIRE','gov','home_office'),
        ('ROYAL NORFOLK AGRICULTURAL ASSOCIATION','charity','trust'),
        ('CANCER RESEARCH UK','charity','other'),
        ('MARY HARE','education','school'),
        ('THE POLICE AND CRIME COMMISSIONER FOR THAMES VALLEY','gov','home_office'),
        ('THE CONSERVATORS OF ASHDOWN FOREST','gov','environment'),
        ('NORTH SOMERSET AGRICULTURAL SOCIETY','charity','trust'),
        ('HORSELL COMMON PRESERVATION SOCIETY','charity','other'),
        ('EDENBRIDGE AND OXTED AGRICULTURAL SHOW','charity','other'),
        ('YORK RI','charity','other'),
        ('WATERMILL BROAD NATURE RESERVE','charity','other'),
        ('THE DAVID LEWIS CENTRE','charity','other'),
        ('JERRY GREEN DOG RESCUE','charity','other'),
        ('FALMOUTH HARBOUR COMMISSIONERS','gov','transport'),
        ('THE KING''S LYNN INTERNAL DRAINAGE BOARD','gov','other'),
        ('BOCARDO SOCIETE ANONYME','business','investment'),
        ('POLICE AND CRIME COMMISSIONER FOR AVON AND SOMERSET','gov','home_office'),
        ('LEONARD CHESHIRE DISABILITY','charity','other'),
        ('OKEHAMPTON FOUNDATION','charity','trust'),
        ('THE BLAKENHAM WOODLAND GARDEN','charity','other'),
        ('BRITISH HEART FOUNDATION','charity','other'),
        ('DUNCHURCH LODGE STUD COMPANY','business','farm'),
        ('CWR','charity','other'),
        ('CHRISTIAN AID','charity','other'),
        ('YHA (ENGLAND AND WALES)','charity','other'),
        ('KENT COUNTY AGRICULTURAL SOCIETY','charity','trust'),
        ('EAST LONDON WASTE AUTHORITY','gov','other'),
        ('WIDE HORIZONS','charity','other'),
        ('FOXHOLES','charity','other'),
        ('ASTERO ESTABLISHMENT SA','business','investment'),
        ('THE NATIONAL CENTRE FOR YOUNG PEOPLE WITH EPILEPSY','charity','other'),
        ('THE WARDENS AND COMMONALTY OF THE MYSTERY OF MERCERS OF THE CITY OF LONDON','charity','trust'),
        ('GOVERNORS OF THE POSSESSIONS AND REVENUES OF THE HOSPITAL AT HOXTON OF THE FOUNDATION OF ROBERT ASKE','charity','trust'),
        ('MOUNT KELLY FOUNDATION GOVERNORS','charity','trust'),
        ('THE POOLE HARBOUR COMMISSIONERS','gov','transport'),
        ('FRED GRANT (COMPANY)','business','farm'),
        ('DIAGRAMA FOUNDATION-PSYCHOSOCIAL INTERVENTION','charity','other'),
        ('ANGLIAN LEARNING','education','school'),
        ('THE TUNSTALL JUBILEE FOUNDATION','charity','trust'),
        ('DITCHLING BEACON AND COMMONS','gov','environment'),
        ('THE FOUNDATION OF SIR JOHN PERCYVALE IN MACCLESFIELD OF 1502, RE-FOUNDED BY KING EDWARD VI IN 1552','charity','trust'),
        ('THATCHAM RESEARCH','business','industry'),
        ('THE PEOPLE''S DISPENSARY FOR SICK ANIMALS','charity','other'),
        ('MARKS AND SPENCER SCOTTISH LIMITED PARTNERSHIP','business','retail'),
        ('YMCA FAIRTHORNE GROUP','charity','other'),
        ('BLYTH HARBOUR COMMISSION','gov','transport'),
        ('THE AUCKLAND PROJECT','charity','trust'),
        ('NATIONWIDE BUILDING SOCIETY','business','finance'),
        ('DEVON BIRDS','charity','other'),
        ('RESTORE HOPE LATIMER','charity','other'),
        ('SUFFOLK AGRICULTURAL ASSOCIATION','charity','trust'),
        ('GOOD HEART ANIMAL SANCTUARIES','charity','other'),
        ('MOORCROFT RACEHORSE WELFARE CENTRE','charity','other'),
        ('CAFE COMMODITIES INC','business','retail')
) AS m(proprietor_name_1, cat, subcat)
WHERE t.proprietor_name_1 = m.proprietor_name_1;

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = m.cat,
    subcat = m.subcat
FROM (
    VALUES
        ('THE GUIDE DOGS FOR THE BLIND ASSOCIATION','charity','other'),
        ('LEYBOURNE GRANGE MANAGEMENT COMMUNITY INTEREST COMPANY','charity','other'),
        ('POOLE HARBOUR COMMISSIONERS','gov','transport'),
        ('TEES VALLEY COMMUNITY FOUNDATION','charity','trust'),
        ('J E PICCAVER AND CO (GEDNEY MARSH)','business','farm'),
        ('SCANTLEBURY MANWOOD','business','farm'),
        ('THE MORAVIAN UNION (INCORPORATED)','charity','trust'),
        ('AHIMSA DAIRY FOUNDATION','charity','trust'),
        ('ADVENTURE PLUS','charity','other'),
        ('WORLD TAMILS HISTORICAL SOCIETY','charity','other'),
        ('THE ALDENHAM FOUNDATION','charity','trust'),
        ('WITHAM FIRST DISTRICT INTERNAL DRAINAGE BOARD','gov','other'),
        ('FIELD STUDIES COUNCIL','education','school'),
        ('NATIONAL RIFLE ASSOCIATION','charity','other'),
        ('THE DOVER HARBOUR BOARD','gov','transport'),
        ('FEATHERSTONE INC','business','industry'),
        ('THE OFFICIAL CUSTODIAN OF CHARITIES','gov','other'),
        ('STOLKIN & CLEMENTS (SOUTHEND) LLP','business','investment'),
        ('MOUNT ST MARY''S','education','school'),
        ('THE UNITED WESTMINSTER AND GREY COAT FOUNDATION','charity','trust'),
        ('WEST MERCIA POLICE AUTHORITY','gov','home_office'),
        ('THE TERRITORIAL AUXILIARY AND VOLUNTEER RESERVE ASSOCIATION FOR THE NORTH OF ENGLAND','gov','home_office'),
        ('THREE COUNTIES AGRICULTURAL SOCIETY','charity','trust'),
        ('CRANLEIGH AND SOUTH EASTERN AGRICULTURAL SOCIETY','charity','trust'),
        ('THE NEWBURY AND DISTRICT AGRICULTURAL SOCIETY','charity','trust'),
        ('THE POLICE AND CRIME COMMISSIONER FOR KENT','gov','home_office'),
        ('NORTH OF ENGLAND ZOOLOGICAL SOCIETY','charity','ntnl_trst'),
        ('THE GUILD OF ST GEORGE','charity','trust'),
        ('BERKSWELL CHARITIES','charity','trust'),
        ('SUSSEX POLICE AUTHORITY','gov','home_office'),
        ('THE NORTH EAST AUTISM SOCIETY','charity','other'),
        ('THE THAME AND OXFORDSHIRE COUNTY AGRICULTURAL ASSOCIATION','charity','trust'),
        ('J.J. GRANT','business','farm'),
        ('THE SCARGILL MOVEMENT','charity','other'),
        ('CARING FOR LIFE','charity','other'),
        ('POLICE AND CRIME COMMISSIONER FOR NORTHUMBRIA','gov','home_office'),
        ('J G LITHERLAND (RHUBARB)','business','farm'),
        ('BLACK SLUICE INTERNAL DRAINAGE BOARD','gov','other'),
        ('J J GRANT COMPANY','business','farm'),
        ('CABOT LEARNING FEDERATION','education','school'),
        ('POLICE AND CRIME COMMISSIONER FOR WEST MIDLANDS','gov','home_office'),
        ('ST GEORGE''S WEYBRIDGE','education','school'),
        ('THE REEDNESS AND SWINEFLEET DRAINAGE BOARD','gov','other'),
        ('GREATER MANCHESTER COMBINED AUTHORITY','gov','other'),
        ('W.D. SMITH & SON','business','farm'),
        ('SHROPSHIRE ORNITHOLOGICAL SOCIETY 2005','charity','other'),
        ('UPPER WITHAM INTERNAL DRAINAGE BOARD','gov','other'),
        ('POLICE AND CRIME COMMISSIONER FOR SURREY','gov','home_office'),
        ('J.W.GRANT','business','farm'),
        ('GENERAL CEMETERY COMPANY','business','other'),
        ('EDUCATION FOR THE 21ST CENTURY','education','school'),
        ('THE GUTTRIDGE FAMILY FOUNDATION','charity','trust'),
        ('CHARTERED ACCOUNTANTS'' BENEVOLENT ASSOCIATION','charity','other'),
        ('THE PRINCETHORPE FOUNDATION','charity','trust'),
        ('LITTLE OUSE HEADWATERS PROJECT','charity','other'),
        ('THE OFFICIAL CUSTODIAN CHARITIES','gov','other'),
        ('ZAPLINE TRADING S A','business','industry'),
        ('HORSES AND PONIES PROTECTION ASSOCIATION','charity','other'),
        ('THE HOSPITAL OF THE HOLY AND UNDIVIDED TRINITY','charity','trust'),
        ('ASTON-MANSFIELD','business','industry'),
        ('DEVON & CORNWALL POLICE AUTHORITY','gov','home_office'),
        ('LONDON FIRE COMMISSIONER','gov','home_office'),
        ('PROTECT EARTH','charity','other'),
        ('CHRISTIAN VISION','charity','other'),
        ('DENTONS SIPP AJ MANSFIELD CA22260','business','investment'),
        ('THE HINCHINGBROOKE FOUNDATION CIO','charity','trust'),
        ('CENTRE MINISTRIES','charity','other'),
        ('EASTERN LEARNING ALLIANCE','education','school'),
        ('THE POLICE AND CRIME COMMISSIONER FOR NORFOLK','gov','home_office'),
        ('DONCASTER EAST INTERNAL DRAINAGE BOARD','gov','other'),
        ('ST JOHN''S SEMINARY CIO','education','school'),
        ('FOXIE''S FUTURE','charity','other'),
        ('WREKIN TURF GROWERS','business','farm'),
        ('KIPLIN HALL CIO','charity','trust'),
        ('RED TREE (2004) LLP','business','investment'),
        ('WORLD HABITAT','charity','other'),
        ('ANGLO BEEF PROCESSORS UK','business','industry'),
        ('TREE AID','charity','other'),
        ('THE ROYAL MASONIC BENEVOLENT INSTITUTION CARE COMPANY','charity','trust'),
        ('GARDENS OF PEACE MUSLIM CEMETERY','charity','other'),
        ('THE BOURN LLP','business','investment'),
        ('THE SOLICITOR FOR THE AFFAIRS OF HER MAJESTY''S TREASURY','gov','other'),
        ('MACCLESFIELD AND CONGLETON DISTRICT SCOUT COUNCIL (520227)','charity','other'),
        ('TRUST IN LEARNING (ACADEMIES)','education','school'),
        ('ISSA FOUNDATION','charity','trust'),
        ('SISTERS OF THE SACRED HEARTS OF JESUS AND MARY CIO','charity','trust'),
        ('BELMONT ABBEY GENERAL CIO','education','school'),
        ('LOUIS LAFOSSE EDUCATIONAL CIO','education','school'),
        ('W.P.L. COWLING & SONS','business','farm'),
        ('POLICE AND CRIME COMMISSIONER FOR DERBYSHIRE','gov','home_office'),
        ('ASPENS CHARITIES','charity','other'),
        ('VISTRY WATES (TENTERDEN) LLP','business','construction'),
        ('THE MILES AND HURMAN CHARITABLE INCORPORATED ORGANISATION','charity','trust'),
        ('THE BRIGSHAW LEARNING PARTNERSHIP','education','school'),
        ('CARE SOUTH','charity','other'),
        ('THE ASHA FOUNDATION','charity','trust'),
        ('FRIENDS OF THE ELDERLY','charity','other'),
        ('GREATER MANCHESTER WASTE DISPOSAL AUTHORITY','gov','other'),
        ('THE POLICE AND CRIME COMMISSIONER FOR LINCOLNSHIRE','gov','home_office'),
        ('SECRETARY  OF STATE FOR ENVIRONMENT FOOD AND RURAL AFFAIRS','gov','env_agnc'),
        ('D P MORGAN','business','farm'),
        ('THE ROYAL AGRICULTURAL SOCIETY OF ENGLAND','charity','trust'),
        ('LESLIE KENNEDY','business','farm'),
        ('G.R. WARD & CO','business','farm'),
        ('THE POLICE AND CRIME COMMISSIONER FOR HUMBERSIDE','gov','home_office'),
        ('ADVANCE LEARNING PARTNERSHIP','education','school'),
        ('THE WHITE HORSE FEDERATION','education','school'),
        ('RNN GROUP','business','investment'),
        ('E. S. TRIGGOL','business','farm'),
        ('THE UNITED REFORMED CHURCH EAST MIDLANDS SYNOD INCORPORATED','church','diocese'),
        ('LANCASHIRE COMBINED FIRE AUTHORITY','gov','home_office'),
        ('THE DIANA STARTIN FOUNDATION CIO','charity','trust'),
        ('E-ACT','education','school'),
        ('EMBERCOMBE','charity','other'),
        ('J.S. DAKIN AND COMPANY','business','farm'),
        ('THE CHILTERN SOCIETY','charity','other'),
        ('THE POLICE AND CRIME COMMISSIONER FOR GREATER MANCHESTER','gov','home_office'),
        ('W.G. RILEY & CO','business','farm'),
        ('KING''S GROUP ACADEMIES','education','school'),
        ('THE YORKSHIRE CONGREGATIONAL UNION (INCORPORATED)','church','diocese'),
        ('POLICE AND CRIME COMMISSIONER FOR DURHAM','gov','home_office'),
        ('CAMPDEN BRI (NUTFIELD)','business','industry'),
        ('THE POLICE AND CRIME COMMISSIONER FOR SUFFOLK','gov','home_office'),
        ('DANVM DRAINAGE COMMISSIONERS','gov','other'),
        ('THE UNITED REFORMED CHURCH (SOUTH WESTERN SYNOD) INCORPORATED','church','diocese'),
        ('THE GOVERNOR AND COMPANY OF THE BANK OF ENGLAND','gov','finance'),
        ('QEGSMAT','education','school'),
        ('THE BRITISH LIBRARY BOARD','gov','culture'),
        ('FATHER HUDSON''S SOCIETY','charity','trust'),
        ('T.C.CHEER','business','farm'),
        ('TURKEY','business','other'),
        ('NORTHERN IRELAND LOCAL GOVERNMENT OFFICERS'' SUPERANNUATION COMMITTEE','gov','other'),
        ('THE POLICE AND CRIME COMMISSIONER FOR NOTTINGHAMSHIRE','gov','home_office'),
        ('FRIENDS OF HOLLY HAYES WOOD','charity','other'),
        ('THE WESTERN CHARITABLE FOUNDATION','charity','trust'),
        ('THE MOOSE INTERNATIONAL WELFARE SERVICE FUND','charity','other'),
        ('NEW KADAMPA TRADITION - INTERNATIONAL KADAMPA BUDDHIST UNION','charity','other'),
        ('THE NATURIST FOUNDATION CIO','charity','other'),
        ('POLICE AND CRIME COMMISSIONER FOR SOUTH YORKSHIRE','gov','home_office'),
        ('R L JONES & SONS','business','farm'),
        ('WILDERNESS FOUNDATION UK','charity','other'),
        ('QUEEN ELIZABETH''S HOSPITAL','charity','trust'),
        ('STAFFORDSHIRE & BIRMINGHAM AGRICULTURAL SOCIETY','charity','trust'),
        ('POLICE AND CRIME COMMISSIONER FOR HERTFORDSHIRE','gov','home_office'),
        ('PAUL AND LOUISE COOKE ENDOWMENT','charity','trust'),
        ('PRIOR''S COURT FOUNDATION','charity','trust'),
        ('ANGUS BUCHANAN VC RECREATION GROUND','charity','other'),
        ('J J GRANT','business','farm'),
        ('LANIER THEOLOGICAL EDUCATION FOUNDATION','education','school'),
        ('HUMBER BRIDGE BOARD','gov','transport'),
        ('THE BRITISH BROADCASTING CORPORATION','gov','culture'),
        ('J. H. WILSON & SON','business','farm'),
        ('WHITEHAVEN HARBOUR COMMISSIONERS','gov','transport'),
        ('JLP SCOTTISH PARTNERSHIP','business','retail'),
        ('WEST MIDLANDS FIRE AND RESCUE AUTHORITY','gov','home_office'),
        ('CLARK FOUNDATION','charity','trust'),
        ('G.R.WARD & CO','business','farm'),
        ('BRITISH VETERINARY ASSOCIATION ANIMAL WELFARE FOUNDATION','charity','other'),
        ('WIMBLEDON AND PUTNEY COMMONS CONSERVATORS','gov','environment'),
        ('POLICE AND CRIME COMMISSIONER FOR MERSEYSIDE','gov','home_office'),
        ('THE NATIONAL AUTISTIC SOCIETY','charity','other'),
        ('HAMPSHIRE AND ISLE OF WIGHT FIRE AND RESCUE AUTHORITY','gov','home_office'),
        ('NEEDHAM TRINITY FOUNDATION','charity','trust'),
        ('JEWISH CARE','charity','other'),
        ('THE SPIRITUALISTS'' NATIONAL UNION','charity','other'),
        ('G R WARD AND CO','business','farm'),
        ('BLEAKHOLT ANIMAL SANCTUARY','charity','other'),
        ('SOMERSET WEST AND TAUNTON COUNCIL','gov','other'),
        ('WARDEN & FREEMEN OF MALMESBURY','charity','trust'),
        ('J W GRANT CO','business','farm'),
        ('LAND OF JOY','charity','other'),
        ('DOGS 4 RESCUE CIC','charity','other'),
        ('KENT AND MEDWAY TOWNS FIRE AUTHORITY','gov','home_office'),
        ('WOOD GREEN ANIMAL SHELTERS','charity','other'),
        ('COPYHOLD VERMOGENVERWALTUNGS-GMBH','business','other'),
        ('R G STRINGER & SON','business','farm'),
        ('THE LEAGUE AGAINST CRUEL SPORTS','charity','other'),
        ('OUTREACH 3-WAY','charity','other'),
        ('J & H WILSDON AGRICULTURE','business','farm'),
        ('JOSEPH ROWNTREE FOUNDATION','charity','trust'),
        ('THE SCOUT ASSOCIATION','charity','other'),
        ('HODGSON POULTRY','business','farm'),
        ('THE POLICE AND CRIME COMMISSIONER FOR DERBYSHIRE','gov','home_office'),
        ('ST ELIZABETH''S CENTRE','charity','other'),
        ('FUEL ALLOTMENT','charity','other'),
        ('WOLSINGHAM AND WEAR VALLEY AGRICULTURAL SOCIETY','charity','trust'),
        ('THE POLICE AND CRIME COMMISSIONER FOR CUMBRIA','gov','home_office'),
        ('THE WITHAM FIRST DISTRICT INTERNAL DRAINAGE BOARD','gov','other'),
        ('THE GOVERNING BODY OF THE PHOENIX COLLEGIATE','education','school'),
        ('WEST YORKSHIRE FIRE AND RESCUE AUTHORITY','gov','home_office'),
        ('NUFFIELD HEALTH','business','healthcare'),
        ('RIDING FOR THE DISABLED ASSOCIATION INCORPORATING CARRIAGE DRIVING','charity','other'),
        ('L M MINERALS','business','industry'),
        ('EDUCATION SOUTH WEST','education','school'),
        ('THE JOHN STRUTT MEMORIAL FOUNDATION','charity','trust'),
        ('THE SECRETARY OF  STATE FOR TRANSPORT','gov','transport'),
        ('HENLEY ROYAL REGATTA','charity','other'),
        ('THE GOVERNORS OF THE EDUCATIONAL FOUNDATION OF DR ROBERT OLDFIELD','education','school'),
        ('HEREFORDSHIRE RIDING FOR THE DISABLED','charity','other'),
        ('OASIS COMMUNITY LEARNING','education','school')
) AS m(proprietor_name_1, cat, subcat)
WHERE t.proprietor_name_1 = m.proprietor_name_1;

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = m.cat,
    subcat = m.subcat
FROM (
    VALUES
        ('YORK ST JOHN ENDOWMENT','education','trust'),
        ('CAMBRIDGESHIRE AND PETERBOROUGH FIRE AUTHORITY','gov','home_office'),
        ('WHARFEBANK','business','farm'),
        ('BRISTOL CITY ROBINS FOUNDATION','charity','trust'),
        ('A.W.L.N. FOALS AND HORSES SANCTUARY','charity','other'),
        ('CLEVELAND FIRE AUTHORITY','gov','home_office'),
        ('LAST CHANCE ANIMAL RESCUE','charity','other'),
        ('AVON FIRE AUTHORITY','gov','home_office'),
        ('FRIENDS OF WYCHWOOD','charity','other'),
        ('HINCHLEY WOOD LEARNING PARTNERSHIP','education','school'),
        ('BMAT EDUCATION','education','school'),
        ('SID VALE ASSOCIATION CIO','charity','trust'),
        ('THE ARTS COUNCIL OF ENGLAND','gov','culture'),
        ('GROUNDWORK NORTH EAST','charity','other'),
        ('THE SONS OF DIVINE PROVIDENCE','charity','trust'),
        ('THE COUNTY DURHAM AND DARLINGTON FIRE AND RESCUE AUTHORITY','gov','home_office'),
        ('THE MASTER AND KEEPERS OR WARDENS AND COMMONALTY OF THE MYSTERY OR ART OF BREWERS OF THE CITY OF LONDON','charity','trust'),
        ('NORTH HAMPSHIRE EDUCATION ALLIANCE','education','school'),
        ('THE GOLBORNE AND LOWTON CO-OPERATIVE LEARNING PARTNERSHIP','education','school'),
        ('TRINITY CHURCH, BRENTWOOD','church','diocese'),
        ('THE DENBIGH ALLIANCE','education','school'),
        ('TATTON GARDEN SOCIETY','charity','other'),
        ('R.B.M. ESTABLISHMENT','business','industry'),
        ('TEACH POOLE','education','school'),
        ('BARNARDO''S','charity','trust'),
        ('THE POLICE AND CRIME COMMISSIONER FOR MERSEYSIDE','gov','home_office'),
        ('WEST HADDON CHARITIES','charity','trust'),
        ('OKEHAMPTON AND DISTRICT AGRICULTURAL ASSOCIATION','charity','trust'),
        ('THE BOWES MUSEUM','charity','other')
) AS m(proprietor_name_1, cat, subcat)
WHERE t.proprietor_name_1 = m.proprietor_name_1;

```sql
UPDATE ccod_ocod_2025_09 AS t
SET cat = m.cat,
    subcat = m.subcat
FROM (
    VALUES
        ('THE SOCIETY OF LICENSED VICTUALLERS','charity','other'),
        ('THE POLICE AND CRIME COMMISSIONER FOR WILTSHIRE','gov','home_office'),
        ('GRITH PIONEERS','charity','other'),
        ('THE WARDENS AND COMMONALTY OF THE MISTERY OF DYERS OF THE CITY OF LONDON','charity','trust'),
        ('ALLIED FINANCE S.A.','business','finance'),
        ('TUN ABDUL RAZAK RESEARCH CENTRE','education','research'),
        ('ASHGATE HOSPICECARE','charity','other'),
        ('FRIENDS OF OAKFRITH WOOD','charity','other'),
        ('NATIONAL PLAYING FIELDS ASSOCIATION','charity','trust'),
        ('CUMNOR HURST','charity','other'),
        ('THE POLICE AND CRIME COMMISSIONER FOR STAFFORDSHIRE','gov','home_office'),
        ('TWINBERROW FOUNDATION','charity','trust'),
        ('THE PLAISTER CHARITABLE FOUNDATION','charity','trust'),
        ('GOODMAN LOGISTICS LEICESTER (GP) LLP','business','logistics'),
        ('PORTWAY COMMUNITY RUGBY','charity','other'),
        ('BOSWORTH ACADEMY','education','school'),
        ('CHESHIRE FIRE AUTHORITY','gov','home_office'),
        ('SUSSEX ARCHAEOLOGICAL SOCIETY','charity','other'),
        ('DRIFFIELD AGRICULTURAL SOCIETY','charity','trust'),
        ('SUE RYDER','charity','trust'),
        ('HARPUR CREWE LIMITED LIABILITY COMPANY','business','industry'),
        ('BARROW MEADOWLANDS LLP','business','property'),
        ('THE MASTER WARDENS AND COMMONALTY OF THE MYSTERY OF TALLOW CHANDLERS OF THE CITY OF LONDON','charity','trust'),
        ('FRIENDS OF KINSBOURNE GREEN COMMON','charity','other'),
        ('CANINE PARTNERS FOR INDEPENDENCE','charity','other'),
        ('THE RESERVE FORCES AND CADETS ASSOCIATION FOR THE NORTH WEST OF ENGLAND AND THE ISLE OF MAN','gov','defence'),
        ('GREENCORE CONVENIENCE FOODS LIMITED PARTNERSHIP','business','food'),
        ('W D SMITH & SON','business','industry'),
        ('THE COUNCIL OF THE BOROUGH OF TORBAY','gov','local_authority'),
        ('PETROC','education','college'),
        ('THE POLICE FIRE AND CRIME COMMISSIONER FOR ESSEX','gov','home_office'),
        ('DEVON & SOMERSET FIRE AND RESCUE AUTHORITY','gov','home_office'),
        ('GLASTONBURY ABBEY','charity','other'),
        ('ACF SEVENOAKS','education','school'),
        ('THE BACTON COMPANY','business','industry'),
        ('PRIMITAS LEARNING PARTNERSHIP','education','school'),
        ('ISLE OF WIGHT FRESHWATER ANGLING COMPANY','charity','other'),
        ('THE WARDENS AND COMMONALTY OF THE MISTERY OF GROCERS OF THE CITY OF LONDON','charity','trust'),
        ('H G HEATH & SONS LLP','business','industry'),
        ('MODERN PLANT HIRE RETIREMENT SCHEME','business','industry'),
        ('STOKE-ON-TRENT AND STAFFORDSHIRE FIRE AUTHORITY','gov','home_office'),
        ('SOUTH TYNEDALE RAILWAY PRESERVATION SOCIETY','charity','other'),
        ('MIKRON ETABLISSEMENT DE FINANCE ET GERANCE','business','finance'),
        ('THE POLICE AND CRIME COMMISSIONER FOR CHESHIRE','gov','home_office'),
        ('HILL HOLT WOOD','charity','other'),
        ('THE POLICE AND CRIME COMMISSIONER FOR GLOUCESTERSHIRE','gov','home_office'),
        ('PLUMTON HALL SSAS','education','school'),
        ('PARTNERSHIP LEARNING','education','school'),
        ('THE WIMBLEDON AND PUTNEY COMMONS CONSERVATORS','charity','other'),
        ('POLICE AND CRIME COMMISSIONER FOR BEDFORDSHIRE','gov','home_office'),
        ('FRIENDS OF THE LOWER DERWENT VALLEY CONSERVATION GROUP','charity','other'),
        ('LINDSEY MARSH DRAINAGE BOARD','gov','local_authority'),
        ('THE COMMONWEALTH WAR GRAVES COMMISSION','charity','trust'),
        ('MIRZA SHARIF AHMAD FOUNDATION','charity','trust'),
        ('J.G. LITHERLAND (RHUBARB)','business','farm'),
        ('INSPIRE EDUCATION GROUP','education','school'),
        ('NORFOLK COMMUNITY FOUNDATION','charity','trust'),
        ('THE MASTER AND WARDENS OF THE MERCHANT TAYLORS OF THE FRATERNITY OF ST. JOHN BAPTIST IN THE CITY OF LONDON','charity','trust'),
        ('THE CORPORATION OF TRINITY HOUSE OF DEPTFORD STROND','charity','trust'),
        ('CREATIVE YOUTH NETWORK','charity','other'),
        ('THE COMPANY OF PROPRIETORS OF THE STROUDWATER NAVIGATION','charity','other'),
        ('ROYAL NATIONAL LIFEBOAT INSTITUTION','charity','trust'),
        ('THE SOCIETY FOR HORTICULTURAL THERAPY','charity','other'),
        ('THE ALEC REED ACADEMY','education','school'),
        ('PEAT''S EDUCATIONAL FOUNDATION','charity','trust'),
        ('ST CUTHBERT''S HOSPICE DURHAM','charity','other'),
        ('MARKET WEIGHTON UNITED CHARITIES','charity','trust'),
        ('THE MOSSBOURNE FEDERATION','education','school'),
        ('MIDDLE LEVEL COMMISSIONERS','gov','local_authority'),
        ('HEMPSTEAD VALLEY LLP','business','property'),
        ('THE MASTERS AND WARDENS OF THE MERCHANT TAYLORS OF THE FRATERNITY OF ST. JOHN BAPTIST IN THE CITY OF LONDON','charity','trust'),
        ('MARKET DRAYTON LEARNING PARTNERSHIP','education','school'),
        ('CASTLETOWN TRST LLP','charity','trust'),
        ('REMAR ASSOCIATION (UK)','charity','other'),
        ('BRUNELCARE','charity','other'),
        ('THE WHITE EAGLE LODGE','charity','other'),
        ('POLICE AND CRIME COMMISSIONER FOR LEICESTERSHIRE','gov','home_office'),
        ('THE PASSMORES CO-OPERATIVE LEARNING COMMUNITY','education','school'),
        ('CRANE''S NEST','charity','other'),
        ('J V LLOYD','charity','other'),
        ('MARTIN HOUSE','charity','other'),
        ('ST ANDREW''S HEALTHCARE','charity','other'),
        ('TRENT VALLEY INTERNAL DRAINAGE BOARD','gov','local_authority'),
        ('THE WELDING INSTITUTE','education','research'),
        ('UNDERLEY EDUCATIONAL SERVICES','education','school'),
        ('FAVERSHAM OYSTER FISHERY COMPANY','business','food'),
        ('SWEETSTYLE & CO','business','food'),
        ('BRITTEN PEARS ARTS','charity','other'),
        ('POLICE AND CRIME COMMISSIONER FOR NORTHAMPTONSHIRE','gov','home_office'),
        ('THE CANTERBURY ACADEMY','education','school'),
        ('THE YORKSHIRE AGRICULTURAL SOCIETY','charity','trust'),
        ('THE POLICE AND CRIME COMMISSIONER FOR CAMBRIDGESHIRE','gov','home_office'),
        ('THE MASTER AND GOVERNORS OF THE HOSPITAL OF CHRIST OF ABINGDON','charity','trust'),
        ('THE MASTER AND BRETHREN OF THE HOSPITAL OF GOD IN GREATHAM','charity','trust'),
        ('ST JOHN''S WINCHESTER','education','school'),
        ('ALTUS EDUCATION PARTNERSHIP','education','school'),
        ('HULL AND DISTRICT ANGLERS ASSOCIATION','charity','other'),
        ('THE JOHN COCKERTON FOUNDATION','charity','trust'),
        ('DORSET AND WILTSHIRE FIRE AND RESCUE AUTHORITY','gov','home_office'),
        ('THE FRIENDS OF STARA WOODS','charity','other'),
        ('GROUNDWORK GREATER MANCHESTER','charity','other'),
        ('ACTION FOR CHILDREN','charity','trust'),
        ('QINETIQ PFP LIMITED PARTNERSHIP','business','industry'),
        ('TEC PARTNERSHIP','education','school'),
        ('THE BIRMINGHAM BOYS AND GIRLS UNION','charity','other'),
        ('G.R.WARD & CO.','business','industry'),
        ('11 ARCHES','charity','other'),
        ('EXCELSIOR ACADEMY NEWCASTLE','education','school'),
        ('THE GREATER MANCHESTER WASTE DISPOSAL AUTHORITY','gov','local_authority'),
        ('AUTHENTIC EDUCATION GROUP LIMITED','education','school'),
        ('SIR ROBERT PATTINSON ACADEMY','education','school'),
        ('THE OFFICIAL CUSTODIAN','charity','trust'),
        ('TARKA LEARNING PARTNERSHIP','education','school'),
        ('GILBERT WHITE & THE OATES COLLECTIONS','charity','other'),
        ('NUGENT CARE 2019','charity','other'),
        ('LIVABILITY','charity','other'),
        ('WISBECH EDUCATIONAL FOUNDATION','education','school'),
        ('SOUTH EAST RESERVE FORCES AND CADETS ASSOCIATION','gov','defence'),
        ('GOODMAN LOGISTICS DARTFORD 2 (GP) LLP','business','logistics'),
        ('ASHMOLE ACADEMY','education','school'),
        ('GREATER MANCHESTER FIRE AND RESCUE AUTHORITY','gov','home_office'),
        ('STROUD DISTRICT COUNCIL','gov','local_authority'),
        ('R A DALLYN & SONS','business','industry'),
        ('FUTURA LEARNING PARTNERSHIP','education','school'),
        ('T C CHEER COMPANY','business','industry'),
        ('BOLENOWE ANIMAL SANCTUARY','charity','other'),
        ('THE NATIONAL STONE CENTRE','charity','other'),
        ('R.FOUNTAIN & SON','business','industry'),
        ('HUMBERSIDE FIRE AUTHORITY','gov','home_office'),
        ('LUTON BOROUGH COUNCIL','gov','local_authority'),
        ('GRIMSBY INSTITUTE OF FURTHER & HIGHER EDUCATION','education','college'),
        ('KNAUF UK GMBH','business','industry'),
        ('FARRINGDON SCOTTISH PARTNERSHIP','education','school'),
        ('JTL','education','school'),
        ('THE AMBER FOUNDATION','charity','other'),
        ('THE OFFICE OF THE POLICE AND CRIME COMMISSIONER FOR HAMPSHIRE AND THE ISLE OF WIGHT','gov','home_office'),
        ('THE FALLIBROOME ACADEMY','education','school'),
        ('THE CORNWALL COUNCIL','gov','local_authority'),
        ('WITNEY EDUCATIONAL FOUNDATION','education','school'),
        ('KINGSWAY INTERNATIONAL CHRISTIAN CENTRE','church','denomination'),
        ('LEE ABBEY FELLOWSHIP','charity','other'),
        ('E.W. PORTER & SON','business','industry'),
        ('THE CHIPSTEAD VILLAGE PRESERVATION SOCIETY','charity','other'),
        ('P A BOOTH AND CO','business','industry'),
        ('THE KOSMON SANCTUARY','charity','other'),
        ('BRIDGWATER YOUNG MEN''S CHRISTIAN ASSOCIATION','charity','other'),
        ('THE CONGREGATION OF THE DAUGHTERS OF THE CROSS OF LIEGE','church','order'),
        ('THE COUNTY CLERK AND CHIEF EXECUTIVE','gov','local_authority'),
        ('HILLSIDE RURAL ACTIVITIES PARK','charity','other'),
        ('THE MUTTS NUTTS RESCUE','charity','other'),
        ('SURREY HEATH BOROUGH COUNCIL','gov','local_authority'),
        ('A & N FOTHERGILL & SONS','business','industry'),
        ('THE CONSERVATORS OF THE RIVER CAM','charity','other'),
        ('THE VARRIER-JONES FOUNDATION','charity','trust'),
        ('THE WKCIC GROUP','business','industry'),
        ('GREY GR LIMITED PARTNERSHIP','business','industry'),
        ('THE MASTER WARDENS AND ASSISTANTS OF THE GUILD FRATERNITY OR BROTHERHOOD OF THE MOST GLORIOUS AND UNDIVIDED TRINITY AND OF ST CLEMENT IN THE PARISH OF DEPTFORD STROND IN THE COUNTY OF KENT','charity','trust'),
        ('RGS AND LANESBOROUGH','education','school'),
        ('THE BRIDLINGTON HARBOUR COMMISSIONERS','gov','local_authority'),
        ('THE WHITWORTH CENTRE','charity','other'),
        ('BOX COMMUNITY WOOD','charity','other'),
        ('URSULINE SISTERS BRENTWOOD CIO','church','order'),
        ('NCG','education','school'),
        ('THE CORPORATION OF THE TRINITY HOUSE OF DEPTFORD STROND','charity','trust'),
        ('WICKENBY AERODROME LLP (OC315887)','business','industry'),
        ('HEART OF MERCIA','charity','other'),
        ('J&K LIVERY','business','industry'),
        ('QUARRYDALE ACADEMY','education','school'),
        ('THE INSTITUTE OF CANCER RESEARCH: ROYAL CANCER HOSPITAL','education','research'),
        ('VENNER LLOYD S.A.','business','finance'),
        ('GESELLSCHAFT FUR HANDEL UND BETRIEBSSTUDIUM','education','school'),
        ('THE SID VALE ASSOCIATION CIO','charity','trust'),
        ('L W HALL & SON','business','industry'),
        ('WYM NINE LLC','business','industry'),
        ('LONGHORSLEY MISSION FREE CHURCH','church','denomination'),
        ('WEST LONDON WASTE AUTHORITY','gov','local_authority'),
        ('SOUTH YORKSHIRE FIRE AND RESCUE AUTHORITY','gov','home_office'),
        ('MUNICIPAL CHARITIES OF FAVERSHAM','charity','trust'),
        ('ZAPLINE TRADING SA','business','finance'),
        ('MOLKEREI ALOIS MULLER GMBH','business','industry'),
        ('JOHN TAYLOR MAT','business','industry'),
        ('HEREFORD AND WORCESTER FIRE AUTHORITY','gov','home_office'),
        ('THE BROADS (2006) INTERNAL DRAINAGE BOARD','gov','local_authority'),
        ('LILIAN FAITHFULL CARE','charity','other'),
        ('THE ARCHBISHOPS'' COUNCIL','church','denomination'),
        ('SCOPE','charity','trust'),
        ('GFM EDUCATION','education','school'),
        ('WAVENEY, LOWER YARE, AND LOTHINGLAND INTERNAL DRAINAGE BOARD','gov','local_authority'),
        ('HARWICH HARBOUR AUTHORITY','gov','local_authority'),
        ('NETHERHALL EDUCATIONAL ASSOCIATION','education','school'),
        ('W BENNETT & SONS','business','industry'),
        ('KESTREL RIDGE LLP','business','property'),
        ('THE REDHILL ACADEMY','education','school'),
        ('ST JOHN AMBULANCE','charity','trust'),
        ('THE BISHOP''S FORUM','church','diocese'),
        ('LOVE HAMBROOK MARSHES CIO','charity','other'),
        ('ASHOVER AGRICULTURAL AND HORTICULTURAL SOCIETY','charity','trust'),
        ('MARS PETCARE UK','business','food'),
        ('HEART OF YORKSHIRE EDUCATION GROUP','education','school'),
        ('CUMBRIA SPORTS ACADEMY','education','school')
) AS m(proprietor_name_1, cat, subcat)
WHERE t.proprietor_name_1 = m.proprietor_name_1;
//NOT USED...
name,cat,subcat
THE GUIDE DOGS FOR THE BLIND ASSOCIATION,charity,other
LEYBOURNE GRANGE MANAGEMENT COMMUNITY INTEREST COMPANY,education,trust
POOLE HARBOUR COMMISSIONERS,gov,other
TEES VALLEY COMMUNITY FOUNDATION,charity,other
J E PICCAVER AND CO (GEDNEY MARSH),business,other
SCANTLEBURY MANWOOD,uncertain,uncertain
THE MORAVIAN UNION (INCORPORATED),church,other
AHIMSA DAIRY FOUNDATION,charity,trust
ADVENTURE PLUS,charity,other
WORLD TAMILS HISTORICAL SOCIETY,charity,other
THE ALDENHAM FOUNDATION,charity,trust
WITHAM FIRST DISTRICT INTERNAL DRAINAGE BOARD,gov,env_agnc
FIELD STUDIES COUNCIL,education,trust
NATIONAL RIFLE ASSOCIATION,club,sport
THE DOVER HARBOUR BOARD,gov,other
FEATHERSTONE INC,business,other
THE OFFICIAL CUSTODIAN OF CHARITIES,charity,trust
STOLKIN & CLEMENTS (SOUTHEND) LLP,business,other
MOUNT ST MARY'S,education,school
THE UNITED WESTMINSTER AND GREY COAT FOUNDATION,education,trust
WEST MERCIA POLICE AUTHORITY,gov,home_office
THE TERRITORIAL AUXILIARY AND VOLUNTEER RESERVE ASSOCIATION FOR THE NORTH OF ENGLAND,gov,defence
THREE COUNTIES AGRICULTURAL SOCIETY,charity,other
CRANLEIGH AND SOUTH EASTERN AGRICULTURAL SOCIETY,charity,other
THE NEWBURY AND DISTRICT AGRICULTURAL SOCIETY,charity,other
THE POLICE AND CRIME COMMISSIONER FOR KENT,gov,home_office
NORTH OF ENGLAND ZOOLOGICAL SOCIETY,charity,royal_soc
THE GUILD OF ST GEORGE,charity,trust
BERKSWELL CHARITIES,charity,trust
SUSSEX POLICE AUTHORITY,gov,home_office
THE NORTH EAST AUTISM SOCIETY,charity,other
THE THAME AND OXFORDSHIRE COUNTY AGRICULTURAL ASSOCIATION,charity,other
J.J. GRANT,business,other
THE SCARGILL MOVEMENT,charity,other
CARING FOR LIFE,charity,other
POLICE AND CRIME COMMISSIONER FOR NORTHUMBRIA,gov,home_office
J G LITHERLAND (RHUBARB),business,other
BLACK SLUICE INTERNAL DRAINAGE BOARD,gov,env_agnc
J J GRANT COMPANY,business,other
CABOT LEARNING FEDERATION,education,trust
POLICE AND CRIME COMMISSIONER FOR WEST MIDLANDS,gov,home_office
ST GEORGE'S WEYBRIDGE,education,school
THE REEDNESS AND SWINEFLEET DRAINAGE BOARD,gov,env_agnc
GREATER MANCHESTER COMBINED AUTHORITY,LA,mayor
W.D. SMITH & SON,business,other
SHROPSHIRE ORNITHOLOGICAL SOCIETY 2005,charity,other
UPPER WITHAM INTERNAL DRAINAGE BOARD,gov,env_agnc
POLICE AND CRIME COMMISSIONER FOR SURREY,gov,home_office
J.W.GRANT,business,other
GENERAL CEMETERY COMPANY,charity,other
EDUCATION FOR THE 21ST CENTURY,education,trust
THE GUTTRIDGE FAMILY FOUNDATION,charity,trust
CHARTERED ACCOUNTANTS' BENEVOLENT ASSOCIATION,charity,trust
THE PRINCETHORPE FOUNDATION,education,trust
LITTLE OUSE HEADWATERS PROJECT,charity,other
THE OFFICIAL CUSTODIAN CHARITIES,charity,trust
ZAPLINE TRADING S A,business,other
HORSES AND PONIES PROTECTION ASSOCIATION,charity,other
THE HOSPITAL OF THE HOLY AND UNDIVIDED TRINITY,church,other
ASTON-MANSFIELD,business,other
DEVON & CORNWALL POLICE AUTHORITY,gov,home_office
LONDON FIRE COMMISSIONER,gov,home_office
PROTECT EARTH,charity,other
CHRISTIAN VISION,church,other
DENTONS SIPP AJ MANSFIELD CA22260,business,finance
THE HINCHINGBROOKE FOUNDATION CIO,charity,trust
CENTRE MINISTRIES,church,other
EASTERN LEARNING ALLIANCE,education,trust
THE POLICE AND CRIME COMMISSIONER FOR NORFOLK,gov,home_office
DONCASTER EAST INTERNAL DRAINAGE BOARD,gov,env_agnc
ST JOHN'S SEMINARY CIO,church,other
FOXIE'S FUTURE,charity,other
WREKIN TURF GROWERS,business,other
KIPLIN HALL CIO,education,trust
RED TREE (2004) LLP,business,other
WORLD HABITAT,charity,other
ANGLO BEEF PROCESSORS UK,business,industry
TREE AID,charity,other
THE ROYAL MASONIC BENEVOLENT INSTITUTION CARE COMPANY,charity,trust
GARDENS OF PEACE MUSLIM CEMETERY,charity,other
THE BOURN LLP,business,other
THE SOLICITOR FOR THE AFFAIRS OF HER MAJESTY'S TREASURY,gov,finance
MACCLESFIELD AND CONGLETON DISTRICT SCOUT COUNCIL (520227),club,other
TRUST IN LEARNING (ACADEMIES),education,trust
ISSA FOUNDATION,charity,trust
SISTERS OF THE SACRED HEARTS OF JESUS AND MARY CIO,church,other
BELMONT ABBEY GENERAL CIO,church,other
LOUIS LAFOSSE EDUCATIONAL CIO,education,trust
W.P.L. COWLING & SONS,business,other
POLICE AND CRIME COMMISSIONER FOR DERBYSHIRE,gov,home_office
ASPENS CHARITIES,charity,trust
VISTRY WATES (TENTERDEN) LLP,business,construction
THE MILES AND HURMAN CHARITABLE INCORPORATED ORGANISATION,charity,trust
THE BRIGSHAW LEARNING PARTNERSHIP,education,trust
CARE SOUTH,charity,other
THE ASHA FOUNDATION,charity,trust
FRIENDS OF THE ELDERLY,charity,other
GREATER MANCHESTER WASTE DISPOSAL AUTHORITY,gov,env_agnc
THE POLICE AND CRIME COMMISSIONER FOR LINCOLNSHIRE,gov,home_office
SECRETARY  OF STATE FOR ENVIRONMENT FOOD AND RURAL AFFAIRS,gov,environment
D P MORGAN,business,other
THE ROYAL AGRICULTURAL SOCIETY OF ENGLAND,charity,other
LESLIE KENNEDY,business,other
G.R. WARD & CO,business,other
THE POLICE AND CRIME COMMISSIONER FOR HUMBERSIDE,gov,home_office
ADVANCE LEARNING PARTNERSHIP,education,trust
THE WHITE HORSE FEDERATION,education,trust
RNN GROUP,business,other
E. S. TRIGGOL,business,other
THE UNITED REFORMED CHURCH EAST MIDLANDS SYNOD INCORPORATED,church,other
LANCASHIRE COMBINED FIRE AUTHORITY,gov,home_office
THE DIANA STARTIN FOUNDATION CIO,charity,trust
E-ACT,education,trust
EMBERCOMBE,charity,other
J.S. DAKIN AND COMPANY,business,other
THE CHILTERN SOCIETY,charity,other
THE POLICE AND CRIME COMMISSIONER FOR GREATER MANCHESTER,gov,home_office
W.G. RILEY & CO,business,other
KING'S GROUP ACADEMIES,education,trust
THE YORKSHIRE CONGREGATIONAL UNION (INCORPORATED),church,other
POLICE AND CRIME COMMISSIONER FOR DURHAM,gov,home_office
CAMPDEN BRI (NUTFIELD),business,other
THE POLICE AND CRIME COMMISSIONER FOR SUFFOLK,gov,home_office
DANVM DRAINAGE COMMISSIONERS,gov,env_agnc
THE UNITED REFORMED CHURCH (SOUTH WESTERN SYNOD) INCORPORATED,church,other
THE GOVERNOR AND COMPANY OF THE BANK OF ENGLAND,gov,finance
QEGSMAT,education,trust
THE BRITISH LIBRARY BOARD,crown,majesty
FATHER HUDSON'S SOCIETY,charity,trust
T.C.CHEER,business,other
TURKEY,uncertain,uncertain
NORTHERN IRELAND LOCAL GOVERNMENT OFFICERS' SUPERANNUATION COMMITTEE,LA,county
THE POLICE AND CRIME COMMISSIONER FOR NOTTINGHAMSHIRE,gov,home_office
FRIENDS OF HOLLY HAYES WOOD,charity,other
THE WESTERN CHARITABLE FOUNDATION,charity,trust
THE MOOSE INTERNATIONAL WELFARE SERVICE FUND,charity,trust
NEW KADAMPA TRADITION - INTERNATIONAL KADAMPA BUDDHIST UNION,church,other
THE NATURIST FOUNDATION CIO,charity,other
POLICE AND CRIME COMMISSIONER FOR SOUTH YORKSHIRE,gov,home_office
R L JONES & SONS,business,other
WILDERNESS FOUNDATION UK,charity,other
QUEEN ELIZABETH'S HOSPITAL,education,school
STAFFORDSHIRE & BIRMINGHAM AGRICULTURAL SOCIETY,charity,other
POLICE AND CRIME COMMISSIONER FOR HERTFORDSHIRE,gov,home_office
PAUL AND LOUISE COOKE ENDOWMENT,charity,trust
PRIOR'S COURT FOUNDATION,charity,trust
ANGUS BUCHANAN VC RECREATION GROUND,charity,other
J J GRANT,business,other
LANIER THEOLOGICAL EDUCATION FOUNDATION,education,trust
HUMBER BRIDGE BOARD,gov,other
THE BRITISH BROADCASTING CORPORATION,crown,majesty
J. H. WILSON & SON,business,other
WHITEHAVEN HARBOUR COMMISSIONERS,gov,other
JLP SCOTTISH PARTNERSHIP,business,other
WEST MIDLANDS FIRE AND RESCUE AUTHORITY,gov,home_office
CLARK FOUNDATION,charity,trust
G.R.WARD & CO,business,other
BRITISH VETERINARY ASSOCIATION ANIMAL WELFARE FOUNDATION,charity,trust
WIMBLEDON AND PUTNEY COMMONS CONSERVATORS,charity,other
POLICE AND CRIME COMMISSIONER FOR MERSEYSIDE,gov,home_office
THE NATIONAL AUTISTIC SOCIETY,charity,other
HAMPSHIRE AND ISLE OF WIGHT FIRE AND RESCUE AUTHORITY,gov,home_office
NEEDHAM TRINITY FOUNDATION,charity,trust
JEWISH CARE,charity,trust
THE SPIRITUALISTS' NATIONAL UNION,church,other
G R WARD AND CO,business,other
BLEAKHOLT ANIMAL SANCTUARY,charity,other
SOMERSET WEST AND TAUNTON COUNCIL,LA,mayor
WARDEN & FREEMEN OF MALMESBURY,charity,trust
J W GRANT CO,business,other
LAND OF JOY,charity,other
DOGS 4 RESCUE CIC,charity,other
KENT AND MEDWAY TOWNS FIRE AUTHORITY,gov,home_office
WOOD GREEN ANIMAL SHELTERS,charity,other
COPYHOLD VERMOGENVERWALTUNGS-GMBH,business,other
R G STRINGER & SON,business,other
THE LEAGUE AGAINST CRUEL SPORTS,charity,other
OUTREACH 3-WAY,charity,other
J & H WILSDON AGRICULTURE,business,other
JOSEPH ROWNTREE FOUNDATION,charity,trust
THE SCOUT ASSOCIATION,club,other
HODGSON POULTRY,business,other
THE POLICE AND CRIME COMMISSIONER FOR DERBYSHIRE,gov,home_office
ST ELIZABETH'S CENTRE,charity,other
FUEL ALLOTMENT,charity,other
WOLSINGHAM AND WEAR VALLEY AGRICULTURAL SOCIETY,charity,other
THE POLICE AND CRIME COMMISSIONER FOR CUMBRIA,gov,home_office
THE WITHAM FIRST DISTRICT INTERNAL DRAINAGE BOARD,gov,env_agnc
THE GOVERNING BODY OF THE PHOENIX COLLEGIATE,education,school
WEST YORKSHIRE FIRE AND RESCUE AUTHORITY,gov,home_office
NUFFIELD HEALTH,business,healthcare
RIDING FOR THE DISABLED ASSOCIATION INCORPORATING CARRIAGE DRIVING,charity,other
L M MINERALS,business,extraction
EDUCATION SOUTH WEST,education,trust
THE JOHN STRUTT MEMORIAL FOUNDATION,charity,trust
THE SECRETARY OF  STATE FOR TRANSPORT,gov,transport
HENLEY ROYAL REGATTA,club,sport
THE GOVERNORS OF THE EDUCATIONAL FOUNDATION OF DR ROBERT OLDFIELD,education,trust
HEREFORDSHIRE RIDING FOR THE DISABLED,charity,other
OASIS COMMUNITY LEARNING,education,trust

```sql
SELECT proprietor_name_1, cat, subcat
FROM ccod_ocod_2025_09
ORDER BY RANDOM()
LIMIT 100;
"proprietor_name_1","cat","subcat"
NETWORK RAIL INFRASTRUCTURE LIMITED,infra,all
WESTERN POWER DISTRIBUTION (EAST MIDLANDS) PLC,infra,all
SOVEREIGN NETWORK GROUP,business,housing
HANOVER PLACE PROPERTIES LIMITED,business,investment
BRYANT HOMES CENTRAL LIMITED,business,housing
CANNOCK CHASE DISTRICT COUNCIL,LA,district
THE COUNCIL OF THE CITY OF COVENTRY,LA,district
LARTON LIVERY LIMITED,business,smll_prtflio
CITY OF DONCASTER COUNCIL,LA,district
COLIN COURT (STREATHAM) LIMITED,business,other
ATLAS SCAFFOLDING LIMITED,business,single_prop
POLGRADE LIMITED,business,single_prop
CULLUM DETUNERS LIMITED,business,estate
WEAVER VALE HOUSING TRUST LIMITED,business,housing
A & P PROPERTY SOLUTIONS LIMITED,business,investment
THE COUNCIL OF THE CITY OF SUNDERLAND,LA,district
BOLTON AT HOME LIMITED,business,housing
WIRRAL BOROUGH COUNCIL,LA,district
THE NATIONAL TRUST FOR PLACES OF HISTORIC INTEREST OR NATURAL BEAUTY,charity,ntnl_trst
GREENFINCHES PROPERTY INVESTMENTS LTD,business,investment
HEXAGON HOUSING ASSOCIATION LIMITED,business,housing
OXFORD AVIATION LIMITED,business,smll_prtflio
RRM (CHELT) INVESTMENT LTD,business,investment
EMH HOUSING AND REGENERATION LIMITED,business,housing
STARCREST DEVELOPMENTS LIMITED,business,housing
A2DOMINION HOMES LIMITED,business,housing
NATIONAL HIGHWAYS LIMITED,infra,all
LONDON POWER NETWORKS PLC,infra,all
BROMPTON BROW FARMS LIMITED,business,farm
N A P INVESTMENTS LIMITED,business,investment
STONEWATER (5) LIMITED,business,housing
FLEDGLINGS LIMITED,business,smll_prtflio
PICKHILL INVESTMENTS LIMITED,business,investment
TRUSTEES OF THE HIGHGATE CIRCUIT METHODIST MINISTERS HOUSES,church,other
CHASE MIDLAND PLC,business,other
HYDE HOUSING ASSOCIATION LIMITED,business,housing
MILTON KEYNES CITY COUNCIL,LA,district
SOHA HOUSING LIMITED,business,housing
MOUNT EDEN LAND LIMITED,business,ownership_co
DEVON WILDLIFE TRUST LIMITED,charity,trust
SIMON DEVELOPMENTS LIMITED,business,housing
THE CITY COUNCIL OF BRISTOL,LA,district
ROPEMAKER PROPERTIES LIMITED,business,investment
LEEDS CITY COUNCIL,LA,district
STAFFORDSHIRE COUNTY COUNCIL,LA,district
R T RENTALS LIMITED,business,other
MASON WILLS LIMITED,business,smll_prtflio
THE BOROUGH COUNCIL OF NEWCASTLE-UNDER-LYME,LA,district
THE NORFOLK COUNTY COUNCIL,LA,county
SOUTH EASTERN POWER NETWORKS PLC,infra,all
NOTTING HILL COMMUNITY HOUSING LIMITED,business,housing
JAMES HAY PENSION TRUSTEES LIMITED,business,investment
IDEAL HOMES LIMITED,business,housing
CHIME PROPERTIES LIMITED,business,investment
MIDLAND HEART LIMITED,business,housing
ROSETON LIMITED,business,single_prop
ASTON STUDENT PROPERTIES LIMITED,business,investment
SAGE HOMES RP LIMITED,business,housing
AMPLIUS LIVING,business,housing
SANCTUARY HOUSING ASSOCIATION,business,housing
GREENSQUAREACCORD LIMITED,business,housing
HIGHTEX (UK) LIMITED,business,smll_prtflio
WOLDINGHAM SCHOOL,education,school
OXFORDSHIRE COUNTY COUNCIL,LA,county
HIGHTOWN PRAETORIAN AND CHURCHES HOUSING ASSOCIATION LIMITED,business,housing
"11/12 BROAD OAK LIMITED",business,single_prop
THE MAYOR AND BURGESSES OF THE LONDON BOROUGH OF HAMMERSMITH AND FULHAM,LA,district
NATIONAL HIGHWAYS LIMITED,infra,all
BELSAY ESTATE LLP,business,estate
BELL ESTATES LIMITED,business,estate
PLATFORM HOUSING LIMITED,business,housing
THE COUNCIL OF THE CITY OF YORK,LA,district
SAU ESTATES LIMITED,business,estate
LAMBERHURST PARISH COUNCIL,LA,district
BARLOW FISHERIES LIMITED,business,farm
ISHGUARD LIMITED,business,industry
READING BOROUGH COUNCIL,LA,district
CHIME PROPERTIES LIMITED,business,investment
RAMON HOLDINGS LIMITED,business,ownership_co
CTR PROPERTIES LIMITED,business,investment
EASTERN POWER NETWORKS PLC,infra,all
HERTFORDSHIRE COUNTY COUNCIL,LA,county
LICHFIELD ASSOCIATES LIMITED,business,smll_prtflio
THE DISTRICT COUNCIL OF NEW FOREST,LA,district
DEADMILL LIMITED,business,single_prop
SOHA HOUSING LIMITED,business,housing
TRANSPORT FOR LONDON,infra,all
SYCT LIMITED,business,single_prop
COBALT HOUSING LIMITED,business,housing
SOUTHERN ESTATES LIMITED,business,estate
CLARION HOUSING ASSOCIATION LIMITED,business,housing
SP MANWEB PLC,infra,all
F H EASTON LIMITED,business,farm
MOAT HOMES LIMITED,business,housing
THE COUNCIL OF THE CITY OF STOKE-ON-TRENT,LA,district
WARRINGTON BOROUGH COUNCIL,LA,district
ECLIPSE GROUND RENTS LIMITED,business,investment
G W FORD & SON (BUILDERS) LIMITED,business,builder
RECRUITMENT SOLUTIONS (PROPERTY) LIMITED,business,investment
FULLER SMITH & TURNER PLC,business,retail

update ccod_ocod_2025_09 co set subcat='water' where cat='infra' and proprietor_name_1 ilike '%water%'
update ccod_ocod_2025_09 co set subcat='power' where cat='infra' and proprietor_name_1 ilike '%power%' or proprietor_name_1 ilike '%electr%' or proprietor_name_1 ilike '%energy%'
update ccod_ocod_2025_09 co set subcat='gas' where cat='infra' and proprietor_name_1 ilike '%gas%'

```sql
SELECT proprietor_name_1, COUNT(*) AS cnt, ROUND(SUM(ST_Area(geom))/10000)  AS Ha
FROM ccod_ocod_2025_09
where cat='infra' and subcat='all'
group by proprietor_name_1
order by ha desc;
NATIONAL HIGHWAYS LIMITED
THE CROUCH HARBOUR AUTHORITY
PORT OF LONDON AUTHORITY
ASSOCIATED BRITISH PORTS
NETWORK RAIL INFRASTRUCTURE LIMITED
PORT OF SHEERNESS LIMITED
THE MASTER WARDENS AND COMMONALTY OF MERCHANT VENTURERS OF THE CITY OF BRISTOL
FIRST CORPORATE SHIPPING LIMITED
NUCLEAR DECOMMISSIONING AUTHORITY
STANSTED AIRPORT LIMITED
THE MANCHESTER SHIP CANAL COMPANY LIMITED
PEEL NRE LIMITED
BRITISH TELECOMMUNICATIONS PLC
HEATHROW AIRPORT LIMITED
TRANSPORT FOR LONDON
THE PROPANE COMPANY LIMITED
LONDON UNDERGROUND LIMITED
PD TEESPORT LIMITED
PORT OF TILBURY LONDON LIMITED
SEMBCORP UTILITIES (UK) LIMITED
update ccod_ocod_2025_09 co set subcat='rail' where cat='infra' and proprietor_name_1 ilike '%rail%' or proprietor_name_1 ilike '%train%'
update ccod_ocod_2025_09 co set subcat='port' where cat='infra' and proprietor_name_1 ilike '%port%' or proprietor_name_1 ilike '%harbour%' or proprietor_name_1 ilike '%ship%'

```sql
SELECT proprietor_name_1, COUNT(*) AS cnt, ROUND(SUM(ST_Area(geom))/10000)  AS Ha
FROM ccod_ocod_2025_09
where cat='infra' and subcat='all'
group by proprietor_name_1
order by ha desc;
NATIONAL HIGHWAYS LIMITED
THE MASTER WARDENS AND COMMONALTY OF MERCHANT VENTURERS OF THE CITY OF BRISTOL
NUCLEAR DECOMMISSIONING AUTHORITY
PEEL NRE LIMITED
THE PROPANE COMPANY LIMITED
LONDON UNDERGROUND LIMITED
SEMBCORP UTILITIES (UK) LIMITED
PEEL NRE ENVIRONMENTAL LIMITED
ARQIVA LIMITED
ROYAL MAIL GROUP LIMITED
E.ON UK PLC
SIZEWELL C LIMITED
MAINLINE PIPELINES LIMITED
DWR CYMRU CYFYNGEDIG
CLH PIPELINE SYSTEM (CLH-PS) LTD
EDF DEVELOPMENT COMPANY LIMITED
SP MANWEB PLC
ROCHDALE CANAL COMPANY
update ccod_ocod_2025_09 co set subcat='road' where cat='infra' and proprietor_name_1 ilike '%highway%' or proprietor_name_1 ilike '%road%'

```sql
UPDATE ccod_ocod_2025_09
SET cat = 'infra',
    subcat = CASE
        WHEN proprietor_name_1 = 'NUCLEAR DECOMMISSIONING AUTHORITY' THEN 'power'
        WHEN proprietor_name_1 = 'PEEL NRE LIMITED' THEN 'power'
        WHEN proprietor_name_1 = 'THE PROPANE COMPANY LIMITED' THEN 'gas'
        WHEN proprietor_name_1 = 'LONDON UNDERGROUND LIMITED' THEN 'rail'
        WHEN proprietor_name_1 = 'SEMBCORP UTILITIES (UK) LIMITED' THEN 'water'
        WHEN proprietor_name_1 = 'PEEL NRE ENVIRONMENTAL LIMITED' THEN 'power'
        WHEN proprietor_name_1 = 'ARQIVA LIMITED' THEN 'telecom'
        WHEN proprietor_name_1 = 'ROYAL MAIL GROUP LIMITED' THEN 'mail'
        WHEN proprietor_name_1 = 'E.ON UK PLC' THEN 'power'
        WHEN proprietor_name_1 = 'SIZEWELL C LIMITED' THEN 'power'
        WHEN proprietor_name_1 = 'MAINLINE PIPELINES LIMITED' THEN 'gas'
        WHEN proprietor_name_1 = 'DWR CYMRU CYFYNGEDIG' THEN 'water'
        WHEN proprietor_name_1 = 'CLH PIPELINE SYSTEM (CLH-PS) LTD' THEN 'gas'
        WHEN proprietor_name_1 = 'EDF DEVELOPMENT COMPANY LIMITED' THEN 'power'
        WHEN proprietor_name_1 = 'SP MANWEB PLC' THEN 'power'
        WHEN proprietor_name_1 = 'ROCHDALE CANAL COMPANY' THEN 'canal'
        WHEN proprietor_name_1 = 'PEEL SOUTH EAST LIMITED' THEN 'power'
        WHEN proprietor_name_1 = 'SSE SERVICES PLC' THEN 'power'
        WHEN proprietor_name_1 = 'NNB GENERATION COMPANY (HPC) LIMITED' THEN 'power'
        WHEN proprietor_name_1 = 'THE CHANNEL TUNNEL GROUP LIMITED' THEN 'rail'
        WHEN proprietor_name_1 = 'SHELL UK LIMITED' THEN 'gas'
        WHEN proprietor_name_1 = 'RWE GENERATION UK PLC' THEN 'power'
        WHEN proprietor_name_1 = 'SHERBORNE UTILITIES LTD' THEN 'water'
        WHEN proprietor_name_1 = 'NATIONAL GRID TWENTY SEVEN LIMITED' THEN 'power'
        WHEN proprietor_name_1 = 'WALES & WEST UTILITIES LIMITED' THEN 'gas'
        WHEN proprietor_name_1 = 'NATIONAL GRID GRAIN LNG LIMITED' THEN 'gas'
        WHEN proprietor_name_1 = 'NNB GENERATION COMPANY LIMITED' THEN 'power'
        WHEN proprietor_name_1 = 'CENTRICA DISTRIBUTED GENERATION LIMITED' THEN 'power'
        ELSE subcat
    END
WHERE proprietor_name_1 IN (
    'NUCLEAR DECOMMISSIONING AUTHORITY',
    'PEEL NRE LIMITED',
    'THE PROPANE COMPANY LIMITED',
    'LONDON UNDERGROUND LIMITED',
    'SEMBCORP UTILITIES (UK) LIMITED',
    'PEEL NRE ENVIRONMENTAL LIMITED',
    'ARQIVA LIMITED',
    'ROYAL MAIL GROUP LIMITED',
    'E.ON UK PLC',
    'SIZEWELL C LIMITED',
    'MAINLINE PIPELINES LIMITED',
    'DWR CYMRU CYFYNGEDIG',
    'CLH PIPELINE SYSTEM (CLH-PS) LTD',
    'EDF DEVELOPMENT COMPANY LIMITED',
    'SP MANWEB PLC',
    'ROCHDALE CANAL COMPANY',
    'PEEL SOUTH EAST LIMITED',
    'SSE SERVICES PLC',
    'NNB GENERATION COMPANY (HPC) LIMITED',
    'THE CHANNEL TUNNEL GROUP LIMITED',
    'SHELL UK LIMITED',
    'RWE GENERATION UK PLC',
    'SHERBORNE UTILITIES LTD',
    'NATIONAL GRID TWENTY SEVEN LIMITED',
    'WALES & WEST UTILITIES LIMITED',
    'NATIONAL GRID GRAIN LNG LIMITED',
    'NNB GENERATION COMPANY LIMITED',
    'CENTRICA DISTRIBUTED GENERATION LIMITED'
);
update ccod_ocod_2025_09 co set subcat='trust', cat='charity' where proprietor_name_1 ilike 'THE MASTER WARDENS AND COMMONALTY OF MERCHANT VENTURERS OF THE CITY OF BRISTOL'

```sql
UPDATE ccod_ocod_2025_09
SET subcat='other' where cat='infra' and subcat='all'

```sql
UPDATE ccod_ocod_2025_09
SET cat='infra' where subcat in ('port','power','road','rail')
WITH ranked AS (
    
```sql
SELECT 
        proprietor_name_1,
        property_address,
        cat,
        subcat,
        ROW_NUMBER() OVER (
            PARTITION BY cat, subcat
            ORDER BY RANDOM()
        ) AS rn
    FROM ccod_ocod_2025_09
)

```sql
SELECT 
    proprietor_name_1,
    property_address,
    cat,
    subcat
FROM ranked
WHERE rn <= 10
ORDER BY cat, subcat, rn;


```


'%Bath %','%North East Somerset %','%Bedford %','%Blackburn %','%Darwen %','%Blackpool %','%Bournemouth %','%Christchurch %','%Poole %','%Bracknell %','%Brighton %','%Hove %','%Bristol %','%Buckinghamshire %','%Central Bedfordshire %','%Cheshire East %','%Cheshire West %','%Chester %','%Cornwall %','%County Durham %','%Cumberland %','%Darlington %','%Derby %','%Dorset %','%East Riding %','%Halton %','%Hartlepool %','%Herefordshire %','%Isle of Wight %','%Isles of Scilly %','%Kingston upon Hull %','%Leicester %','%Luton %','%Medway %','%Middlesbrough %','%Milton Keynes %','%North East Lincolnshire %','%North Lincolnshire %','%North Northamptonshire %','%North Somerset %','%North Yorkshire %','%Northumberland %','%Nottingham %','%Peterborough %','%Plymouth %','%Portsmouth %','%Reading %','%Redcar and Cleveland %','%Rutland %','%Shropshire %','%Slough %','%Somerset %','%South Gloucestershire %','%Southampton %','%Southend %','%Stockton %','%Stoke %','%Swindon %','%Telford %','%Wrekin %','%Thurrock %','%Torbay %','%Warrington %','%West Berkshire %','%West Northamptonshire %','%Westmorland %','%Furness %','%Wiltshire %','%Windsor %','%Maidenhead %','%Wokingham %','%York %'