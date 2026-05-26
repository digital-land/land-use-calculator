-- Create a fresh table
DROP TABLE IF EXISTS nps_categorised;

CREATE TABLE nps_categorised AS
SELECT n.*, NULL::INT AS cat
FROM lr_poly_f n;

-- 01 10000 private_individual
UPDATE nps_categorised n
SET cat = 10000
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND NOT EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no);

-- 02 30000 overseas_corporate
UPDATE nps_categorised n
SET cat = 30000
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no);

-- 03 20000 UK_corporate
UPDATE nps_categorised n
SET cat = 20000
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no);

-- 04 32000 overseas_corporate.other_countries
UPDATE nps_categorised n
SET cat = 32000
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no);

-- 05 31100 overseas_corporate.top_countries_1
UPDATE nps_categorised n
SET cat = 31100
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'JERSEY');

-- 06 31200 overseas_corporate.top_countries_2
UPDATE nps_categorised n
SET cat = 31200
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'BRITISH VIRGIN ISLANDS');

-- 07 31300 overseas_corporate.top_countries_3
UPDATE nps_categorised n
SET cat = 31300
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'GUERNSEY');

-- 08 31400 overseas_corporate.top_countries_4
UPDATE nps_categorised n
SET cat = 31400
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'ISLE OF MAN');

-- 09 31500 overseas_corporate.top_countries_5
UPDATE nps_categorised n
SET cat = 31500
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'SINGAPORE');

-- 10 31600 overseas_corporate.top_countries_6
UPDATE nps_categorised n
SET cat = 31600
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'LUXEMBOURG');

-- 11 31700 overseas_corporate.top_countries_7
UPDATE nps_categorised n
SET cat = 31700
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'GIBRALTAR');

-- 12 31800 overseas_corporate.top_countries_8
UPDATE nps_categorised n
SET cat = 31800
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'HONG KONG');

-- 13 31900 overseas_corporate.top_countries_9
UPDATE nps_categorised n
SET cat = 31900
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'CAYMAN ISLANDS');

-- 14 23000 UK_corporate.other !!!!!!!!NOTE: THIS IS BEING WIPED OUT LATER
UPDATE nps_categorised n
SET cat = 23000
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no);

-- 15 22000 UK_corporate.private_sector
UPDATE nps_categorised n
SET cat = 22000
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['% LTD%','% PLC%','% LIMITED%','% LLC%','% LLP%']));

-- 16 25000 UK_corporate.university
UPDATE nps_categorised n
SET cat = 25000
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% UNIVERSITY%');

-- 17 24000 UK_corporate.Crown Estate
UPDATE nps_categorised n
SET cat = 24000
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%MOST EXCELLENT MAJESTY%' OR c.proprietor_name_1 ILIKE '%CROWN ESTATE%'));

-- 18 23400 UK_corporate.non_profit.charity_in_name
UPDATE nps_categorised n
SET cat = 23400
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['% CIO%','% charitable%','% charity%','% CCLG%', 
'%housing association%',
'%housing trust%',
'%alms%'
]));

-- 19 23300 UK_corporate.non_profit.community_interest_company
UPDATE nps_categorised n
SET cat = 23300
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['% CIC%','% community interest company%']));

-- 20 23200 UK_corporate.non_profit.national_trust
UPDATE nps_categorised n
SET cat = 23200
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%the national trust%' or c.proprietor_name_1 ILIKE 'national trust%') AND c.proprietor_name_1 NOT ILIKE '%first%');

-- 21 23111 UK_corporate.non_profit.church.C_of_E.commissioners
UPDATE nps_categorised n
SET cat = 23111
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%church commission%');

-- 22 23112 UK_corporate.non_profit.church.C_of_E.dioscese
UPDATE nps_categorised n
SET cat = 23112
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% dioc%' AND c.proprietor_name_1 NOT ILIKE '%catholic%');

-- 23 23120 UK_corporate.non_profit.church.other
UPDATE nps_categorised n
SET cat = 23120
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['% salvation army%',' %mormon%','% quaker%','% gospel%','% mosque%','% islam%','% judai%','% synag%','% hebrew%','% catholic%','catholic%','%apastolic%','%methodist%','order of %','% order of %','%sikh%','%bhuddist%','%baptist%','%cathedral of %','%cathedral church %','% chapel of %','% church of %','% St %''s church%']) AND c.property_address NOT ILIKE '% mine%' AND c.proprietor_name_1 NOT ILIKE '%THE PRESIDENT%' AND c.proprietor_name_1 NOT ILIKE '%MERCHANT TAYLORS%' AND c.proprietor_name_1 NOT ILIKE '%dioc%' AND c.proprietor_name_1 NOT ILIKE '%church commissioner%' AND c.proprietor_name_1 NOT ilike '% SCHOLARS OF %');

-- 24 21310 UK_corporate.public_sector.public_agency.national_park
UPDATE nps_categorised n
SET cat = 21310
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%national park authority%');

-- 25 21320 UK_corporate.public_sector.public_agency.homes_england
UPDATE nps_categorised n
SET cat = 21320
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%homes AND communities agency%' or c.proprietor_name_1 ILIKE '%national housing bank%'));

-- 26 21330 UK_corporate.public_sector.public_agency.national_highways
UPDATE nps_categorised n
SET cat = 21330
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%national highways%');

-- 27 21340 UK_corporate.public_sector.public_agency.historic_england
UPDATE nps_categorised n
SET cat = 21340
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%buildings AND monuments commission%');

-- 28 21351 UK_corporate.public_sector.public_agency.emergency.police
UPDATE nps_categorised n
SET cat = 21351
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% police%');

-- 29 21352 UK_corporate.public_sector.public_agency.emergency.fire_service
UPDATE nps_categorised n
SET cat = 21352
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% fire %' AND c.proprietor_name_1 ILIKE '% authority%');

-- 30 21353 UK_corporate.public_sector.public_agency.emergency.ambulance
UPDATE nps_categorised n
SET cat = 21353
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% ambulance %');

-- 31 21360 UK_corporate.public_sector.public_agency.post_office !!! REMOVED !!!!!!!!!!!!!!!!!!!!!

-- 32 21370 UK_corporate.public_sector.public_agency.network_rail
UPDATE nps_categorised n
SET cat = 21370
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%network rail%' or c.proprietor_name_1 ILIKE '%british rail%'));

-- 33 21380 UK_corporate.public_sector.public_agency.nuclear_decommissioning !!! REMOVE OR NOT ??? !!!
UPDATE nps_categorised n
SET cat = 21380
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%nuclear %' AND c.proprietor_name_1 ILIKE '% authority%');

-- 34 21390 UK_corporate.public_sector.public_agency.other !!! DODGY APPROACH ??? !!!
UPDATE nps_categorised n
SET cat = 21390
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['%British Broadcasting Corporation%','%Channel 4%','%S4C%','%National Wealth Fund Limited%','%British Business Bank%','%British International Investment%','%UK Government Investments%','%UK Asset Resolution%','%National Energy System Operator%','%Great British Energy%','%Great British Energy – Nuclear%','%United Kingdom National Nuclear Laboratory%','%Nuclear Restoration Services%','%Nuclear Waste Services%','%Sellafield Ltd%','%AWE plc%','%Sheffield Forgemasters%','%High Speed Two (HS2) Ltd%','%East West Railway Company%','%London & Continental Railways%','%DfT Operator%','%Direct Rail Services%','%Ordnance Survey%','%UK Hydrographic Office%','%Met Office%','%National Physical Laboratory%','%The Royal Mint%','%Student Loans Company%','%Civil Aviation Authority%','%Genomics England%','%NHS Professionals%','%Porton Biopharma%','%London North Eastern Railway%','%Northern Trains%','%Southeastern%','%TransPennine Trains%','%South Western Railway%','%C2c%','%Greater Anglia%']));

-- 42 21280 UK_corporate.public_sector.central_government.other // SET THE OTHERS FIRST !!!!!
UPDATE nps_categorised n
SET cat = 21280
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])));

-- 35 21210 UK_corporate.public_sector.central_government.defence
UPDATE nps_categorised n
SET cat = 21210
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['%DEFENCE%','%ROYAL NAVY%','%AIR FORCE%','%ROYAL AIR%']));

-- 36 21220 UK_corporate.public_sector.central_government.transport
UPDATE nps_categorised n
SET cat = 21220
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['%TRANSPORT%','%DEPARTMENT FOR TRANSPORT%','%DEPARTMENT OF TRANSPORT%']));

-- 37 21230 UK_corporate.public_sector.central_government.housing
UPDATE nps_categorised n
SET cat = 21230
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['%HOUSING%','%COMMUNITIES%','%LEVELLING UP%']));

-- 38 21240 UK_corporate.public_sector.central_government.environment
UPDATE nps_categorised n
SET cat = 21240
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['%ENVIRONMENT%','%DEFRA%','%RURAL AFFAIRS%','%FISHERIES%']));

-- 39 21250 UK_corporate.public_sector.central_government.justice
UPDATE nps_categorised n
SET cat = 21250
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['%JUSTICE%','%NATIONAL OFFENDER%','%PRISON%']));

-- 40 21260 UK_corporate.public_sector.central_government.health
UPDATE nps_categorised n
SET cat = 21260
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['%HEALTH%','%SOCIAL CARE%','%NHS%','%NATIONAL HEALTH SERVICE%']));

-- 41 21270 UK_corporate.public_sector.central_government.culture_media_sport
UPDATE nps_categorised n
SET cat = 21270
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['% CULTURE%','% MEDIA%','% SPORT%','% HERITAGE%','%MUSEUM%']));


-- 43 21170 UK_corporate.public_sector.local_government.other
UPDATE nps_categorised n
SET cat = 21170
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietorship_category_1 ILIKE ANY (ARRAY['County Council','Local Authority','Corporate Body']) AND (c.proprietor_name_1 ILIKE '%COUNCIL%' OR c.proprietor_name_1 ILIKE '%mayor and aldermen%') AND c.proprietor_name_1 NOT ILIKE '%COUNCIL FOR%'));

-- 44 21120 UK_corporate.public_sector.local_government.county !! UPDATED TO BE MORE BROAD BRUSH !!!!
UPDATE nps_categorised n
SET cat = 21120
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietorship_category_1 ILIKE 'County Council' OR 
c.proprietor_name_1 ILIKE '%COUNTY COUNCIL%'));

-- 45 21110 UK_corporate.public_sector.local_government.unitary !!! NOTE - A LOT OF LAND IS STILL IN THE NAME OF THE PREVIOUS ADMINISTRATIVE BODY
-- Minimal unitary “upcast” based on successor-area tokens.
-- Extend unitary_area_tokens with the areas that have become unitaries
-- and whose predecessor council names still appear in proprietor_name_1.


WITH unitary_area_tokens AS (
  SELECT unnest(ARRAY[
    -- Single-tier historic unitaries
    'CORNWALL',
    'DURHAM',
    'SHROPSHIRE',
    'WILTSHIRE',
    'BUCKINGHAMSHIRE',

    -- Recent 2023 reorganisation
    'NORTH YORKSHIRE',
    'WEST NORTHAMPTONSHIRE',
    'NORTH NORTHAMPTONSHIRE',
    'CUMBERLAND',
    'WESTMORLAND',
    'FURNESS',
    -- Existing unitary areas (former districts / boroughs)
    'BATH',
    'NORTH EAST SOMERSET',
    'BRISTOL',
    'BEDFORD',
    'CENTRAL BEDFORDSHIRE',
    'BLACKBURN',
    'DARWEN',
    'BLACKPOOL',
    'BOURNEMOUTH',
    'CHRISTCHURCH',
    'POOLE',
    'BRACKNELL',
    'BRIGHTON',
    'HOVE',
    'CHESHIRE EAST',
    'CHESHIRE WEST',
    'CHESTER',
    'DARLINGTON',
    'DERBY',
    'DORSET',
    'EAST RIDING OF YORKSHIRE',
    'KINGSTON UPON HULL',
    'HALTON',
    'HARTLEPOOL',
    'HEREFORDSHIRE',
    'ISLE OF WIGHT',
    'ISLES OF SCILLY',
    'LEICESTER',
    'LUTON',
    'MEDWAY',
    'MIDDLESBROUGH',
    'MILTON KEYNES',
    'NORTH EAST LINCOLNSHIRE',
    'NORTH LINCOLNSHIRE',
    'NOTTINGHAM',
    'PORTSMOUTH',
    'PLYMOUTH',
    'READING',
    'REDCAR',
    'CLEVELAND',
    'RUTLAND',
    'SLOUGH',
    'SOUTH GLOUCESTERSHIRE',
    'SOUTHAMPTON',
    'SOUTHEND',
    'STOCKTON',
    'STOKE',
    'STOKE-ON-TRENT',
    'SWINDON',
    'TELFORD',
    'WREKIN',
    'THURROCK',
    'TORBAY',
    'WARRINGTON',
    'WEST BERKSHIRE',
    'WOKINGHAM',
    'WINDSOR',
    'MAIDENHEAD',
    'YORK'
  ]) AS token
)

UPDATE nps_categorised n
SET cat = 21110
WHERE EXISTS (
  SELECT 1
  FROM ccod_full_2025_12 c
  JOIN unitary_area_tokens u
    ON upper(c.proprietor_name_1) LIKE '%' || u.token || '%'
  WHERE c.title_number = n.title_no
    -- Guard: only treat local-authority-like rows as candidates
    AND (
      c.proprietorship_category_1 IN ('Local Authority','County Council')
      OR upper(c.proprietor_name_1) LIKE '% COUNCIL%'
      OR upper(c.proprietor_name_1) LIKE '%LONDON BOROUGH%'
    )
    -- Exclusions: remove parish/town councils (out of scope) and church bodies
    AND upper(c.proprietor_name_1) NOT LIKE '%PARISH%'
    AND upper(c.proprietor_name_1) NOT LIKE '%TOWN%'
    AND upper(c.proprietor_name_1) NOT LIKE '%DIOC%'
);



-- 46 21130 UK_corporate.public_sector.local_government.district !!! LATER OVERWRITE OTHERS
UPDATE nps_categorised n
SET cat = 21130
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%DISTRICT COUNCIL%'));

-- 47 21140 UK_corporate.public_sector.local_government.parish_or_town
UPDATE nps_categorised n
SET cat = 21140
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['%Parish Council%','%Town Council%']));

-- 48 21150 UK_corporate.public_sector.local_government.combined_authority
UPDATE nps_categorised n
SET cat = 21150
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% COMBINED AUTHORITY%');

-- 49 21160 UK_corporate.public_sector.local_government.greater_london_authority
UPDATE nps_categorised n
SET cat = 21160
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%GREATER LONDON AUTHORITY%' OR c.proprietor_name_1 ILIKE '%TRANSPORT FOR LONDON%' OR c.proprietor_name_1 ILIKE '%TFL%'));

-- final check for no blanks
UPDATE nps_categorised SET cat = 10000 WHERE cat IS null;

DELETE FROM nps_categorised n
WHERE EXISTS (
  SELECT 1
  FROM ccod_full_2025_12 c
  WHERE c.title_number = n.title_no
    AND c.property_address ILIKE '%mineral%'
);


-- CHECK

WITH cat_lookup AS (
  SELECT *
  FROM (VALUES
    (10000, 'private_individual'),
    (20000, 'UK_corporate'),
    (21110, 'local_government.unitary'),
    (21120, 'local_government.county'),
    (21130, 'local_government.district'),
    (21140, 'local_government.parish_town'),
    (21150, 'local_government.combined_authority'),
    (21160, 'local_government.greater_london_authority'),
    (21170, 'local_government.other'),
    (21210, 'central_government.defence'),
    (21220, 'central_government.transport'),
    (21230, 'central_government.housing'),
    (21240, 'central_government.environment'),
    (21250, 'central_government.justice'),
    (21260, 'central_government.health'),
    (21270, 'central_government.culture_media_sport'),
    (21280, 'central_government.other'),
    (21310, 'public_agency.national_park'),
    (21320, 'public_agency.homes_england'),
    (21330, 'public_agency.national_highways'),
    (21340, 'public_agency.historic_england'),
    (21351, 'public_agency.police'),
    (21352, 'public_agency.fire'),
    (21353, 'public_agency.ambulance'),
    (21370, 'public_agency.network_rail'),
    (21380, 'public_agency.nuclear'),
    (21390, 'public_agency.other'),
    (22000, 'UK_corporate.private_sector'),
    (23000, 'UK_corporate.other'),
    (23200, 'UK_corporate.national_trust'),
    (23300, 'UK_corporate.CIC'),
    (23400, 'UK_corporate.charity'),
    (23111, 'church.C_of_E.commissioners'),
    (23112, 'church.C_of_E.diocese'),
    (23120, 'church.other'),
    (24000, 'crown_estate'),
    (25000, 'university'),
    (30000, 'overseas_corporate'),
	(31100, 'overseas.jersey'),
	(31200, 'overseas.british_virgin_islands'),
	(31300, 'overseas.guernsey'),
	(31400, 'overseas.isle_of_man'),
	(31500, 'overseas.singapore'),
	(31600, 'overseas.luxembourg'),
	(31700, 'overseas.gibraltar'),
	(31800, 'overseas.hong_kong'),
	(31900, 'overseas.cayman_islands'),
    (32000, 'overseas.other')
  ) AS t(cat, name)
),
stats AS (
  SELECT
    n.cat,
    COUNT(*) AS n,
    SUM(ST_Area(n.geom))/10000.0 AS hectares
  FROM nps_categorised n
  GROUP BY n.cat
),
examples AS (
  SELECT
    n.cat,
    c.proprietor_name_1,
    c.proprietorship_category_1,
    ROW_NUMBER() OVER (
      PARTITION BY n.cat
      ORDER BY random()
    ) AS rn
  FROM nps_categorised n
  LEFT JOIN ccod_full_2025_12 c
    ON c.title_number = n.title_no
)
SELECT
  s.cat,
  cl.name AS category_name,
  s.n,
  s.hectares,
  e.proprietor_name_1,
  e.proprietorship_category_1
FROM stats s
LEFT JOIN cat_lookup cl ON cl.cat = s.cat
LEFT JOIN examples e
  ON e.cat = s.cat
  AND e.rn <= 10
ORDER BY s.hectares DESC, s.cat, e.rn;


WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (1 AND 1 AND 1 AND 1 AND 1
AND 1 AND 1 AND 1)
OR 1);
