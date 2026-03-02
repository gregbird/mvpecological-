/**
 * PEA (Preliminary Ecological Appraisal) Report Template
 * CIEEM-standard boilerplate text with {{placeholder}} variables
 * for automatic population from project data.
 */

export interface PeaTemplateSection {
  id: string
  title: string
  template: string
}

export const PEA_TEMPLATE_SECTIONS: PeaTemplateSection[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    template: `### 1.1 Project Background

This Preliminary Ecological Appraisal (PEA) has been prepared for **{{project_name}}** located at {{location_description}}. The site is referenced under site code {{site_code}} at Irish Grid Reference {{grid_reference}}.

The purpose of this PEA is to identify the ecological features and constraints of the site, assess their importance, and provide recommendations for further ecological surveys and mitigation measures where required.

### 1.2 Legislative Context

This assessment has been prepared with reference to the following legislation and guidelines:

- **Wildlife Acts 1976–2021** — providing protection for wildlife species and habitats in Ireland
- **European Communities (Birds and Natural Habitats) Regulations 2011** (S.I. No. 477 of 2011)
- **EU Habitats Directive (92/43/EEC)** — requiring the conservation of natural habitats and species of Community interest
- **EU Birds Directive (2009/147/EC)** — providing a framework for the conservation of wild birds
- **Water Framework Directive (2000/60/EC)** — establishing a framework for the protection of inland surface waters, transitional waters, coastal waters, and groundwater
- **Flora (Protection) Order 2022** (S.I. No. 235 of 2022)
- **Guidelines for Ecological Impact Assessment in the UK and Ireland (CIEEM, 2018)**

### 1.3 Report Structure

This report follows the CIEEM standard PEA structure:

1. **Introduction** — project background, legislative context, and report structure
2. **Methodology** — desk study sources, field survey methods, and limitations
3. **Results** — designated sites, habitats, flora, and fauna
4. **Ecological Constraints** — receptor importance, potential impacts, and recommended actions
5. **Discussion & Conclusions** — synthesis, further survey requirements, and enhancement opportunities
6. **Appendices** — maps, species lists, photographs, and survey datasheets`,
  },
  {
    id: 'methodology',
    title: '2. Methodology',
    template: `### 2.1 Desk Study

A comprehensive desk study was undertaken to gather existing ecological information for the site and surrounding area. The following data sources were consulted:

{{desk_sources_summary}}

### 2.2 Field Survey

{{survey_details}}

### 2.3 Relevé Vegetation Surveys

{{releve_details}}

### 2.4 Habitat Classification

Habitats were classified in accordance with **Fossitt (2000)** *A Guide to Habitats in Ireland*, the standard Irish habitat classification system. Habitat mapping was carried out using a combination of aerial photography interpretation and ground-truthing during field surveys.

### 2.5 Limitations

The findings of this assessment are based on the conditions observed at the time of the survey(s) and the data available from desk study sources. Seasonal constraints may affect the detection of certain species groups. Where data gaps are identified, recommendations for further targeted surveys are provided in Section 5.`,
  },
  {
    id: 'results',
    title: '3. Results',
    template: `### 3.1 Designated Sites

The following designated sites were identified within the study area and Zone of Influence:

{{designated_sites_table}}

### 3.2 Habitats

The following habitat types were recorded within the site boundary, classified according to Fossitt (2000):

{{habitat_table}}

### 3.3 Flora & Invasive Species

{{flora_summary}}

### 3.4 Fauna

{{fauna_summary}}`,
  },
  {
    id: 'constraints',
    title: '4. Ecological Constraints',
    template: `### 4.1 Ecological Value Assessment

The ecological value of each receptor has been assessed using standard criteria including naturalness, rarity, size/extent, diversity, fragility, and typicalness, within the appropriate geographic frame of reference (Local, County, National, International).

### 4.2 Constraints Table

{{constraints_table}}

### 4.3 Mitigation Hierarchy

Recommended actions follow the standard mitigation hierarchy:

1. **Avoidance** — design changes to avoid impacts on sensitive receptors
2. **Minimisation** — reduce the magnitude or duration of unavoidable impacts
3. **Remediation** — restore or rehabilitate affected habitats post-construction
4. **Compensation** — offset residual impacts through habitat creation or enhancement elsewhere

### 4.4 Zone of Influence

The Zone of Influence (ZoI) varies depending on the ecological receptor. For designated sites, a precautionary approach has been adopted considering hydrological connectivity, species mobility, and potential for disturbance impacts beyond the immediate site boundary.`,
  },
  {
    id: 'discussion',
    title: '5. Discussion & Conclusions',
    template: `### 5.1 Summary of Key Findings

This PEA has identified the ecological features present within and adjacent to the site at **{{project_name}}**. The desk study and field surveys have characterised the habitats, flora, and fauna assemblages, and identified designated sites within the Zone of Influence.

### 5.2 Potential Impacts

Based on the ecological constraints identified, potential impacts on ecological receptors should be considered during project design and planning. The precautionary principle should be applied where uncertainty exists regarding the significance of potential impacts.

### 5.3 Appropriate Assessment Screening

Under Article 6(3) of the EU Habitats Directive, any plan or project that is not directly connected with or necessary to the management of a Natura 2000 site, but which is likely to have a significant effect on such a site, must undergo Appropriate Assessment Screening. The proximity and connectivity of designated sites to the project site should be considered in this context.

### 5.4 Further Survey Recommendations

Based on the findings of this PEA, the following further surveys may be required to fully characterise the ecological baseline and inform project design:

*[To be completed based on identified data gaps and seasonal constraints]*

### 5.5 Enhancement Opportunities

In accordance with best practice and the National Biodiversity Action Plan, opportunities for biodiversity enhancement should be incorporated into the project design, including:

- Retention and enhancement of existing hedgerows and treelines
- Native species planting schemes
- Installation of bat and bird boxes where appropriate
- Implementation of a Construction Environmental Management Plan (CEMP)
- Post-construction ecological monitoring programme`,
  },
  {
    id: 'appendices',
    title: '6. Appendices',
    template: `The following appendices accompany this report:

- **Appendix A: Site Location Map** — showing the site boundary, buffer zones, and surrounding context
- **Appendix B: Habitat Map** — habitats classified according to Fossitt (2000), with FOSSITT codes annotated
- **Appendix C: Species List** — comprehensive list of species recorded during desk study and field surveys, including conservation status
- **Appendix D: Site Photographs** — representative photographs of habitats and notable ecological features
- **Appendix E: Survey Datasheets** — field survey data forms and records

*Note: Appendix contents are generated from project data collected during Steps 1–7 of the assessment workflow.*`,
  },
]
