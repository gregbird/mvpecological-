/**
 * AA Screening (Appropriate Assessment Screening) Report Template
 * Article 6(3) Habitats Directive with {{placeholder}} variables
 * for automatic population from project data.
 */

export interface AaScreeningTemplateSection {
  id: string
  title: string
  template: string
}

export const AA_SCREENING_TEMPLATE_SECTIONS: AaScreeningTemplateSection[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    template: `### 1.1 Background

This Appropriate Assessment (AA) Screening Report has been prepared for **{{project_name}}** located at {{location_description}}. The site is referenced under site code {{site_code}} at Irish Grid Reference {{grid_reference}}.

### 1.2 Legislative Context

This report has been prepared in accordance with:

- **Article 6(3) of the EU Habitats Directive (92/43/EEC)** — requiring screening of plans and projects for likely significant effects on European sites
- **Part XAB of the Planning and Development Act 2000** (as amended) — transposing Article 6(3) into Irish law
- **European Communities (Birds and Natural Habitats) Regulations 2011** (S.I. No. 477 of 2011)
- **DoEHLG (2010)** *Appropriate Assessment of Plans and Projects in Ireland — Guidance for Planning Authorities*
- **European Commission (2021)** *Assessment of Plans and Projects in Relation to Natura 2000 Sites — Methodological Guidance*

### 1.3 Purpose of Screening

The purpose of AA Screening is to determine whether the proposed development, individually or in combination with other plans or projects, is likely to have a significant effect on any European site (SAC or SPA) in view of the site's conservation objectives. Following the precautionary principle established in *People Over Wind* (CJEU C-323/17), mitigation measures designed to avoid or reduce effects on European sites are not considered at the screening stage.

### 1.4 Source-Pathway-Receptor Model

The assessment applies the source-pathway-receptor model to identify potential impact pathways between the proposed development (source) and European sites (receptors) via connecting pathways (e.g., hydrological links, species mobility, airborne emissions).`,
  },
  {
    id: 'site_description',
    title: '2. Site & Project Description',
    template: `### 2.1 Site Location

The proposed development is located at {{location_description}}, Irish Grid Reference {{grid_reference}}.

### 2.2 Project Description

*[Description of the proposed development — type, scale, construction methodology, operational characteristics]*

### 2.3 Receiving Environment

The site is characterised by the following habitats and land use:

{{habitat_table}}

### 2.4 Hydrological Environment

*[Description of surface water features, drainage patterns, and hydrological connectivity to designated sites. Include watercourse names, catchment information, and downstream Natura 2000 sites]*

### 2.5 Data Sources

The following data sources were consulted to inform this screening:

{{desk_sources_summary}}`,
  },
  {
    id: 'natura_sites',
    title: '3. Natura 2000 Sites',
    template: `### 3.1 Identification of European Sites

European sites (SACs and SPAs) within the Zone of Influence have been identified based on:

- Proximity to the proposed development
- Hydrological connectivity (surface water and groundwater pathways)
- Species mobility (qualifying species that may utilise the site or surrounding area)
- Potential for airborne effects (dust, emissions)

### 3.2 European Sites Within Zone of Influence

{{designated_sites_table}}

### 3.3 Qualifying Interests & Conservation Objectives

For each European site identified, the qualifying interests (SACs) and special conservation interests (SPAs) are detailed below with their current conservation status and site-specific conservation objectives.

*[To be populated with detailed qualifying interests per site — habitat codes, species, conservation status, and NPWS conservation objective attributes]*`,
  },
  {
    id: 'significant_effects',
    title: '4. Assessment of Likely Significant Effects',
    template: `### 4.1 Assessment Approach

Each European site is assessed against the following potential effect categories, applying the precautionary principle:

- **Habitat loss or degradation** — direct loss of qualifying habitats within or supporting the site
- **Species disturbance** — disturbance to qualifying species during construction or operation
- **Water quality impacts** — changes to water quality affecting aquatic habitats or species
- **Hydrological changes** — alterations to water levels, flow patterns, or drainage
- **Air quality effects** — dust deposition, emissions affecting sensitive habitats
- **Introduced/invasive species** — introduction or spread of non-native species

### 4.2 Assessment Matrix

| European Site | QI/SCI | Effect Pathway | Likely Significant Effect? | Reasoning |
|--------------|--------|----------------|---------------------------|-----------|
| *[To be populated based on site-specific assessment]* | | | | |

### 4.3 Detailed Assessment

*[For each European site, provide a detailed assessment of potential effects on each qualifying interest, considering the source-pathway-receptor model and the conservation objectives of the site]*`,
  },
  {
    id: 'in_combination',
    title: '5. In-Combination Assessment',
    template: `### 5.1 Approach

In accordance with Article 6(3), the potential for the proposed development to contribute to cumulative or in-combination effects with other plans and projects has been assessed.

### 5.2 Plans and Projects Considered

The following plans and projects have been identified as potentially relevant to in-combination effects:

- **County/City Development Plan** — zoning and development objectives in the area
- **Local Area Plans** — specific development plans for the local area
- **Planning applications** — recent and pending applications within the Zone of Influence
- **Infrastructure projects** — roads, water/wastewater, energy projects
- **Other plans** — River Basin Management Plans, Flood Risk Management Plans

### 5.3 In-Combination Assessment

*[Assessment of whether the proposed development, in combination with identified plans and projects, could have likely significant effects on any European site]*`,
  },
  {
    id: 'conclusion',
    title: '6. Screening Conclusion',
    template: `### 6.1 Summary of Findings

This AA Screening has assessed the proposed development at **{{project_name}}** for likely significant effects on European sites within the Zone of Influence.

### 6.2 Screening Determination

Following the assessment above and applying the precautionary principle as established in *Kelly v. An Bord Pleanála* [2014] IEHC 400 and *People Over Wind and Sweetman v. Coillte* [CJEU C-323/17]:

*[One of the following conclusions:]*

**Option A — No Likely Significant Effects:**
It is concluded, on the basis of objective scientific information, that the proposed development, individually or in combination with other plans or projects, is not likely to have a significant effect on any European site. Accordingly, Stage 2 Appropriate Assessment (Natura Impact Statement) is not required.

**Option B — Likely Significant Effects Cannot Be Excluded:**
It cannot be excluded, on the basis of objective scientific information, that the proposed development, individually or in combination with other plans or projects, may have a significant effect on [European site name(s)]. Accordingly, Stage 2 Appropriate Assessment is required, and a Natura Impact Statement must be prepared.

### 6.3 Recommendation

*[Clear recommendation on the requirement for Stage 2 AA and NIS preparation]*`,
  },
]
