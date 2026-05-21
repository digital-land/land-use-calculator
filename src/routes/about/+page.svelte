<svelte:head>
  <title>About and user guide</title>
  <meta
    name="description"
    content="About the Development Land Analysis Platform and how to use it."
  />
</svelte:head>
<div class="govuk-width-container govuk-main-wrapper govuk-main-wrapper--l">
  <h2 class="govuk-heading-l">About</h2>
  <p class="govuk-body">
    This tool brings together datasets on land use and development constraints
    to provide statistical insight into land supply in England. It is designed
    to show how physical constraints, planning restrictions and land use
    trade-offs overlap and impact the overall supply of land for various uses.
  </p>

  <h2 class="govuk-heading-l">User guide</h2>
  <p class="govuk-body">
    Select an area to explore on the map by using the drop-down menu. The map
    and table data will update to show land availability and constraints for
    your selected area.
  </p>
  <p class="govuk-body">
    Using the filters on the left hand side, select the categories you would
    like to include in the map. Statutorily Protected Areas, Locally or
    Regionally Selected Areas, Infrastructure Constraints and Natural Physical
    Constraints are pre-selected categories. You can deselect individual layers
    by unticking the corresponding boxes, or by selecting ‘Clear all filters’.
  </p>
  <p class="govuk-body">
    You can upload a local file (e.g., a shapefile or GeoJSON) to add additional
    layers to the map. Your data will be added as a temporary layer on top of
    the existing map. It will not be saved to the tool or stored on any server.
  </p>
  <p class="govuk-body">
    Click the ‘Export CSV’ button to download the data table.
  </p>

<hr/>

<div class="govuk-body">
<h1>Methodology</h1>
<h2>Land Ownership Categorisation Methodology</h2>

<p>
This document describes the methodology used to classify land ownership records into a structured taxonomy of ownership types.
The categorisation is applied to HM Land Registry polygon data, enriched with corporate ownership data from:
</p>

<ul>
  <li>Corporate & Commercial Ownership Data (CCOD)</li>
  <li>Overseas Corporate Ownership Data (OCOD)</li>
</ul>

<p>
The objective is to produce a reproducible, explainable classification of land ownership across public, private, and institutional sectors.
</p>

---

<h2>1. Data Preparation</h2>

<p>
A new working table (<code>nps_categorised</code>) is created from the base land parcel dataset. Each record is assigned a <code>cat</code> field which is progressively populated through a sequence of update statements.
</p>

<ul>
  <li>Each record is linked to CCOD and OCOD via <code>title_number</code></li>
  <li>All categorisation is performed using deterministic SQL rules</li>
  <li>Later rules overwrite earlier ones to enforce hierarchy and precedence</li>
</ul>

---

<h2>2. High-Level Classification Structure</h2>

<p>
The classification follows a top-level hierarchy:
</p>

<ul>
  <li><strong>Private individuals</strong></li>
  <li><strong>UK corporate entities</strong></li>
  <li><strong>Overseas corporate entities</strong></li>
  <li><strong>Public sector organisations</strong></li>
  <li><strong>Non-profit and institutional ownership</strong></li>
</ul>

---

<h2>3. Private and Corporate Ownership</h2>

<h3>3.1 Private Individuals</h3>
<p>
Titles not present in either CCOD or OCOD are classified as private individuals.
</p>

<h3>3.2 UK Corporate</h3>
<p>
Titles appearing in CCOD are classified as UK corporate.
</p>

<h3>3.3 Overseas Corporate</h3>
<p>
Titles appearing in OCOD but not CCOD are classified as overseas corporate.  
Major jurisdictions are identified explicitly (e.g. Jersey, BVI, Guernsey, etc.), with remaining countries grouped into an “other” category.
</p>

---

<h2>4. Corporate Subclassification</h2>

<h3>4.1 Private Sector Companies</h3>
<p>
Identified using company suffixes such as:
</p>

<ul>
  <li>Ltd / Limited</li>
  <li>PLC</li>
  <li>LLP / LLC</li>
</ul>

<h3>4.2 Universities</h3>
<p>
Detected using keyword matching on “UNIVERSITY”.
</p>

<h3>4.3 Crown Estate</h3>
<p>
Identified using standard Crown ownership phrasing (e.g. “Most Excellent Majesty”).
</p>

---

<h2>5. Non-Profit and Institutional Ownership</h2>

<h3>5.1 Charities and Housing Associations</h3>
<p>
Identified using terms such as:
</p>

<ul>
  <li>charity</li>
  <li>charitable</li>
  <li>housing association / housing trust</li>
  <li>CIO / alms</li>
</ul>

<h3>5.2 Community Interest Companies</h3>
<p>
Detected via “CIC” or “community interest company”.
</p>

<h3>5.3 National Trust</h3>
<p>
Explicit matching is used to identify National Trust ownership.
</p>

<h3>5.4 Religious Organisations</h3>
<p>
A three-level hierarchy is used:
</p>

<ul>
  <li>Church Commissioners (highest priority)</li>
  <li>Dioceses</li>
  <li>Other religious organisations (broad keyword matching across denominations)</li>
</ul>

---

<h2>6. Public Sector Classification</h2>

<h3>6.1 Public Agencies</h3>
<p>
Specific national agencies are identified individually, including:
</p>

<ul>
  <li>National Highways</li>
  <li>Homes England</li>
  <li>Historic England</li>
  <li>Network Rail</li>
</ul>

<h3>6.2 Emergency Services</h3>
<p>
Police, fire, and ambulance services are classified using keyword matching.
</p>

<h3>6.3 Central Government</h3>
<p>
Identified using references to:
</p>

<ul>
  <li>Secretary of State</li>
  <li>Government departments</li>
  <li>Ministries</li>
</ul>

<p>
Subcategories (e.g. defence, transport, environment, health) are derived from keywords within the organisation name.
</p>

---

<h2>7. Local Government Classification</h2>

<h3>7.1 Overview</h3>

<p>
Local authority ownership is identified using:
</p>

<ul>
  <li><code>proprietorship_category_1</code> field</li>
  <li>Text patterns such as “COUNCIL”</li>
</ul>

<p>
Subcategories include:
</p>

<ul>
  <li>County councils</li>
  <li>District councils</li>
  <li>Parish and town councils</li>
  <li>Combined authorities</li>
  <li>Greater London Authority</li>
  <li>Other local authorities</li>
</ul>

---

<h3>7.2 Unitary Authority Classification (Key Methodological Step)</h3>

<p>
Land Registry records the name of the owner at the time of registration.  
Following local government reorganisation, many areas have transitioned from two-tier (county/district) systems to single-tier unitary authorities.
</p>

<p>
As a result, land may still be registered under predecessor authorities.
</p>

<p>
To address this:
</p>

<ul>
  <li>A controlled list of <strong>unitary authority area tokens</strong> is defined</li>
  <li>If a land title is owned by a local authority whose name contains one of these tokens, it is classified as a unitary authority</li>
</ul>

<p>
This ensures that:
</p>

<ul>
  <li>Legacy ownership records are aligned with current administrative structures</li>
  <li>Land owned by abolished councils is attributed to their successor unitary authorities</li>
</ul>

<p>
Strict filtering is applied to avoid false positives:
</p>

<ul>
  <li>Parish and town councils are excluded</li>
  <li>Religious entities are excluded</li>
  <li>Only records consistent with local authority ownership patterns are included</li>
</ul>

---

<h2>8. Classification Ordering and Precedence</h2>

<p>
The order of rules is critical:
</p>

<ul>
  <li>Broad categories are assigned first</li>
  <li>Specific categories overwrite earlier assignments</li>
  <li>Local government is resolved after central government and agencies</li>
  <li>Parish/town categories are applied after other local authority classifications</li>
</ul>

<p>
This ensures consistent and deterministic assignment of each record to a single category.
</p>

---

<h2>9. Data Cleaning and Finalisation</h2>

<ul>
  <li>Any remaining null categories are assigned to private individuals</li>
  <li>Records associated with mineral rights are removed</li>
  <li>Summary statistics are generated for QA and validation</li>
</ul>

---

<h2>10. Quality Assurance</h2>

<p>
The categorisation is validated using:
</p>

<ul>
  <li>Aggregate counts and land area totals by category</li>
  <li>Sampling of example ownership records per category</li>
  <li>Iterative refinement of classification rules</li>
</ul>

<p>
Special attention is given to:
</p>

<ul>
  <li>Misclassification between local authority types</li>
  <li>Overlap between corporate and non-profit entities</li>
  <li>Edge cases such as legacy naming and merged authorities</li>
</ul>

---

<h2>11. Limitations</h2>

<ul>
  <li>Ownership reflects <strong>registered title holders</strong>, not necessarily current operational control</li>
  <li>Text-based classification may be sensitive to naming variations</li>
  <li>Some organisations span multiple categories and are simplified into a single classification</li>
</ul>

---

<h2>12. Summary</h2>

<p>
This methodology provides a robust, reproducible framework for classifying land ownership across England.
It combines:
</p>

<ul>
  <li>Deterministic rule-based classification</li>
  <li>Hierarchical category design</li>
  <li>Explicit handling of structural changes (e.g. local government reorganisation)</li>
</ul>

<p>
The result is a transparent and auditable categorisation of land ownership suitable for analytical and policy use.
</p>
</div>
</div>