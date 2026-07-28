import type { ContentSection } from "$lib/utils";

export const aboutPageContent: ContentSection[] = [
  {
    title: "About",
    id: "about",
    level: 2,
    blocks: [
      {
        type: "paragraph",
        html: "This tool brings together datasets on land use and development constraints to provide statistical insight into land supply in England. It is designed to show how physical constraints, planning restrictions and land use trade-offs overlap and impact the overall supply of land for various uses.",
      },
    ],
  },
  {
    title: "User guide",
    id: "user-guide",
    level: 2,
    blocks: [
      {
        type: "paragraph",
        html: "Select an area to explore on the map by using the drop-down menu. The map and table data will update to show land availability and constraints for your selected area.",
      },
      {
        type: "paragraph",
        html: "Using the filters on the left hand side, select the categories you would like to include in the map. Statutorily Protected Areas, Locally or Regionally Selected Areas, Infrastructure Constraints and Natural Physical Constraints are pre-selected categories. You can deselect individual layers by unticking the corresponding boxes, or by selecting ‘Clear all filters’.",
      },
      {
        type: "paragraph",
        html: "You can upload a local file, for example a shapefile or GeoJSON, to add additional layers to the map. Your data will be added as a temporary layer on top of the existing map. It will not be saved to the tool or stored on any server.",
      },
      {
        type: "paragraph",
        html: "Click the ‘Export CSV’ button to download the data table.",
      },
    ],
  },
  {
    title: "Methodology",
    id: "methodology",
    level: 2,
    children: [
      {
        title: "Rasterisation methodology and limitations",
        id: "rasterisation-methodology-and-limitations",
        level: 3,
        children: [
          {
            title: "Overview",
            id: "rasterisation-overview",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Rasterisation converts vector geometries into a regular grid of square cells, or pixels, enabling fast spatial aggregation and analysis. In this implementation, raster grids of <strong>100&nbsp;metres</strong> and <strong>10&nbsp;metres</strong> resolution are used.",
              },
              {
                type: "paragraph",
                html: "Each raster cell is assigned a value based on whether it intersects or is contained within a feature. This process introduces systematic and statistical deviations from the original vector geometries, which are described below.",
              },
            ],
          },
          {
            title: "Sources of error",
            id: "rasterisation-sources-of-error",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Rasterisation introduces three primary types of error:",
              },
              {
                type: "list",
                items: [
                  "<strong>Quantisation error</strong>: continuous geometry is approximated using discrete grid cells",
                  "<strong>Boundary error</strong>: cells partially intersecting a feature must be classified as either inside or outside",
                  "<strong>Resolution error</strong>: features smaller than the grid resolution may be distorted or lost",
                ],
              },
              {
                type: "paragraph",
                html: "These effects are inherent to all raster representations and cannot be fully eliminated.",
              },
            ],
          },
          {
            title: "Boundary-driven error",
            id: "rasterisation-boundary-driven-error",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "The dominant source of error arises at feature boundaries. The magnitude of this error is proportional to:",
              },
              {
                type: "list",
                items: [
                  "the <strong>grid cell size</strong>",
                  "the <strong>perimeter length</strong> of the feature",
                ],
              },
              {
                type: "paragraph",
                html: "This relationship can be expressed as:",
              },
              {
                type: "code",
                text: "Expected error ∝ cell size × feature perimeter",
              },
              {
                type: "paragraph",
                html: "As a result, features with complex or irregular boundaries, such as urban parcels or coastlines, are more affected than large, compact geometries.",
              },
            ],
          },
          {
            title: "Resolution comparison",
            id: "rasterisation-resolution-comparison",
            level: 4,
            blocks: [
              {
                type: "table",
                headers: ["Grid resolution", "Cell area", "Typical behaviour"],
                rows: [
                  [
                    "100&nbsp;m",
                    "10,000&nbsp;m² (1&nbsp;ha)",
                    "Larger boundary error; suitable for coarse aggregation; limited representation of fine features",
                  ],
                  [
                    "10&nbsp;m",
                    "100&nbsp;m² (0.01&nbsp;ha)",
                    "Much lower boundary error; improved representation of parcels and narrow features; higher computational cost",
                  ],
                ],
              },
            ],
          },
          {
            title: "Area estimation accuracy",
            id: "rasterisation-area-estimation-accuracy",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Raster-based estimates of feature area deviate from true vector area depending on geometry complexity:",
              },
              {
                type: "list",
                items: [
                  "<strong>Large, compact features</strong>: low error, typically &lt;1–2% at 100&nbsp;m and &lt;0.5% at 10&nbsp;m",
                  "<strong>Irregular or fragmented features</strong>: moderate error, typically 5–15% at 100&nbsp;m",
                  "<strong>Narrow or linear features</strong>: high and unstable error, particularly at 100&nbsp;m",
                ],
              },
              {
                type: "paragraph",
                html: "Relative error can be approximated by:",
              },
              {
                type: "code",
                text: "Relative error ≈ (cell size × perimeter) / area",
              },
            ],
          },
          {
            title: "Systematic bias",
            id: "rasterisation-systematic-bias",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Rasterisation introduces systematic bias depending on how cells are classified:",
              },
              {
                type: "list",
                items: [
                  "<strong>Centroid-based assignment</strong>: tends to underestimate area",
                  "<strong>Any-overlap assignment</strong>: tends to overestimate area",
                ],
              },
              {
                type: "paragraph",
                html: "This bias is significantly larger at coarser resolutions, for example 100&nbsp;m grids, and reduces as resolution increases.",
              },
            ],
          },
          {
            title: "Feature detection limits",
            id: "rasterisation-feature-detection-limits",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "The minimum reliably detectable feature width is approximately equal to the grid resolution:",
              },
              {
                type: "list",
                items: [
                  "At 100&nbsp;m resolution, features narrower than ~100&nbsp;m may be omitted or distorted",
                  "At 10&nbsp;m resolution, features down to ~10&nbsp;m can be resolved",
                ],
              },
              {
                type: "paragraph",
                html: "This affects representation of:",
              },
              {
                type: "list",
                items: [
                  "roads and transport corridors",
                  "rivers and streams",
                  "small or fragmented land parcels",
                ],
              },
            ],
          },
          {
            title: "Practical implications",
            id: "rasterisation-practical-implications",
            level: 4,
            blocks: [
              {
                type: "list",
                items: [
                  "<strong>100&nbsp;m grids</strong> are suitable for large-scale aggregation and national-level analysis but introduce noticeable boundary error",
                  "<strong>10&nbsp;m grids</strong> provide substantially improved spatial accuracy and are appropriate for parcel-level and land assembly analysis",
                  "Rasterisation error is highest where land ownership is fragmented or geometries are complex",
                ],
              },
            ],
          },
          {
            title: "Interpretation guidance",
            id: "rasterisation-interpretation-guidance",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Users should interpret raster-derived statistics with the following considerations:",
              },
              {
                type: "list",
                items: [
                  "Reported areas are approximations of true vector geometry",
                  "Differences between categories may be influenced by boundary effects, particularly at 100&nbsp;m resolution",
                  "Comparisons at fine spatial scales are more reliable using 10&nbsp;m data",
                ],
              },
            ],
          },
          {
            title: "Summary",
            id: "rasterisation-summary",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Rasterisation introduces predictable, boundary-driven error that scales with grid resolution and feature complexity. While 100&nbsp;m grids enable efficient large-scale analysis, they may distort fine spatial patterns. The use of 10&nbsp;m grids significantly reduces these errors and improves fidelity to underlying land parcel geometries, supporting more accurate spatial analysis.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Land ownership categorisation methodology",
    id: "land-ownership-categorisation-methodology",
    level: 2,
    blocks: [
      {
        type: "paragraph",
        html: "This document describes the methodology used to classify land ownership records into a structured taxonomy of ownership types. The categorisation is applied to HM Land Registry polygon data, enriched with corporate ownership data from:",
      },
      {
        type: "list",
        items: [
          "Corporate & Commercial Ownership Data (CCOD)",
          "Overseas Corporate Ownership Data (OCOD)",
        ],
      },
      {
        type: "paragraph",
        html: "The objective is to produce a reproducible, explainable classification of land ownership across public, private, and institutional sectors.",
      },
    ],
    children: [
      {
        title: "Data preparation",
        id: "land-ownership-data-preparation",
        level: 3,
        blocks: [
          {
            type: "paragraph",
            html: "A new working table, <code>nps_categorised</code>, is created from the base land parcel dataset. Each record is assigned a <code>cat</code> field which is progressively populated through a sequence of update statements.",
          },
          {
            type: "list",
            items: [
              "Each record is linked to CCOD and OCOD via <code>title_number</code>",
              "All categorisation is performed using deterministic SQL rules",
              "Later rules overwrite earlier ones to enforce hierarchy and precedence",
            ],
          },
        ],
      },
      {
        title: "High-level classification structure",
        id: "land-ownership-high-level-classification-structure",
        level: 3,
        blocks: [
          {
            type: "paragraph",
            html: "The classification follows a top-level hierarchy:",
          },
          {
            type: "list",
            items: [
              "<strong>Private individuals</strong>",
              "<strong>UK corporate entities</strong>",
              "<strong>Overseas corporate entities</strong>",
              "<strong>Public sector organisations</strong>",
              "<strong>Non-profit and institutional ownership</strong>",
            ],
          },
        ],
      },
      {
        title: "Private and corporate ownership",
        id: "land-ownership-private-and-corporate-ownership",
        level: 3,
        children: [
          {
            title: "Private individuals",
            id: "land-ownership-private-individuals",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Titles not present in either CCOD or OCOD are classified as private individuals.",
              },
            ],
          },
          {
            title: "UK corporate",
            id: "land-ownership-uk-corporate",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Titles appearing in CCOD are classified as UK corporate.",
              },
            ],
          },
          {
            title: "Overseas corporate",
            id: "land-ownership-overseas-corporate",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Titles appearing in OCOD but not CCOD are classified as overseas corporate. Major jurisdictions are identified explicitly, for example Jersey, BVI and Guernsey, with remaining countries grouped into an “other” category.",
              },
            ],
          },
        ],
      },
      {
        title: "Corporate subclassification",
        id: "land-ownership-corporate-subclassification",
        level: 3,
        children: [
          {
            title: "Private sector companies",
            id: "land-ownership-private-sector-companies",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Identified using company suffixes such as:",
              },
              {
                type: "list",
                items: ["Ltd / Limited", "PLC", "LLP / LLC"],
              },
            ],
          },
          {
            title: "Universities",
            id: "land-ownership-universities",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Detected using keyword matching on “UNIVERSITY”.",
              },
            ],
          },
          {
            title: "Crown Estate",
            id: "land-ownership-crown-estate",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Identified using standard Crown ownership phrasing, for example “Most Excellent Majesty”.",
              },
            ],
          },
        ],
      },
      {
        title: "Non-profit and institutional ownership",
        id: "land-ownership-non-profit-and-institutional-ownership",
        level: 3,
        children: [
          {
            title: "Charities and housing associations",
            id: "land-ownership-charities-and-housing-associations",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Identified using terms such as:",
              },
              {
                type: "list",
                items: [
                  "charity",
                  "charitable",
                  "housing association / housing trust",
                  "CIO / alms",
                ],
              },
            ],
          },
          {
            title: "Community interest companies",
            id: "land-ownership-community-interest-companies",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: 'Detected via "CIC" or "community interest company".',
              },
            ],
          },
          {
            title: "National Trust",
            id: "land-ownership-national-trust",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Explicit matching is used to identify National Trust ownership.",
              },
            ],
          },
          {
            title: "Religious organisations",
            id: "land-ownership-religious-organisations",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "A three-level hierarchy is used:",
              },
              {
                type: "list",
                items: [
                  "Church Commissioners (highest priority)",
                  "Dioceses",
                  "Other religious organisations (broad keyword matching across denominations)",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "Public sector classification",
        id: "land-ownership-public-sector-classification",
        level: 3,
        children: [
          {
            title: "Public agencies",
            id: "land-ownership-public-agencies",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Specific national agencies are identified individually, including:",
              },
              {
                type: "list",
                items: [
                  "National Highways",
                  "Homes England",
                  "Historic England",
                  "Network Rail",
                ],
              },
            ],
          },
          {
            title: "Emergency services",
            id: "land-ownership-emergency-services",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Police, fire, and ambulance services are classified using keyword matching.",
              },
            ],
          },
          {
            title: "Central government",
            id: "land-ownership-central-government",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Identified using references to:",
              },
              {
                type: "list",
                items: [
                  "Secretary of State",
                  "Government departments",
                  "Ministries",
                ],
              },
              {
                type: "paragraph",
                html: "Subcategories such as defence, transport, environment and health are derived from keywords within the organisation name.",
              },
            ],
          },
        ],
      },
      {
        title: "Local government classification",
        id: "land-ownership-local-government-classification",
        level: 3,
        children: [
          {
            title: "Overview",
            id: "land-ownership-local-government-overview",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Local authority ownership is identified using:",
              },
              {
                type: "list",
                items: [
                  "<code>proprietorship_category_1</code> field",
                  'Text patterns such as "COUNCIL"',
                ],
              },
              {
                type: "paragraph",
                html: "Subcategories include:",
              },
              {
                type: "list",
                items: [
                  "County councils",
                  "District councils",
                  "Parish and town councils",
                  "Combined authorities",
                  "Greater London Authority",
                  "Other local authorities",
                ],
              },
            ],
          },
          {
            title: "Unitary authority classification (key methodological step)",
            id: "land-ownership-unitary-authority-classification",
            level: 4,
            blocks: [
              {
                type: "paragraph",
                html: "Land Registry records the name of the owner at the time of registration. Following local government reorganisation, many areas have transitioned from two-tier county and district systems to single-tier unitary authorities.",
              },
              {
                type: "paragraph",
                html: "As a result, land may still be registered under predecessor authorities.",
              },
              {
                type: "paragraph",
                html: "To address this:",
              },
              {
                type: "list",
                items: [
                  "A controlled list of <strong>unitary authority area tokens</strong> is defined",
                  "If a land title is owned by a local authority whose name contains one of these tokens, it is classified as a unitary authority",
                ],
              },
              {
                type: "paragraph",
                html: "This ensures that:",
              },
              {
                type: "list",
                items: [
                  "Legacy ownership records are aligned with current administrative structures",
                  "Land owned by abolished councils is attributed to their successor unitary authorities",
                ],
              },
              {
                type: "paragraph",
                html: "Strict filtering is applied to avoid false positives:",
              },
              {
                type: "list",
                items: [
                  "Parish and town councils are excluded",
                  "Religious entities are excluded",
                  "Only records consistent with local authority ownership patterns are included",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "Classification ordering and precedence",
        id: "land-ownership-classification-ordering-and-precedence",
        level: 3,
        blocks: [
          {
            type: "paragraph",
            html: "The order of rules is critical:",
          },
          {
            type: "list",
            items: [
              "Broad categories are assigned first",
              "Specific categories overwrite earlier assignments",
              "Local government is resolved after central government and agencies",
              "Parish and town categories are applied after other local authority classifications",
            ],
          },
          {
            type: "paragraph",
            html: "This ensures consistent and deterministic assignment of each record to a single category.",
          },
        ],
      },
      {
        title: "Data cleaning and finalisation",
        id: "land-ownership-data-cleaning-and-finalisation",
        level: 3,
        blocks: [
          {
            type: "list",
            items: [
              "Any remaining null categories are assigned to private individuals",
              "Records associated with mineral rights are removed",
              "Summary statistics are generated for QA and validation",
            ],
          },
        ],
      },
      {
        title: "Quality assurance",
        id: "land-ownership-quality-assurance",
        level: 3,
        blocks: [
          {
            type: "paragraph",
            html: "The categorisation is validated using:",
          },
          {
            type: "list",
            items: [
              "Aggregate counts and land area totals by category",
              "Sampling of example ownership records per category",
              "Iterative refinement of classification rules",
            ],
          },
          {
            type: "paragraph",
            html: "Special attention is given to:",
          },
          {
            type: "list",
            items: [
              "Misclassification between local authority types",
              "Overlap between corporate and non-profit entities",
              "Edge cases such as legacy naming and merged authorities",
            ],
          },
        ],
      },
      {
        title: "Limitations",
        id: "land-ownership-limitations",
        level: 3,
        blocks: [
          {
            type: "list",
            items: [
              "Ownership reflects <strong>registered title holders</strong>, not necessarily current operational control",
              "Text-based classification may be sensitive to naming variations",
              "Some organisations span multiple categories and are simplified into a single classification",
            ],
          },
        ],
      },
      {
        title: "Summary",
        id: "land-ownership-summary",
        level: 3,
        blocks: [
          {
            type: "paragraph",
            html: "This methodology provides a robust, reproducible framework for classifying land ownership across England.",
          },
          {
            type: "paragraph",
            html: "It combines:",
          },
          {
            type: "list",
            items: [
              "Deterministic rule-based classification",
              "Hierarchical category design",
              "Explicit handling of structural changes, such as local government reorganisation",
            ],
          },
          {
            type: "paragraph",
            html: "The result is a transparent and auditable categorisation of land ownership suitable for analytical and policy use.",
          },
        ],
      },
    ],
  },
];
