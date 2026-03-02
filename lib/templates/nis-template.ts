/**
 * NIS (Natura Impact Statement) Report Template
 * Used for both AA Stage 2 and NIA report types.
 * DoEHLG (2010) guidance with {{placeholder}} variables
 * for automatic population from project data.
 */

export interface NisTemplateSection {
  id: string
  title: string
  template: string
}

export const NIS_TEMPLATE_SECTIONS: NisTemplateSection[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    template: `### 1.1 Background

This Natura Impact Statement (NIS) has been prepared for **{{project_name}}** located at {{location_description}}. The site is referenced under site code {{site_code}} at Irish Grid Reference {{grid_reference}}.

### 1.2 Requirement for NIS

AA Screening concluded that significant effects on one or more European sites could not be excluded. This NIS has been prepared to provide the competent authority with the scientific evidence required to carry out an Appropriate Assessment in accordance with Article 6(3) of the EU Habitats Directive (92/43/EEC).

### 1.3 Legislative Framework

This NIS has been prepared with reference to:

- **Article 6(3) and 6(4) of the EU Habitats Directive (92/43/EEC)**
- **Part XAB of the Planning and Development Act 2000** (as amended)
- **European Communities (Birds and Natural Habitats) Regulations 2011** (S.I. No. 477 of 2011)
- **DoEHLG (2010)** *Appropriate Assessment of Plans and Projects in Ireland — Guidance for Planning Authorities*
- **European Commission (2021)** *Assessment of Plans and Projects in Relation to Natura 2000 Sites — Methodological Guidance*
- **European Commission (2019)** *Managing Natura 2000 Sites: Provisions of Article 6*

### 1.4 The Appropriate Assessment Process

The Appropriate Assessment is a four-stage process:

1. **Stage 1 — Screening** — determine if the project is likely to have significant effects (completed)
2. **Stage 2 — Appropriate Assessment** — assess effects on site integrity in view of conservation objectives (this NIS)
3. **Stage 3 — Alternative Solutions** — examine alternative ways to achieve the project objectives
4. **Stage 4 — IROPI** — Imperative Reasons of Overriding Public Interest (only if Stages 2-3 fail)

This NIS addresses Stage 2 of the process.`,
  },
  {
    id: 'methodology',
    title: '2. Methodology',
    template: `### 2.1 Guidance & Standards

This NIS has been prepared following:

- **DoEHLG (2010)** guidance for planning authorities
- **European Commission (2021)** methodological guidance on Article 6(3) and 6(4)
- **CIEEM (2018)** Guidelines for Ecological Impact Assessment
- **NPWS Site-Specific Conservation Objectives** for relevant European sites

### 2.2 Desk Study

The following data sources were consulted:

{{desk_sources_summary}}

### 2.3 Field Surveys

{{survey_details}}

### 2.4 Relevé Vegetation Surveys

{{releve_details}}

### 2.5 Assessment Framework

The assessment considers whether the proposed development would adversely affect the integrity of each relevant European site, having regard to:

- The structure and function of the site
- The conservation objectives of the site
- The ecological requirements of the qualifying interests/special conservation interests

The test of site integrity follows the definition in DoEHLG (2010): *"the coherence of the site's ecological structure and function, across its whole area, that enables it to sustain the habitat, complex of habitats and/or the levels of populations of the species for which the site is designated."*

### 2.6 Limitations

*[Survey limitations, seasonal constraints, data gaps]*`,
  },
  {
    id: 'site_description',
    title: '3. Project & Site Description',
    template: `### 3.1 Project Description

*[Detailed description of the proposed development including: nature and scale, construction methodology, phasing, operational characteristics, and decommissioning plans]*

### 3.2 Site Characteristics

The project site is located at {{location_description}}. The following habitats are present:

{{habitat_table}}

### 3.3 Hydrological Environment

*[Detailed description of surface water drainage, groundwater conditions, and hydrological connectivity to European sites. Include watercourse names, sub-catchments, and distance to nearest receiving waters]*

### 3.4 Source-Pathway-Receptor Linkages

The following potential pathways for effects on European sites have been identified:

| Source | Pathway | Receptor |
|--------|---------|----------|
| *[To be populated based on site-specific assessment]* | | |`,
  },
  {
    id: 'natura_sites',
    title: '4. Natura 2000 Sites',
    template: `### 4.1 European Sites Assessed

The following European sites were identified at AA Screening as requiring further assessment:

{{designated_sites_table}}

### 4.2 Qualifying Interests & Conservation Objectives

For each European site, the qualifying interests (SACs) and special conservation interests (SPAs) are detailed below with their conservation objectives, as set out in the NPWS Site-Specific Conservation Objectives documents.

*[For each European site, provide:]*

- **Site name and code**
- **Qualifying interests/special conservation interests** (habitat codes, species)
- **Conservation objectives** — maintain/restore favourable conservation condition
- **Conservation objective attributes** — area, distribution, structure & functions, future prospects
- **Target values** for each attribute
- **Current conservation status** of qualifying interests
- **Known threats and pressures** from NPWS Threat Assessment

### 4.3 Ecological Requirements

*[Describe the ecological requirements of the qualifying interests, including habitat conditions, water quality, prey availability, and disturbance sensitivity]*`,
  },
  {
    id: 'impact_assessment',
    title: '5. Assessment of Effects on Site Integrity',
    template: `### 5.1 Assessment Approach

For each European site and qualifying interest, the assessment considers whether the proposed development would adversely affect:

- The area of qualifying habitats
- The distribution of qualifying species
- The structure and function of ecological processes
- The conservation objective attributes and targets

### 5.2 Construction Phase Assessment

| European Site | Qualifying Interest | Effect Pathway | Effect Description | Adverse Effect on Integrity? |
|--------------|---------------------|----------------|-------------------|-----------------------------|
| *[To be populated]* | | | | |

### 5.3 Operational Phase Assessment

| European Site | Qualifying Interest | Effect Pathway | Effect Description | Adverse Effect on Integrity? |
|--------------|---------------------|----------------|-------------------|-----------------------------|
| *[To be populated]* | | | | |

### 5.4 Detailed Assessment by European Site

*[For each European site, provide a detailed assessment of effects on each qualifying interest, referencing specific conservation objective attributes and targets]*`,
  },
  {
    id: 'mitigation',
    title: '6. Mitigation Measures',
    template: `### 6.1 Mitigation Approach

Mitigation measures have been designed to avoid or reduce adverse effects on the integrity of European sites. All measures are specific, enforceable, and of proven effectiveness.

### 6.2 Construction Phase Mitigation

- **Construction Environmental Management Plan (CEMP)** — comprehensive environmental management during construction
- **Pollution Prevention Measures** — silt fencing, settlement ponds, interceptor drains, spill containment
- **Ecological Clerk of Works (ECoW)** — on-site ecological supervision during sensitive works
- **Seasonal Timing Restrictions** — works scheduled to avoid sensitive periods for qualifying species
- **Exclusion Zones** — buffer zones around sensitive ecological features

### 6.3 Operational Phase Mitigation

*[Specific operational phase mitigation measures relevant to identified effects]*

### 6.4 Monitoring

A monitoring programme will be implemented to verify the effectiveness of mitigation measures:

- **Construction phase** — water quality monitoring, ecological supervision, incident reporting
- **Post-construction** — habitat condition monitoring, species surveys, water quality assessment
- **Reporting** — regular monitoring reports to the competent authority

### 6.5 Contingency Plans

*[Emergency response procedures for pollution incidents, unexpected ecological discoveries, or mitigation failure]*`,
  },
  {
    id: 'residual',
    title: '7. Residual Effects & In-Combination',
    template: `### 7.1 Residual Effects Assessment

Following implementation of the mitigation measures described in Section 6, the residual effects on European sites are assessed:

| European Site | Qualifying Interest | Effect | Mitigation | Residual Effect | Adverse on Integrity? |
|--------------|---------------------|--------|------------|-----------------|----------------------|
| *[To be populated]* | | | | | |

### 7.2 In-Combination Assessment

In accordance with Article 6(3), the potential for the proposed development to contribute to in-combination effects with other plans and projects has been assessed.

### 7.3 Plans and Projects Considered

- County/City Development Plans and Local Area Plans
- Recent and pending planning applications within the Zone of Influence
- Infrastructure projects (roads, water/wastewater, energy)
- River Basin Management Plans, Flood Risk Management Plans
- Other plans and projects identified from planning register searches

### 7.4 In-Combination Conclusion

*[Assessment of whether residual effects, in combination with other plans and projects, would adversely affect the integrity of any European site]*`,
  },
  {
    id: 'conclusion',
    title: '8. Conclusion',
    template: `### 8.1 Summary of Assessment

This NIS has assessed whether the proposed development at **{{project_name}}** would adversely affect the integrity of any European site, in view of the site's conservation objectives.

### 8.2 Conclusion

On the basis of the scientific assessment presented in this NIS, and having regard to the mitigation measures proposed, it is concluded that:

*[One of the following:]*

**Option A — No Adverse Effects:**
The proposed development, individually or in combination with other plans or projects, will not adversely affect the integrity of any European site, beyond reasonable scientific doubt.

**Option B — Adverse Effects Cannot Be Excluded:**
The proposed development, individually or in combination with other plans or projects, may adversely affect the integrity of [European site name(s)]. In this case, the competent authority may only grant consent if: (i) there are no alternative solutions, and (ii) there are imperative reasons of overriding public interest (IROPI) in accordance with Article 6(4).

### 8.3 Competent Authority Determination

This NIS provides the scientific information required for the competent authority to carry out an Appropriate Assessment and reach its own independent determination on the effects of the proposed development on European sites.`,
  },
]
