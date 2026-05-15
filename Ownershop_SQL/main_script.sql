CREATE OR REPLACE VIEW vw_nps_categorised AS
SELECT
  n.*,
  CASE
    /* 49 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietorship_category_1 ILIKE ANY (ARRAY['County Council','Local Authority'])
        AND (c.proprietor_name_1 ILIKE '%GREATER LONDON AUTHORITY%' OR c.proprietor_name_1 ILIKE '%TRANSPORT FOR LONDON%')
    ) THEN 121160

    /* 48 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietorship_category_1 ILIKE ANY (ARRAY['County Council','Local Authority'])
        AND c.proprietor_name_1 ILIKE '%COMBINED AUTHORITY%'
    ) THEN 121150

    /* 47 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietorship_category_1 ILIKE 'Local Authority'
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%Parish Council%','%Town Council%'])
    ) THEN 121140

    /* 46 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietorship_category_1 ILIKE 'Local Authority'
    ) THEN 121130

    /* 45 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietorship_category_1 ILIKE ANY (ARRAY['County Council','Local Authority'])
        AND c.proprietor_name_1 ILIKE ANY (ARRAY[
          '%Bath %','%North East Somerset %','%Bedford %','%Blackburn %','%Darwen %','%Blackpool %','%Bournemouth %','%Christchurch %','%Poole %',
          '%Bracknell %','%Brighton %','%Hove %','%Bristol %','%Buckinghamshire %','%Central Bedfordshire %','%Cheshire East %','%Cheshire West %',
          '%Chester %','%Cornwall %','%County Durham %','%Cumberland %','%Darlington %','%Derby %','%Dorset %','%East Riding %','%Halton %','%Hartlepool %',
          '%Herefordshire %','%Isle of Wight %','%Isles of Scilly %','%Kingston upon Hull %','%Leicester %','%Luton %','%Medway %','%Middlesbrough %',
          '%Milton Keynes %','%North East Lincolnshire %','%North Lincolnshire %','%North Northamptonshire %','%North Somerset %','%North Yorkshire %',
          '%Northumberland %','%Nottingham %','%Peterborough %','%Plymouth %','%Portsmouth %','%Reading %','%Redcar and Cleveland %','%Rutland %','%Shropshire %',
          '%Slough %','%Somerset %','%South Gloucestershire %','%Southampton %','%Southend %','%Stockton %','%Stoke %','%Swindon %','%Telford %','%Wrekin %',
          '%Thurrock %','%Torbay %','%Warrington %','%West Berkshire %','%West Northamptonshire %','%Westmorland %','%Furness %','%Wiltshire %','%Windsor %',
          '%Maidenhead %','%Wokingham %','%York %'
        ])
    ) THEN 121110

    /* 44 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietorship_category_1 ILIKE 'County Council'
    ) THEN 121120

    /* 43 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietorship_category_1 ILIKE ANY (ARRAY['County Council','Local Authority'])
    ) THEN 121170

    /* 42 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietor_name_1 IS NOT NULL
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','DEPARTMENT FOR %'])
        AND NOT (c.proprietor_name_1 ILIKE ANY (ARRAY[
          '%DEFENCE%','%ROYAL NAVY%','%AIR FORCE%','%ROYAL AIR%',
          '%TRANSPORT%','%DEPARTMENT FOR TRANSPORT%','%DEPARTMENT OF TRANSPORT%',
          '%ENVIRONMENT%','%DEFRA%','%RURAL AFFAIRS%','%FISHERIES%',
          '%JUSTICE%','%NATIONAL OFFENDER%','%PRISON%',
          '%HEALTH%','%SOCIAL CARE%','%NHS%','%NATIONAL HEALTH SERVICE%',
          '%EDUCATION%','%SCHOOL%',
          '%HOUSING%','%COMMUNITIES%','%LEVELLING UP%','%HOMES ENGLAND%',
          '%CULTURE%','%MEDIA%','%SPORT%','%HERITAGE%','%MUSEUM%',
          '%HOME DEPARTMENT%','%HOME SECRETARY%','%HOME DEPT%',
          '%INDUSTRY%','%TRADE%'
        ]))
    ) THEN 121280

    /* 41 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietor_name_1 IS NOT NULL
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','DEPARTMENT FOR %'])
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%CULTURE%','%MEDIA%','%SPORT%','%HERITAGE%','%MUSEUM%'])
    ) THEN 121270

    /* 40 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietor_name_1 IS NOT NULL
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','DEPARTMENT FOR %'])
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%HEALTH%','%SOCIAL CARE%','%NHS%','%NATIONAL HEALTH SERVICE%'])
    ) THEN 121260

    /* 39 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietor_name_1 IS NOT NULL
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','DEPARTMENT FOR %'])
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%JUSTICE%','%NATIONAL OFFENDER%','%PRISON%'])
    ) THEN 121250

    /* 38 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietor_name_1 IS NOT NULL
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','DEPARTMENT FOR %'])
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%ENVIRONMENT%','%DEFRA%','%RURAL AFFAIRS%','%FISHERIES%'])
    ) THEN 121240

    /* 37 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietor_name_1 IS NOT NULL
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','DEPARTMENT FOR %'])
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%HOUSING%','%COMMUNITIES%','%LEVELLING UP%'])
    ) THEN 121230

    /* 36 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietor_name_1 IS NOT NULL
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','DEPARTMENT FOR %'])
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%TRANSPORT%','%DEPARTMENT FOR TRANSPORT%','%DEPARTMENT OF TRANSPORT%'])
    ) THEN 121220

    /* 35 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietor_name_1 IS NOT NULL
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%SECRETARY OF STATE%','DEPARTMENT %','DEPARTMENT FOR %'])
        AND c.proprietor_name_1 ILIKE ANY (ARRAY['%DEFENCE%','%ROYAL NAVY%','%AIR FORCE%','%ROYAL AIR%'])
    ) THEN 121210

    /* 34 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietor_name_1 ILIKE ANY (ARRAY[
          '%British Broadcasting Corporation%','%Channel 4%','%S4C%','%National Wealth Fund Limited%','%British Business Bank%','%British International Investment%',
          '%UK Government Investments%','%UK Asset Resolution%','%National Energy System Operator%','%Great British Energy%','%Great British Energy – Nuclear%',
          '%United Kingdom National Nuclear Laboratory%','%Nuclear Restoration Services%','%Nuclear Waste Services%','%Sellafield Ltd%','%AWE plc%',
          '%Sheffield Forgemasters%','%High Speed Two (HS2) Ltd%','%East West Railway Company%','%London & Continental Railways%','%DfT Operator%',
          '%Direct Rail Services%','%Ordnance Survey%','%UK Hydrographic Office%','%Met Office%','%National Physical Laboratory%','%The Royal Mint%',
          '%Student Loans Company%','%Civil Aviation Authority%','%Genomics England%','%NHS Professionals%','%Porton Biopharma%',
          '%London North Eastern Railway%','%Northern Trains%','%Southeastern%','%TransPennine Trains%','%South Western Railway%','%C2c%','%Greater Anglia%'
        ])
    ) THEN 121390

    /* 33 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietor_name_1 ILIKE '%nuclear %'
        AND c.proprietor_name_1 ILIKE '% authority%'
    ) THEN 121380

    /* 32 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND (c.proprietor_name_1 ILIKE '%network rail%' OR c.proprietor_name_1 ILIKE '%british rail%')
    ) THEN 121370

    /* 31 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND (c.proprietor_name_1 ILIKE '%post office limited%' OR c.proprietor_name_1 ILIKE '%the post office%' OR c.proprietor_name_1 ILIKE 'post office')
    ) THEN 121360

    /* 30 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% ambulance %')
    THEN 121353

    /* 29 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% fire %' AND c.proprietor_name_1 ILIKE '% authority%')
    THEN 121352

    /* 28 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% police%')
    THEN 121351

    /* 27 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%buildings and monuments commission%')
    THEN 121340

    /* 26 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%national highways%')
    THEN 121330

    /* 25 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%homes and communities agency%' OR c.proprietor_name_1 ILIKE '%national housing bank%'))
    THEN 121320

    /* 24 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%national park authority%')
    THEN 121310

    /* 23 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietor_name_1 ILIKE ANY (ARRAY[
          '%salvation army%','%mormon%','%quaker%','%gospel%','%mosque%','%islam%','%judai%','%synag%','%hebrew%','%catholic%','%apastolic%',
          '%methodist%','%order of%','%sikh%','%bhuddist%','%baptist%','%cathedral of %','%cathedral church %','% chapel of %','% church of %','% St %''s church%'
        ])
        AND c.property_address NOT ILIKE '% mine%'
        AND c.proprietor_name_1 NOT ILIKE '%THE PRESIDENT AND SCHOLARS OF%'
        AND c.proprietor_name_1 NOT ILIKE '%MERCHANT TAYLORS%'
        AND c.proprietor_name_1 NOT ILIKE '%dioc%'
        AND c.proprietor_name_1 NOT ILIKE '%church commissioner%'
    ) THEN 123120

    /* 22 */
    WHEN EXISTS (
      SELECT 1
      FROM ccod_full_2025_12 c
      WHERE c.title_number = n.title_no
        AND c.proprietor_name_1 ILIKE '% dioc%'
        AND c.proprietor_name_1 NOT ILIKE '%catholic%'
    ) THEN 123112

    /* 21 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%church commission%')
    THEN 123111

    /* 20 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '%national trust%' AND c.proprietor_name_1 NOT ILIKE '%first%')
    THEN 123200

    /* 19 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['% CIC%','% community interest company%']))
    THEN 123300

    /* 18 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['% CIO%','% charitable%','% charity%','% CCLG%']))
    THEN 123400

    /* 17 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND (c.proprietor_name_1 ILIKE '%MOST EXCELLENT MAJESTY%' OR c.proprietor_name_1 ILIKE '%CROWN ESTATE%'))
    THEN 124000

    /* 16 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE '% UNIVERSITY%')
    THEN 125000

    /* 15 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no AND c.proprietor_name_1 ILIKE ANY (ARRAY['% LTD%','% PLC%','% LIMITED%','% LLC%','% LLP%']))
    THEN 122000

    /* 14 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
    THEN 123000

    /* 13–5 (OCOD top countries; only if NOT in CCOD) */
    WHEN EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'CAYMAN ISLANDS')
     AND NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
    THEN 131900

    WHEN EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'HONG KONG')
     AND NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
    THEN 131800

    WHEN EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'GIBRALTAR')
     AND NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
    THEN 131700

    WHEN EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'LUXEMBOURG')
     AND NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
    THEN 131600

    WHEN EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'SINGAPORE')
     AND NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
    THEN 131500

    WHEN EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'ISLE OF MAN')
     AND NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
    THEN 131400

    WHEN EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'GUERNSEY')
     AND NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
    THEN 131300

    WHEN EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'BRITISH VIRGIN ISLANDS')
     AND NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
    THEN 131200

    WHEN EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no AND o.country_incorporated_1 = 'JERSEY')
     AND NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
    THEN 131100

    /* 4 */
    WHEN NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
     AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no)
    THEN 132000

    /* 3 */
    WHEN EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
    THEN 120000

    /* 2 */
    WHEN NOT EXISTS (SELECT 1 FROM ccod_full_2025_12 c WHERE c.title_number = n.title_no)
     AND EXISTS (SELECT 1 FROM ocod_full_2025_12 o WHERE o.title_number = n.title_no)
    THEN 130000

    /* 1 */
    ELSE 110000
END as cat FROM lr_poly_f n;

CREATE MATERIALIZED VIEW mv_nps_categorised AS
SELECT * FROM vw_nps_categorised;

CREATE INDEX idx_mv_cat ON mv_nps_categorised(cat);