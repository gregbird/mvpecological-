/**
 * EcIA (Ecological Impact Assessment) Report Template
 * CIEEM (2018) EcIA Guidelines with {{placeholder}} variables
 * for automatic population from project data.
 */

export interface EciaTemplateSection {
  id: string
  title: string
  template: string
}

export const ECIA_TEMPLATE_SECTIONS: EciaTemplateSection[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    template: `### 1.1 Project Background

This Ecological Impact Assessment (EcIA) has been prepared for **{{project_name}}** located at {{location_description}}. The site is referenced under site code {{site_code}} at Irish Grid Reference {{grid_reference}}.

This EcIA has been prepared as part of the Environmental Impact Assessment (EIA) process in accordance with the EIA Directive (2014/52/EU) and the European Union (Environmental Impact Assessment) Regulations 2024.

### 1.2 Terms of Reference

The purpose of this EcIA is to:

- Establish the ecological baseline of the site and surrounding area
- Identify and evaluate important ecological features (receptors)
- Assess the potential ecological effects of the proposed development
- Propose measures to avoid, reduce, and compensate for ecological effects
- Determine the residual significance of ecological effects

### 1.3 Legislative & Policy Framework

This assessment has been prepared with reference to:

- **EIA Directive (2014/52/EU)** — as transposed by the European Union (EIA) Regulations 2024
- **EU Habitats Directive (92/43/EEC)** — conservation of natural habitats and species of Community interest
- **EU Birds Directive (2009/147/EC)** — conservation of wild birds
- **Wildlife Acts 1976–2021** — protection for wildlife species and habitats in Ireland
- **European Communities (Birds and Natural Habitats) Regulations 2011** (S.I. No. 477 of 2011)
- **Flora (Protection) Order 2022** (S.I. No. 235 of 2022)
- **Water Framework Directive (2000/60/EC)**
- **Guidelines for Ecological Impact Assessment in the UK and Ireland (CIEEM, 2018)**
- **EPA Guidelines on the Information to be Contained in EIARs (2022)**

### 1.4 Report Structure

This EcIA follows the CIEEM (2018) standard structure:

1. **Introduction** — project background, terms of reference, legislative framework
2. **Methodology** — desk study sources, field survey methods, impact assessment framework
3. **Baseline Ecological Environment** — designated sites, habitats, flora, fauna
4. **Assessment of Effects** — impact characterisation and significance determination
5. **Mitigation & Enhancement** — measures following the mitigation hierarchy
6. **Residual Effects** — effects after mitigation implementation
7. **Conclusions** — overall statement of ecological significance
8. **Appendices** — maps, species lists, survey data`,
  },
  {
    id: 'methodology',
    title: '2. Methodology',
    template: `### 2.1 Desk Study

A comprehensive desk study was undertaken to gather existing ecological information for the site and surrounding area. The following data sources were consulted:

{{desk_sources_summary}}

### 2.2 Field Surveys

{{survey_details}}

### 2.3 Relevé Vegetation Surveys

{{releve_details}}

### 2.4 Habitat Classification

Habitats were classified in accordance with **Fossitt (2000)** *A Guide to Habitats in Ireland*. Habitat mapping was carried out using aerial photography interpretation and field verification.

### 2.5 Impact Assessment Methodology

The impact assessment follows **CIEEM (2018)** *Guidelines for Ecological Impact Assessment in the UK and Ireland*. Effects are characterised by:

- **Magnitude** — the size or amount of change
- **Extent** — the area over which the effect occurs
- **Duration** — the time for which the effect is expected to last
- **Reversibility** — whether the effect is permanent or temporary
- **Frequency** — how often the effect occurs
- **Timing** — whether the effect coincides with sensitive periods

### 2.6 Geographic Frame of Reference

Ecological receptors are evaluated within the following geographic frames of reference:

| Frame | Description |
|-------|-------------|
| International | Important at EU/global level (e.g., Natura 2000 qualifying interests) |
| National | Important in the context of Ireland (e.g., nationally rare habitats) |
| County | Important in the county context |
| Local (Higher) | Important at the local landscape scale |
| Local (Lower) | Important within the immediate site area |

### 2.7 Zone of Influence

The Zone of Influence (ZoI) has been determined for each ecological receptor based on the nature of the proposed development, the sensitivity of the receptor, and the potential pathways for effects. The ZoI varies by receptor type and is defined in each relevant section.

### 2.8 Limitations

The findings of this assessment are based on conditions observed at the time of survey and data available from desk study sources. Seasonal constraints and survey limitations are noted where relevant.`,
  },
  {
    id: 'baseline',
    title: '3. Baseline Ecological Environment',
    template: `### 3.1 Designated Sites

The following designated sites were identified within the Zone of Influence:

{{designated_sites_table}}

### 3.2 Habitats

The following habitat types were recorded within the site boundary, classified according to Fossitt (2000):

{{habitat_table}}

### 3.3 Flora & Invasive Species

{{flora_summary}}

### 3.4 Fauna

{{fauna_summary}}

### 3.5 Ecological Corridors & Connectivity

*[To be completed based on landscape connectivity analysis — hedgerows, watercourses, treelines connecting the site to wider ecological network]*`,
  },
  {
    id: 'assessment',
    title: '4. Assessment of Effects',
    template: `### 4.1 Construction Phase Effects

The following potential ecological effects have been identified during the construction phase:

| Receptor | Effect | Characterisation | Significance (Pre-mitigation) |
|----------|--------|------------------|-------------------------------|
| *[To be populated based on baseline data and development proposals]* | | | |

### 4.2 Operational Phase Effects

| Receptor | Effect | Characterisation | Significance (Pre-mitigation) |
|----------|--------|------------------|-------------------------------|
| *[To be populated based on baseline data and development proposals]* | | | |

### 4.3 Cumulative & In-Combination Effects

Cumulative effects have been assessed considering other plans and projects within the Zone of Influence, including relevant planning applications, development plans, and infrastructure projects.

### 4.4 Summary of Effects

{{constraints_table}}`,
  },
  {
    id: 'mitigation',
    title: '5. Mitigation & Enhancement',
    template: `### 5.1 Mitigation Hierarchy

Mitigation measures follow the standard hierarchy:

1. **Avoidance** — design changes to eliminate impacts on sensitive receptors
2. **Reduction** — measures to minimise the magnitude or duration of unavoidable impacts
3. **Remediation** — restoration or rehabilitation of affected habitats
4. **Compensation** — offsetting residual impacts through habitat creation or enhancement

### 5.2 Construction Phase Mitigation

- Implementation of a Construction Environmental Management Plan (CEMP)
- Appointment of an Ecological Clerk of Works (ECoW)
- Seasonal timing restrictions for vegetation clearance (outside 1 March – 31 August)
- Pollution prevention measures (silt fencing, interceptor drains, spill kits)
- Exclusion zones around sensitive ecological features

### 5.3 Operational Phase Mitigation

*[To be completed based on identified operational effects]*

### 5.4 Biodiversity Enhancement

In accordance with best practice and the National Biodiversity Action Plan:

- Native species planting using locally sourced stock
- Habitat creation and enhancement opportunities
- Installation of bat and bird boxes where appropriate
- Green infrastructure integration
- Long-term habitat management prescriptions

### 5.5 Monitoring

A post-construction ecological monitoring programme will be implemented to verify the effectiveness of mitigation measures and inform adaptive management.`,
  },
  {
    id: 'residual',
    title: '6. Residual Effects',
    template: `### 6.1 Residual Effects Summary

The following table summarises the residual ecological effects after implementation of all mitigation measures:

| Receptor | Importance | Effect | Pre-mitigation Significance | Mitigation | Residual Significance |
|----------|-----------|--------|----|----|-----|
| *[To be populated based on assessment outcomes]* | | | | | |

### 6.2 Statement on Residual Significance

*[Overall statement on whether any significant residual effects remain after mitigation]*`,
  },
  {
    id: 'conclusions',
    title: '7. Conclusions',
    template: `### 7.1 Summary of Key Findings

This EcIA has assessed the potential ecological effects of the proposed development at **{{project_name}}**. The assessment has characterised the baseline ecological environment, identified important ecological receptors, assessed potential effects, and proposed measures to avoid, reduce, and compensate for ecological impacts.

### 7.2 Statement of Ecological Significance

*[Overall statement on the significance of ecological effects, compliance with legislation, and adequacy of proposed mitigation]*

### 7.3 Further Survey Requirements

*[Identify any additional surveys required to address data gaps or seasonal constraints]*

### 7.4 Compliance Statement

This EcIA has been prepared in accordance with CIEEM (2018) guidelines and satisfies the requirements of Chapter 7 (Biodiversity) of the Environmental Impact Assessment Report (EIAR).`,
  },
  {
    id: 'appendices',
    title: '8. Appendices',
    template: `The following appendices accompany this report:

- **Appendix A: Site Location Map** — showing the site boundary, buffer zones, and Zone of Influence
- **Appendix B: Habitat Map** — habitats classified according to Fossitt (2000)
- **Appendix C: Designated Sites Map** — SACs, SPAs, NHAs, and pNHAs within the ZoI
- **Appendix D: Species List** — comprehensive list of species recorded, with conservation status
- **Appendix E: Site Photographs** — representative photographs of habitats and features
- **Appendix F: Survey Datasheets** — field survey data forms and records
- **Appendix G: CEMP Outline** — Construction Environmental Management Plan outline

*Note: Appendix contents are generated from project data collected during Steps 1–7 of the assessment workflow.*`,
  },
]
