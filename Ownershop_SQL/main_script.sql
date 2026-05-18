-- Create a fresh table
DROP TABLE IF EXISTS nps_categorised;

CREATE TABLE nps_categorised AS
SELECT n.*, NULL::INT AS cat
FROM lr_poly_f n;

-- 01 110000 private_individual
UPDATE nps_categorised n
SET cat = 110000
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND NOT EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no);

-- 02 130000 overseas_corporate
UPDATE nps_categorised n
SET cat = 130000
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no);

-- 03 120000 UK_corporate
UPDATE nps_categorised n
SET cat = 120000
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no);

-- 04 132000 overseas_corporate.other_countries
UPDATE nps_categorised n
SET cat = 132000
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no);

-- 05 131100 overseas_corporate.top_countries_1
UPDATE nps_categorised n
SET cat = 131100
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'JERSEY');

-- 06 131200 overseas_corporate.top_countries_2
UPDATE nps_categorised n
SET cat = 131200
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'BRITISH VIRGIN ISLANDS');

-- 07 131300 overseas_corporate.top_countries_3
UPDATE nps_categorised n
SET cat = 131300
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'GUERNSEY');

-- 08 131400 overseas_corporate.top_countries_4
UPDATE nps_categorised n
SET cat = 131400
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'ISLE OF MAN');

-- 09 131500 overseas_corporate.top_countries_5
UPDATE nps_categorised n
SET cat = 131500
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'SINGAPORE');

-- 10 131600 overseas_corporate.top_countries_6
UPDATE nps_categorised n
SET cat = 131600
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'LUXEMBOURG');

-- 11 131700 overseas_corporate.top_countries_7
UPDATE nps_categorised n
SET cat = 131700
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'GIBRALTAR');

-- 12 131800 overseas_corporate.top_countries_8
UPDATE nps_categorised n
SET cat = 131800
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'HONG KONG');

-- 13 131900 overseas_corporate.top_countries_9
UPDATE nps_categorised n
SET cat = 131900
WHERE NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no) AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'CAYMAN ISLANDS');

-- 14 123000 UK_corporate.other !!!!!!!!NOTE: THIS IS BEING WIPED OUT LATER
UPDATE nps_categorised n
SET cat = 123000
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no);

-- 15 122000 UK_corporate.private_sector
UPDATE nps_categorised n
SET cat = 122000
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['% LTD%','% PLC%','% LIMITED%','% LLC%','% LLP%']));

-- 16 125000 UK_corporate.university
UPDATE nps_categorised n
SET cat = 125000
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% UNIVERSITY%');

-- 17 124000 UK_corporate.Crown Estate
UPDATE nps_categorised n
SET cat = 124000
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%MOST EXCELLENT MAJESTY%' OR c.proprietor_name_1 ILIKE '%CROWN ESTATE%'));

-- 18 123400 UK_corporate.non_profit.charity_in_name
UPDATE nps_categorised n
SET cat = 123400
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['% CIO%','% charitable%','% charity%','% CCLG%']));

-- 19 123300 UK_corporate.non_profit.community_interest_company
UPDATE nps_categorised n
SET cat = 123300
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['% CIC%','% community interest company%']));

-- 20 123200 UK_corporate.non_profit.national_trust
UPDATE nps_categorised n
SET cat = 123200
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%the national trust%' or c.proprietor_name_1 ILIKE 'national trust%') AND c.proprietor_name_1 NOT ILIKE '%first%');

-- 21 123111 UK_corporate.non_profit.church.C_of_E.commissioners
UPDATE nps_categorised n
SET cat = 123111
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%church commission%');

-- 22 123112 UK_corporate.non_profit.church.C_of_E.dioscese
UPDATE nps_categorised n
SET cat = 123112
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% dioc%' AND c.proprietor_name_1 NOT ILIKE '%catholic%');

-- 23 123120 UK_corporate.non_profit.church.other
UPDATE nps_categorised n
SET cat = 123120
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['% salvation army%',' %mormon%','% quaker%','% gospel%','% mosque%','% islam%','% judai%','% synag%','% hebrew%','% catholic%','catholic%','%apastolic%','%methodist%','order of %','% order of %','%sikh%','%bhuddist%','%baptist%','%cathedral of %','%cathedral church %','% chapel of %','% church of %','% St %''s church%']) AND c.property_address NOT ILIKE '% mine%' AND c.proprietor_name_1 NOT ILIKE '%THE PRESIDENT%' AND c.proprietor_name_1 NOT ILIKE '%MERCHANT TAYLORS%' AND c.proprietor_name_1 NOT ILIKE '%dioc%' AND c.proprietor_name_1 NOT ILIKE '%church commissioner%' AND c.proprietor_name_1 NOT ilike '% SCHOLARS OF %');

-- 24 121310 UK_corporate.public_sector.public_agency.national_park
UPDATE nps_categorised n
SET cat = 121310
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%national park authority%');

-- 25 121320 UK_corporate.public_sector.public_agency.homes_england
UPDATE nps_categorised n
SET cat = 121320
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%homes AND communities agency%' or c.proprietor_name_1 ILIKE '%national housing bank%'));

-- 26 121330 UK_corporate.public_sector.public_agency.national_highways
UPDATE nps_categorised n
SET cat = 121330
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%national highways%');

-- 27 121340 UK_corporate.public_sector.public_agency.historic_england
UPDATE nps_categorised n
SET cat = 121340
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%buildings AND monuments commission%');

-- 28 121351 UK_corporate.public_sector.public_agency.emergency.police
UPDATE nps_categorised n
SET cat = 121351
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% police%');

-- 29 121352 UK_corporate.public_sector.public_agency.emergency.fire_service
UPDATE nps_categorised n
SET cat = 121352
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% fire %' AND c.proprietor_name_1 ILIKE '% authority%');

-- 30 121353 UK_corporate.public_sector.public_agency.emergency.ambulance
UPDATE nps_categorised n
SET cat = 121353
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% ambulance %');

-- 31 121360 UK_corporate.public_sector.public_agency.post_office !!! REMOVED !!!!!!!!!!!!!!!!!!!!!

-- 32 121370 UK_corporate.public_sector.public_agency.network_rail
UPDATE nps_categorised n
SET cat = 121370
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%network rail%' or c.proprietor_name_1 ILIKE '%british rail%'));

-- 33 121380 UK_corporate.public_sector.public_agency.nuclear_decommissioning !!! REMOVE OR NOT ??? !!!
UPDATE nps_categorised n
SET cat = 121380
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%nuclear %' AND c.proprietor_name_1 ILIKE '% authority%');

-- 34 121390 UK_corporate.public_sector.public_agency.other !!! DODGY APPROACH ??? !!!
UPDATE nps_categorised n
SET cat = 121390
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['%British Broadcasting Corporation%','%Channel 4%','%S4C%','%National Wealth Fund Limited%','%British Business Bank%','%British International Investment%','%UK Government Investments%','%UK Asset Resolution%','%National Energy System Operator%','%Great British Energy%','%Great British Energy – Nuclear%','%United Kingdom National Nuclear Laboratory%','%Nuclear Restoration Services%','%Nuclear Waste Services%','%Sellafield Ltd%','%AWE plc%','%Sheffield Forgemasters%','%High Speed Two (HS2) Ltd%','%East West Railway Company%','%London & Continental Railways%','%DfT Operator%','%Direct Rail Services%','%Ordnance Survey%','%UK Hydrographic Office%','%Met Office%','%National Physical Laboratory%','%The Royal Mint%','%Student Loans Company%','%Civil Aviation Authority%','%Genomics England%','%NHS Professionals%','%Porton Biopharma%','%London North Eastern Railway%','%Northern Trains%','%Southeastern%','%TransPennine Trains%','%South Western Railway%','%C2c%','%Greater Anglia%']));

-- 42 121280 UK_corporate.public_sector.central_government.other // SET THE OTHERS FIRST !!!!!
UPDATE nps_categorised n
SET cat = 121280
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])));

-- 35 121210 UK_corporate.public_sector.central_government.defence
UPDATE nps_categorised n
SET cat = 121210
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['%DEFENCE%','%ROYAL NAVY%','%AIR FORCE%','%ROYAL AIR%']));

-- 36 121220 UK_corporate.public_sector.central_government.transport
UPDATE nps_categorised n
SET cat = 121220
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['%TRANSPORT%','%DEPARTMENT FOR TRANSPORT%','%DEPARTMENT OF TRANSPORT%']));

-- 37 121230 UK_corporate.public_sector.central_government.housing
UPDATE nps_categorised n
SET cat = 121230
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['%HOUSING%','%COMMUNITIES%','%LEVELLING UP%']));

-- 38 121240 UK_corporate.public_sector.central_government.environment
UPDATE nps_categorised n
SET cat = 121240
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['%ENVIRONMENT%','%DEFRA%','%RURAL AFFAIRS%','%FISHERIES%']));

-- 39 121250 UK_corporate.public_sector.central_government.justice
UPDATE nps_categorised n
SET cat = 121250
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['%JUSTICE%','%NATIONAL OFFENDER%','%PRISON%']));

-- 40 121260 UK_corporate.public_sector.central_government.health
UPDATE nps_categorised n
SET cat = 121260
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['%HEALTH%','%SOCIAL CARE%','%NHS%','%NATIONAL HEALTH SERVICE%']));

-- 41 121270 UK_corporate.public_sector.central_government.culture_media_sport
UPDATE nps_categorised n
SET cat = 121270
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 IS NOT NULL AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','% DEPARTMENT FOR %','%DEPARTMENT OF %','%MINISTRY OF %'])) AND c.proprietor_name_1 ILIKE ANY (ARRAY['% CULTURE%','% MEDIA%','% SPORT%','% HERITAGE%','%MUSEUM%']));


-- 43 121170 UK_corporate.public_sector.local_government.other
UPDATE nps_categorised n
SET cat = 121170
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietorship_category_1 ILIKE ANY (ARRAY['County Council','Local Authority','Corporate Body']) AND c.proprietor_name_1 ILIKE '%COUNCIL%' AND c.proprietor_name_1 NOT ILIKE '%COUNCIL FOR%'));

-- 44 121120 UK_corporate.public_sector.local_government.county !! UPDATED TO BE MORE BROAD BRUSH !!!!
UPDATE nps_categorised n
SET cat = 121120
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietorship_category_1 ILIKE 'County Council' OR 
c.proprietor_name_1 ILIKE '%COUNTY COUNCIL%'));

-- 45 121110 UK_corporate.public_sector.local_government.unitary !!! NOTE - A LOT OF LAND IS STILL IN THE NAME OF THE PREVIOUS ADMINISTRATIVE BODY
UPDATE nps_categorised n
SET cat = 121110
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE ANY (ARRAY['%Bath %','%North East Somerset %','%Bedford %','%Blackburn %','%Darwen %','%Blackpool %','%Bournemouth %','%Christchurch %','%Poole %','%Bracknell %','%Brighton %','%Hove %','%Bristol %','%Buckinghamshire %','%Central Bedfordshire %','%Cheshire East %','%Cheshire West %','% Chester %','CHESTER%','%Cornwall %','%County Durham %','%Cumberland %','%Darlington %','%Derby %','%Dorset %','%East Riding %','%Halton %','%Hartlepool %','%Herefordshire %','%Isle of Wight %','%Isles of Scilly %','%Kingston upon Hull %','%Leicester %','%Luton %','%Medway %','%Middlesbrough %','%Milton Keynes %','%North East Lincolnshire %','%North Lincolnshire %','%North Northamptonshire %','%North Somerset %','%North Yorkshire %','%Northumberland %','%Nottingham %','%Peterborough %','%Plymouth %','%Portsmouth %','%Reading %','%Redcar%','%Cleveland%','%Rutland %','%Shropshire %','%Slough %','%Somerset %','%South Gloucestershire %','%Southampton %','%Southend %','%Stockton %','%Stoke %','%Swindon %','%Telford %','%Wrekin %','%Thurrock %','%Torbay %','%Warrington %','%West Berkshire %','%West Northamptonshire %','%Westmorland %','%Furness %','%Wiltshire %','%Windsor %','%Maidenhead %','%Wokingham %','%York %'])
AND c.proprietor_name_1 ILIKE '%COUNCIL%' AND c.proprietor_name_1 NOT ILIKE '%COUNCIL FOR%' AND c.proprietor_name_1 not ILIKE'% TOWN %'AND c.proprietor_name_1 not ILIKE'% PARISH %'
AND c.proprietor_name_1 not ILIKE'TOWN %'AND c.proprietor_name_1 not ILIKE'PARISH %' AND c.proprietor_name_1 not ILIKE '%DIOC%'));


-- 46 121130 UK_corporate.public_sector.local_government.district !!! LATER OVERWRITE OTHERS
UPDATE nps_categorised n
SET cat = 121130
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%DISTRICT COUNCIL%' OR c.proprietor_name_1 ILIKE '%BOROUGH COUNCIL%' OR c.proprietor_name_1 ILIKE '%metropolitan district%' OR c.proprietor_name_1 ILIKE '%City of London Corporation%' OR c.proprietor_name_1 ILIKE '%Westminster City Council%'));

-- 47 121140 UK_corporate.public_sector.local_government.parish_or_town
UPDATE nps_categorised n
SET cat = 121140
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['%Parish Council%','%Town Council%']));

-- 48 121150 UK_corporate.public_sector.local_government.combined_authority
UPDATE nps_categorised n
SET cat = 121150
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% COMBINED AUTHORITY%');

-- 49 121160 UK_corporate.public_sector.local_government.greater_london_authority
UPDATE nps_categorised n
SET cat = 121160
WHERE EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%GREATER LONDON AUTHORITY%' OR c.proprietor_name_1 ILIKE '%TRANSPORT FOR LONDON%'));

-- final check for no blanks
UPDATE nps_categorised SET cat = 110000 WHERE cat IS null;

DELETE FROM nps_categorised n
WHERE EXISTS (
  SELECT 1
  FROM ccod_full_2025_12 c
  WHERE c.title_number = n.title_no
    AND c.property_address ILIKE '%mineral%'
);
