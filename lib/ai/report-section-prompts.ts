/**
 * AI Section Prompts for all report types.
 * Each report type has detailed, section-specific prompts that guide GPT-4o
 * to produce high-quality, Irish-legislation-aware ecological report content.
 */

export interface SectionPromptConfig {
  prompt: string
  maxTokens?: number
}

const DEFAULT_MAX_TOKENS = 2000

// ---------------------------------------------------------------------------
// PEA (Preliminary Ecological Appraisal) — CIEEM standard
// ---------------------------------------------------------------------------
const PEA_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~300-400 words). Include:
1. Project background and purpose of the PEA
2. Site location using the provided grid reference, county, and townland
3. Scope of the ecological assessment
4. Brief overview of relevant legislation (Wildlife Acts 1976-2021, EU Habitats & Birds Directives, European Communities Regulations 2011)
5. Report structure overview`,
  },
  methodology: {
    prompt: `Write the Methodology section (~400-500 words). Include:
1. **Desk Study** — list all data sources consulted (NPWS, GBIF, NBDC, EPA, Catchments.ie) with specific counts of findings retrieved
2. **Field Survey** — describe survey types conducted, dates, methods used, weather conditions, and surveyor effort (start/end times)
3. **Habitat Mapping** — reference Fossitt (2000) classification, survey methods used
4. **Limitations** — any constraints on the assessment (seasonal, access, weather)
Reference standard survey guidelines (CIEEM, NRA, Bat Conservation Ireland) where appropriate.`,
  },
  results: {
    prompt: `Write the Results section (~1500-2000 words). This is the main findings section combining all ecological data. Structure it with the following sub-headings:

### 3.1 Designated Sites
- Summary table of all designated sites (SACs, SPAs, NHAs, pNHAs) with distances from site boundary
- For each site within 2km, describe qualifying interests and conservation status
- Assess potential connectivity between the project site and designated areas
- Reference deep research data for conservation summaries and threats where available
- Note any sites requiring AA Screening consideration

### 3.2 Habitats
- Summary of all habitat types recorded using Fossitt (2000) codes
- Description of each habitat: area, condition, notable features
- Identify any habitats corresponding to EU Habitats Directive Annex I types
- Note habitat connectivity and ecological corridors
- Reference any threats identified during surveys

### 3.3 Flora & Invasive Species
- Plant species recorded during field surveys with DAFOR abundance scores
- Notable or indicator species, link flora to habitat descriptions
- Any Flora Protection Order species if present
- Invasive species observed or recorded in desk study — reference Third Schedule of European Communities (Birds and Natural Habitats) Regulations 2011
- If no invasive species found, state this clearly but note habitats with potential for colonisation

### 3.4 Fauna
- Summary of all fauna observations by taxon group
- Highlight protected species with specific legislation references (Wildlife Acts, Habitats Directive Annex II/IV)
- Include abundance (DAFOR), evidence type, and confidence level where available
- Reference behavioural notes where relevant
- Assess ecological importance of species assemblages
- Cross-reference with desk study species records

Use markdown sub-headings (###) for each sub-section. Be thorough and evidence-based.`,
    maxTokens: 4000,
  },
  constraints: {
    prompt: `Write the Ecological Constraints section (~500-600 words). Include:
1. **Constraints Table** — create a markdown table with columns: Ecological Receptor | Importance (Local/County/National/International) | Potential Impact | Recommended Action
2. Assess ecological value using standard criteria: naturalness, rarity, size/extent, diversity, fragility, typicalness
3. Apply geographic frame of reference for each receptor
4. Follow the mitigation hierarchy (avoid, minimise, remediate, compensate) for recommended actions
5. Reference the Zone of Influence concept
6. Incorporate the ecologist's professional opinion where provided
7. Include timing constraints and seasonal restrictions for works`,
  },
  discussion: {
    prompt: `Write the Discussion & Conclusions section (~500-700 words). Include:
1. **Synthesis** — key ecological findings from desk study and field surveys
2. **Potential Impacts** — discuss potential impacts on identified ecological receptors
3. **Cumulative Effects** — consider cumulative and in-combination effects
4. **Precautionary Principle** — reference where uncertainty exists
5. **AA Screening** — identify any triggers for Appropriate Assessment Screening
6. **Further Surveys** — specify what surveys are needed, target species/habitats, optimal timing
7. **Enhancement Opportunities** — biodiversity net gain measures and monitoring requirements
Incorporate the ecologist's professional opinion where provided. Be specific and actionable.`,
  },
  appendices: {
    prompt: `Write the Appendices section (~100-200 words). List the appendices that should accompany this report:
- Appendix A: Site Location Map
- Appendix B: Habitat Map (reference FOSSITT codes mapped)
- Appendix C: Species List (reference observation counts)
- Appendix D: Site Photographs
- Appendix E: Survey Datasheets
Add brief descriptions of what each appendix contains based on the available data.`,
  },
}

// ---------------------------------------------------------------------------
// EcIA (Ecological Impact Assessment) — CIEEM 2018 EcIA Guidelines
// ---------------------------------------------------------------------------
const ECIA_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~300-400 words). Include:
1. Description of the proposed development at the project site
2. The EIA context requiring this Ecological Impact Assessment — reference the EIA Directive (2014/52/EU) and EPA Guidelines on Environmental Impact Assessment (2022)
3. Terms of reference for the ecological chapter
4. Legislative framework: Wildlife Acts 1976-2021, EU Habitats Directive (92/43/EEC), EU Birds Directive (2009/147/EC), European Communities (Birds and Natural Habitats) Regulations 2011
5. Guidance followed: CIEEM (2018) Guidelines for Ecological Impact Assessment in the UK and Ireland
6. Report structure overview with reference to the EcIA methodology`,
  },
  methodology: {
    prompt: `Write the Methodology section (~500-600 words). Include:
1. **Desk Study** — list data sources consulted (NPWS, GBIF, NBDC, EPA, Catchments.ie) with record counts
2. **Field Surveys** — describe each survey type, dates, methods, weather conditions, surveyor effort
3. **Impact Assessment Methodology** — explain the CIEEM (2018) approach: identification of Important Ecological Features (IEFs), characterisation of impacts (magnitude, extent, duration, reversibility, frequency, timing), significance determination using geographic frame of reference
4. **Zone of Influence** — explain how the ZoI was determined for different receptor types
5. **Limitations** — seasonal constraints, access restrictions, data gaps
Reference NRA guidelines (2009) for road projects if applicable, and EPA EIA Scoping guidance.`,
  },
  baseline: {
    prompt: `Write the Baseline Ecological Environment section (~1500-2000 words). Structure:

### 3.1 Designated Sites
- All European sites (SACs, SPAs) and nationally designated sites (NHAs, pNHAs) within the Zone of Influence
- For each site: qualifying interests/special conservation interests, conservation status, known threats
- Assess connectivity (hydrological, ecological corridors, species mobility) to the project site
- Reference deep research data where available

### 3.2 Habitats
- Fossitt (2000) habitat classification with codes, areas, and condition assessment
- Identify Annex I habitat correspondence
- Assess habitat connectivity, fragmentation, and ecological corridors
- Note habitat sensitivity and recovery potential

### 3.3 Flora
- Plant species recorded with DAFOR abundance, including relevé data if available
- Protected species (Flora Protection Order 2022, Habitats Directive Annex II)
- Invasive species (Third Schedule, European Communities Regulations 2011)
- Indicator species and their ecological significance

### 3.4 Fauna
- Fauna by taxon group: mammals, birds, amphibians, invertebrates
- Protected species with legislation (Wildlife Acts Schedule 5, Habitats Directive Annex II/IV)
- BoCCI status for bird species
- Population estimates and ecological importance assessment

Use markdown sub-headings. Be thorough and evidence-based.`,
    maxTokens: 4000,
  },
  assessment: {
    prompt: `Write the Assessment of Effects section (~800-1000 words). Include:
1. **Construction Phase** — habitat loss, disturbance (noise, vibration, lighting), pollution risk, fragmentation
2. **Operational Phase** — ongoing disturbance, lighting, maintenance activities, barrier effects
3. **Decommissioning Phase** — if applicable, describe potential effects
4. For each Important Ecological Feature, characterise impacts using CIEEM (2018) parameters: magnitude, extent, duration, reversibility, frequency, timing
5. Determine significance using the geographic frame of reference (Local, County, National, International)
6. Assess cumulative and in-combination effects with other plans and projects
7. Present a summary table of predicted effects

Reference the precautionary principle where uncertainty exists.`,
    maxTokens: 3000,
  },
  mitigation: {
    prompt: `Write the Mitigation & Enhancement section (~500-600 words). Follow the mitigation hierarchy:
1. **Avoidance** — design changes to eliminate impacts (e.g., setback distances, realignment)
2. **Reduction** — best practice during construction (CEMP measures, timing restrictions, pollution prevention)
3. **Remediation** — habitat restoration and reinstatement plans
4. **Compensation** — offsetting residual impacts through habitat creation
5. **Enhancement** — biodiversity net gain measures, native planting, nest/bat boxes
6. Construction Environmental Management Plan (CEMP) outline
7. Ecological monitoring programme (pre-, during, and post-construction)

Be specific about timing restrictions (e.g., no vegetation clearance 1 March – 31 August for nesting birds, seasonal restrictions for bats).`,
  },
  residual: {
    prompt: `Write the Residual Effects section (~400-500 words). Include:
1. Summary table: Receptor | Pre-Mitigation Significance | Mitigation Measures | Residual Significance
2. Assessment of residual effects after full implementation of mitigation
3. Identify any significant residual effects that cannot be fully mitigated
4. Where compensation is required, describe the proposals
5. Monitoring requirements for residual effects
6. Statement on overall ecological significance of the development`,
  },
  conclusions: {
    prompt: `Write the Conclusions section (~300-400 words). Include:
1. Summary of key ecological receptors and their importance
2. Overall assessment of ecological effects of the proposed development
3. Confirmation of compliance with relevant legislation
4. Statement of ecological significance (per CIEEM 2018)
5. Key conditions/recommendations for planning authority
6. Further survey requirements and optimal timing`,
  },
  appendices: {
    prompt: `Write the Appendices section (~100-200 words). List:
- Appendix A: Site Location Map
- Appendix B: Habitat Map (Fossitt codes annotated)
- Appendix C: Designated Sites Map with Zone of Influence
- Appendix D: Species List with conservation status
- Appendix E: Site Photographs
- Appendix F: Survey Datasheets
- Appendix G: CEMP Outline
Add brief descriptions based on available data.`,
  },
}

// ---------------------------------------------------------------------------
// AA Screening — Article 6(3) Habitats Directive
// ---------------------------------------------------------------------------
const AA_SCREENING_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~300-400 words). Include:
1. Statement that this AA Screening Report is prepared in accordance with Article 6(3) of the EU Habitats Directive (92/43/EEC) and Part XAB of the Planning and Development Act 2000 (as amended)
2. Purpose: to determine whether the proposed development, individually or in combination, is likely to have a significant effect on any European site
3. Description of the proposed development and site location
4. Reference to the precautionary principle as established in case law
5. Guidance followed: DoEHLG (2010) Appropriate Assessment of Plans and Projects in Ireland, European Commission (2021) Assessment of Plans and Projects in Relation to Natura 2000 Sites`,
  },
  site_description: {
    prompt: `Write the Site & Project Description section (~400-500 words). Include:
1. Site location using grid reference, county, and townland
2. Nature and extent of the proposed development
3. Description of the receiving environment — land use, topography, hydrology
4. **Source-Pathway-Receptor Model** — identify potential sources of effects (construction activities, emissions, discharges), pathways (hydrological, aerial, ecological corridors), and receptors (European sites)
5. Hydrological connectivity to watercourses and drainage patterns
6. Distance to nearest European sites`,
  },
  natura_sites: {
    prompt: `Write the Natura 2000 Sites section (~600-800 words). Include:
1. Table of all European sites (SACs and SPAs) within the Zone of Influence
2. For each site provide: site code, distance from project, qualifying interests/special conservation interests
3. Conservation objectives for each site (reference NPWS site-specific conservation objectives where available)
4. Known threats and pressures from NPWS site synopses
5. Assessment of connectivity between the project site and each European site
6. Justification for excluding distant sites from further assessment (where applicable)

Present in tabular format followed by detailed site descriptions. Reference deep research data where available.`,
    maxTokens: 3000,
  },
  significant_effects: {
    prompt: `Write the Assessment of Likely Significant Effects section (~600-800 words). Include:
1. For each European site, assess potential for likely significant effects considering:
   - Habitat loss or degradation (direct and indirect)
   - Species disturbance
   - Water quality impacts (construction runoff, operational discharges)
   - Air quality effects (dust, emissions)
   - Changes to hydrological regime
   - Spread of invasive species
2. Apply the **precautionary principle** — significant effects must be excluded beyond reasonable scientific doubt
3. Consider the conservation objectives of each site
4. Reference the test established in Kelly v. An Bord Pleanala [2014] and People Over Wind [CJEU C-323/17] — mitigation measures cannot be considered at screening stage
5. Present assessment in tabular format: Site | Qualifying Interest | Potential Effect | Significant? | Rationale`,
    maxTokens: 3000,
  },
  in_combination: {
    prompt: `Write the In-Combination Assessment section (~300-400 words). Include:
1. Methodology for identifying other plans and projects for in-combination assessment
2. Relevant plans: County Development Plan, Local Area Plans, National Planning Framework
3. Relevant projects: planning applications in the area, infrastructure projects
4. Assessment of cumulative/in-combination effects on European sites
5. Conclusion on whether in-combination effects alter the screening determination`,
  },
  conclusion: {
    prompt: `Write the Screening Conclusion section (~200-300 words). Include:
1. Clear screening determination statement
2. Whether the proposed development, individually or in combination, is likely to have a significant effect on any European site
3. Whether Stage 2 Appropriate Assessment (Natura Impact Statement) is required
4. Reference the legal test: "likely significant effect" means that significant effects cannot be excluded on the basis of objective scientific information
5. Reference case law: Kelly v. An Bord Pleanala [2014], People Over Wind [CJEU C-323/17]
6. Statement on the precautionary principle`,
  },
}

// ---------------------------------------------------------------------------
// NIS (Natura Impact Statement) — shared by aa_stage2 and nia
// ---------------------------------------------------------------------------
const NIS_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~300-400 words). Include:
1. Statement that this NIS has been prepared to inform the Appropriate Assessment under Article 6(3) of the EU Habitats Directive
2. Confirmation that AA Screening concluded that significant effects could not be excluded
3. Purpose: to provide scientific evidence for the competent authority to carry out an Appropriate Assessment
4. Legislative context: Habitats Directive, Planning and Development Act 2000, European Communities (Birds and Natural Habitats) Regulations 2011
5. Guidance: DoEHLG (2010), European Commission Article 6 guidance documents`,
  },
  methodology: {
    prompt: `Write the Methodology section (~400-500 words). Include:
1. NIS methodology following DoEHLG (2010) and European Commission guidance
2. Data sources consulted (NPWS, GBIF, NBDC, EPA, Catchments.ie) with record counts
3. Field survey methods and dates
4. Framework for assessing effects on site integrity
5. Conservation objectives reviewed (NPWS site-specific conservation objectives)
6. Limitations and data gaps`,
  },
  site_description: {
    prompt: `Write the Project & Site Description section (~400-500 words). Include:
1. Detailed description of the proposed development: construction methodology, operational characteristics
2. Receiving environment: topography, hydrology, land use
3. Source-pathway-receptor linkages to European sites
4. Hydrological connectivity and drainage patterns
5. Construction schedule and phasing (if relevant)`,
  },
  natura_sites: {
    prompt: `Write the Natura 2000 Sites section (~600-800 words). For each European site where significant effects could not be excluded at screening:
1. Site description and location relative to project
2. Qualifying interests/special conservation interests with conservation status
3. Site-specific conservation objectives (from NPWS)
4. Existing threats and pressures
5. Current conservation condition of qualifying habitats and species
6. Connectivity pathways to the project site

Present in detailed format with tables. Reference deep research data where available.`,
    maxTokens: 3000,
  },
  impact_assessment: {
    prompt: `Write the Assessment of Effects on Site Integrity section (~800-1000 words). Include:
1. For each European site and qualifying interest, assess whether the development would adversely affect site integrity
2. Consider direct and indirect effects on:
   - Conservation objectives (habitat area, structure, function, distribution)
   - Qualifying species populations (range, population size, habitat availability)
3. Assess construction, operational, and decommissioning phases
4. Apply the precautionary principle throughout
5. Consider effects on the structure and function of the site
6. Present in tabular format: Site | Qualifying Interest | Conservation Objective | Potential Effect | Adverse Effect on Integrity?

Reference the "integrity of the site" test from Waddenzee [CJEU C-127/02].`,
    maxTokens: 4000,
  },
  mitigation: {
    prompt: `Write the Mitigation Measures section (~500-600 words). Include:
1. Measures designed to avoid or reduce adverse effects on site integrity
2. Measures must be specific, enforceable, and demonstrably effective
3. Timing restrictions (e.g., seasonal exclusion zones for breeding species)
4. Pollution prevention measures (silt fencing, bunding, interceptors)
5. Monitoring protocols during construction and operation
6. Contingency plans for unforeseen events
7. Responsibility assignments and reporting requirements

Note: Only measures that directly relate to avoiding/reducing effects on European sites should be included. General best practice is not sufficient.`,
  },
  residual: {
    prompt: `Write the Residual Effects & In-Combination section (~400-500 words). Include:
1. Assessment of residual effects after implementation of all mitigation measures
2. Summary matrix: Site | Qualifying Interest | Effect | Mitigation | Residual Effect
3. In-combination assessment with other plans and projects
4. Consideration of any residual uncertainty
5. Statement on whether adverse effects on site integrity can be excluded`,
  },
  conclusion: {
    prompt: `Write the Conclusion section (~200-300 words). Include:
1. Definitive conclusion: whether the proposed development, alone or in combination, would adversely affect the integrity of any European site
2. State the conclusion "beyond reasonable scientific doubt" (Waddenzee test)
3. Summarise the mitigation measures upon which the conclusion relies
4. Reference the precautionary principle
5. Any conditions recommended for the competent authority`,
  },
}

// ---------------------------------------------------------------------------
// Bat Survey Report — BCIreland guidelines, Collins (2016)
// ---------------------------------------------------------------------------
const BAT_SURVEY_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~300-400 words). Include:
1. Context for the bat survey at the project site
2. Legal protection: all bat species in Ireland are protected under the Wildlife Acts 1976-2021, EU Habitats Directive Annex IV, European Communities (Birds and Natural Habitats) Regulations 2011
3. Irish bat species context: 9 resident species confirmed in Ireland
4. Purpose and scope of the bat assessment
5. Reference to Bat Conservation Ireland and Collins (2016) Bat Surveys for Professional Ecologists`,
  },
  methodology: {
    prompt: `Write the Methodology section (~500-600 words). Include:
1. **Desk Study** — NBDC bat records, BCIreland landscape conservation data, NPWS records for the area
2. **Preliminary Roost Assessment (PRA)** — building/tree inspections, classification of roost potential (Negligible/Low/Moderate/High), date(s) of assessment
3. **Dusk Emergence / Dawn Re-entry Surveys** — dates, times (sunset/sunrise reference), number of surveyors, positions, equipment used
4. **Transect Surveys** — detector type (heterodyne, frequency division, full spectrum), transect route description, weather conditions per survey, bat pass recording methodology
5. **Static Detector Deployment** — locations, duration, detector model
6. Survey methods follow Collins (2016) and BCIreland Best Practice Guidelines
7. **Limitations** — seasonal coverage, weather conditions, equipment constraints`,
  },
  results: {
    prompt: `Write the Results section (~800-1000 words). Include:

### 3.1 Desk Study Results
- Historical bat records in the area from NBDC and BCIreland
- Landscape suitability assessment

### 3.2 Habitat Assessment
- Suitability of habitats for foraging, commuting, and roosting
- Key foraging areas and linear features (hedgerows, treelines, waterways)

### 3.3 Building/Structure Assessment
- Roost potential classification for buildings/structures surveyed
- Evidence of bat use (droppings, staining, scratch marks)

### 3.4 Activity Survey Results
- Species detected with identification confidence
- Bat passes per hour — temporal and spatial activity patterns
- Key commuting routes and foraging areas identified

### 3.5 Roost Survey Results
- Confirmed/probable/possible roosts
- Species and roost type (maternity, transitional, hibernation, day)
- Emergence/re-entry counts and timing

Include sonogram analysis reference where applicable.`,
    maxTokens: 3000,
  },
  assessment: {
    prompt: `Write the Assessment section (~400-500 words). Include:
1. Importance of bat populations using the site (local, county, national significance)
2. Roost classification and importance (following Collins 2016 Table 4.1)
3. Key foraging areas and commuting corridors — sensitivity to disturbance
4. Potential impacts of the proposed development: roost loss/disturbance, severance of commuting routes, lighting effects, habitat loss
5. Assessment of impact significance for each bat species/roost`,
  },
  mitigation: {
    prompt: `Write the Mitigation & Recommendations section (~400-500 words). Include:
1. **Impact Avoidance** — design changes, sensitive lighting strategy (following BCIreland/ILP guidance), buffer zones from roosts and commuting routes
2. **Mitigation** — timing restrictions (avoid maternity season May-August), bat box installation (types and locations), habitat retention/enhancement, replacement roosting features
3. **Derogation Licensing** — if roost disturbance/destruction is unavoidable, NPWS derogation licence requirements under Regulation 54 of the European Communities Regulations 2011
4. **Monitoring Programme** — post-construction bat activity monitoring schedule
Follow NPWS best practice guidance and BCIreland recommendations.`,
  },
  appendices: {
    prompt: `Write the Appendices section (~100-150 words). List:
- Appendix A: Site Location & Survey Transect Map
- Appendix B: Bat Activity Maps (species distribution)
- Appendix C: Sonogram Examples
- Appendix D: Survey Data Tables (passes per species per survey)
- Appendix E: Site Photographs
- Appendix F: Building/Tree Assessment Sheets
Add brief descriptions based on available data.`,
  },
}

// ---------------------------------------------------------------------------
// Bird Survey Report — BirdWatch Ireland / BTO methodology
// ---------------------------------------------------------------------------
const BIRD_SURVEY_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~300-400 words). Include:
1. Context for the bird survey at the project site
2. Legal protection: Wildlife Acts 1976-2021, EU Birds Directive (2009/147/EC), Birds and Natural Habitats Regulations 2011
3. Annex I species and Birds of Conservation Concern in Ireland (BoCCI) context
4. Purpose and scope of the bird assessment
5. Reference to BirdWatch Ireland, BTO survey methodology, I-WeBS (for wintering birds)`,
  },
  methodology: {
    prompt: `Write the Methodology section (~500-600 words). Include:
1. **Desk Study** — NBDC records, BirdWatch Ireland data, I-WeBS data for the area, Article 12 reporting
2. **Breeding Bird Surveys** — methodology following Bibby et al. (2000), number of survey visits, dates, times, territory mapping approach
3. **Wintering Bird Surveys** — I-WeBS methodology, count dates, tide conditions (if coastal/estuarine), count frequency
4. **Vantage Point Surveys** — if applicable: locations, hours of observation, target species (raptors, waterbirds), flight activity recording
5. Weather conditions for each survey visit
6. **Limitations** — seasonal gaps, weather constraints, survey coverage`,
  },
  results: {
    prompt: `Write the Results section (~800-1000 words). Include:

### 3.1 Desk Study Results
- Historical bird records for the area, BoCCI species recorded locally
- I-WeBS data for nearby count sites (if applicable)

### 3.2 Breeding Bird Survey Results
- Species list with breeding evidence categories (possible, probable, confirmed)
- Territory counts for key species
- Notable species (BoCCI Red/Amber listed, Annex I)

### 3.3 Wintering Bird Survey Results
- Peak counts for each species
- Species assemblage and diversity
- Any nationally/internationally important numbers (1% thresholds)
- Temporal patterns across the winter season

### 3.4 Vantage Point Results (if applicable)
- Flight activity summary, collision risk species
- Flight heights and directions

Include comparative data with national population estimates where relevant.`,
    maxTokens: 3000,
  },
  discussion: {
    prompt: `Write the Discussion section (~500-600 words). Include:
1. Evaluation of bird assemblage importance at site, county, national, and international levels
2. Habitat use patterns and seasonal variation
3. Connectivity with designated sites (SPAs) and qualifying species
4. Potential impacts of the proposed development:
   - Disturbance (construction noise, operational activity)
   - Habitat loss (breeding, foraging, roosting habitat)
   - Collision risk (for wind energy or tall structures)
   - Barrier effects and displacement
5. Context within BoCCI population trends`,
  },
  recommendations: {
    prompt: `Write the Recommendations section (~400-500 words). Include:
1. **Impact Avoidance** — seasonal timing restrictions (no vegetation clearance 1 March to 31 August under Section 40 of the Wildlife Acts)
2. **Mitigation** — buffer zones from nesting sites, nest box installation, habitat management/enhancement
3. **Monitoring Programme** — pre-construction and post-construction bird monitoring (breeding and wintering seasons)
4. **Further Survey Requirements** — if seasonal gaps exist, specify timing for additional surveys
5. Species-specific recommendations for BoCCI Red-listed species`,
  },
  appendices: {
    prompt: `Write the Appendices section (~100-150 words). List:
- Appendix A: Site Location & Survey Point Map
- Appendix B: Breeding Bird Territory Maps
- Appendix C: Wintering Bird Count Data
- Appendix D: BoCCI & Legal Status Table
- Appendix E: Site Photographs
- Appendix F: Survey Datasheets
Add brief descriptions based on available data.`,
  },
}

// ---------------------------------------------------------------------------
// Habitat Survey Report — Fossitt (2000)
// ---------------------------------------------------------------------------
const HABITAT_SURVEY_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~300-400 words). Include:
1. Purpose of the habitat survey at the project site
2. Fossitt (2000) A Guide to Habitats in Ireland as the classification system
3. Context within Irish planning and environmental legislation
4. Reference to EU Habitats Directive Annex I habitats
5. Scope of the assessment — survey area, objectives`,
  },
  methodology: {
    prompt: `Write the Methodology section (~400-500 words). Include:
1. **Desk Study** — NPWS habitat data, CORINE land cover, Preliminary Habitat Inventory, historical mapping (OSI 6-inch, 25-inch)
2. **Field Survey** — Fossitt (2000) classification methodology, survey dates, mapping technique (GPS-based), ground-truthing of aerial photography
3. **Vegetation Recording** — relevé plots (if applicable), DOMIN/DAFOR scale, quadrat methodology
4. **Condition Assessment** — structure, function, typical species assessment criteria
5. **Annex I Assessment** — criteria for determining Annex I habitat correspondence
6. Survey limitations and seasonal constraints`,
  },
  habitats: {
    prompt: `Write the Habitat Descriptions section (~800-1000 words). For each habitat recorded:
1. Fossitt code and full name
2. Area (hectares) and proportion of survey area
3. Dominant and characteristic species with DAFOR/DOMIN abundance
4. Habitat condition assessment (structure, function, typical species)
5. Correspondence with EU Habitats Directive Annex I habitats (if applicable)
6. Connectivity to adjacent habitats and ecological corridors
7. Threats and pressures observed
8. Any notable or indicator species within the habitat

Present habitat areas in a summary table. Include relevé data where available.`,
    maxTokens: 3000,
  },
  evaluation: {
    prompt: `Write the Evaluation section (~500-600 words). Include:
1. Ecological value assessment using criteria: naturalness, rarity (national and county context), size/extent, diversity, connectivity, fragility, typicalness
2. Geographic importance for each habitat (Local, County, National, International)
3. Key Ecological Receptors (KERs) identification
4. Annex I habitat assessment — does any habitat qualify for Annex I designation?
5. Habitat sensitivity and vulnerability to change
6. Context within the landscape — habitat connectivity and ecological networks`,
  },
  recommendations: {
    prompt: `Write the Recommendations section (~400-500 words). Include:
1. **Impact Avoidance** — design to retain high-value habitats, setback distances
2. **Mitigation** — transplantation, seed harvesting (if habitat loss unavoidable), protective fencing during construction
3. **Habitat Management Plan** — management prescriptions for retained habitats (grazing regime, scrub management, etc.)
4. **Habitat Creation/Enhancement** — native planting schemes, wetland creation, wildflower meadow establishment
5. **Monitoring** — post-development habitat condition monitoring programme with specific indicators`,
  },
  appendices: {
    prompt: `Write the Appendices section (~100-150 words). List:
- Appendix A: Site Location Map
- Appendix B: Habitat Map (Fossitt codes annotated)
- Appendix C: Habitat Area Summary Table
- Appendix D: Relevé Data (if applicable)
- Appendix E: Plant Species List with DAFOR abundance
- Appendix F: Site Photographs
- Appendix G: Annex I Habitat Correspondence Table
Add brief descriptions based on available data.`,
  },
}

// ---------------------------------------------------------------------------
// Protected Species Report
// ---------------------------------------------------------------------------
const PROTECTED_SPECIES_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~300-400 words). Include:
1. Purpose of the protected species assessment at the project site
2. Legislation covered: Wildlife Acts 1976-2021, EU Habitats Directive (Annex II, IV, V), EU Birds Directive (Annex I), Flora (Protection) Order 2022, Irish Red Lists
3. Species groups assessed
4. Scope and objectives of the survey programme`,
  },
  methodology: {
    prompt: `Write the Methodology section (~500-600 words). Include:
1. **Desk Study** — NPWS, NBDC, GBIF records for the area
2. **Mammal Surveys** — badger sett survey (NRA 2009 methodology), otter survey (sprainting sites, holts, couches, territories), other mammals
3. **Bat Assessment** — preliminary roost assessment, activity surveys (reference BCIreland guidelines, Collins 2016)
4. **Amphibian Survey** — smooth newt, common frog: pond assessment, torch survey methodology
5. **Botanical Survey** — rare/protected plant search, Flora Protection Order species focus
6. Survey dates, weather conditions, and effort for each survey type
7. **Limitations** — seasonal constraints, survey coverage, detection probability`,
  },
  results: {
    prompt: `Write the Results section (~800-1000 words). Present findings by species group:

### 3.1 Mammals
- Evidence recorded: sightings, field signs (prints, droppings, setts, holts, paths)
- Location within the site, GPS coordinates where available
- Population/activity assessment

### 3.2 Bats
- Roost assessment results, species detected, activity levels
- Key foraging and commuting areas

### 3.3 Birds (protected species focus)
- Annex I species, BoCCI Red-listed species recorded
- Breeding evidence, territory assessment

### 3.4 Amphibians & Reptiles
- Ponds assessed, smooth newt/common frog records
- Habitat Suitability Index scores if calculated

### 3.5 Flora
- Flora Protection Order species search results
- Notable or indicator plant species

Include both positive findings and confirmed absences. State survey confidence.`,
    maxTokens: 3000,
  },
  assessment: {
    prompt: `Write the Species Assessments section (~500-600 words). For each confirmed/potential protected species:
1. Legal protection status (specific legislation and schedule/annex)
2. Conservation status — Irish Red List category, Article 17 reporting status
3. Population importance (local, county, national, international scale)
4. Sensitivity to the proposed development
5. Impact pathways: habitat loss, disturbance, fragmentation, pollution, barrier effects
6. Assessment of significance for each species`,
  },
  mitigation: {
    prompt: `Write the Mitigation Measures section (~500-600 words). Species-specific mitigation:
1. **Badger** — exclusion zones around setts (30m for main setts, 20m for subsidiary), NPWS licence if disturbance unavoidable under Section 23 of the Wildlife Acts
2. **Otter** — 30m buffer from holts, 150m during breeding (January-June), NPWS licence requirements
3. **Bats** — sensitive lighting strategy (BCIreland/ILP guidance), timing restrictions (avoid maternity season May-August), bat boxes, NPWS derogation licence under Regulation 54
4. **Nesting Birds** — seasonal clearance restrictions (1 March – 31 August per Section 40 of the Wildlife Acts)
5. **Other Species** — as applicable to findings
6. NPWS derogation licence requirements where applicable
7. Pre-construction survey requirements`,
  },
  recommendations: {
    prompt: `Write the Recommendations section (~300-400 words). Include:
1. **Further Survey Requirements** — species requiring additional survey effort, optimal timing windows
2. **Pre-construction Surveys** — update surveys needed before works commence (timing for each species)
3. **Monitoring Programme** — construction and post-construction ecological monitoring schedule
4. **Reporting Obligations** — protected species reporting to NPWS`,
  },
}

// ---------------------------------------------------------------------------
// Other / Generic Technical Report
// ---------------------------------------------------------------------------
const OTHER_PROMPTS: Record<string, SectionPromptConfig> = {
  introduction: {
    prompt: `Write the Introduction section (~250-350 words). Include:
1. Purpose and context of the ecological report for the project site
2. Legislative framework (Wildlife Acts 1976-2021, EU Habitats & Birds Directives)
3. Scope of the assessment
4. Guidance followed (CIEEM guidelines)
5. Report structure overview`,
  },
  methodology: {
    prompt: `Write the Methodology section (~300-400 words). Include:
1. Desk study sources consulted (NPWS, GBIF, NBDC, EPA, Catchments.ie) with record counts
2. Field survey methods, dates, weather conditions
3. Any specialist survey methods employed
4. Limitations and constraints`,
  },
  results: {
    prompt: `Write the Results section (~600-800 words). Include:
1. Desk study findings — designated sites, species records, habitat data
2. Field survey findings — habitats, species observations
3. Notable or protected species/habitats identified
4. Present findings organised by ecological receptor or theme

Use markdown sub-headings and tables where appropriate.`,
    maxTokens: 3000,
  },
  discussion: {
    prompt: `Write the Discussion section (~400-500 words). Include:
1. Interpretation of results in the context of the proposed development
2. Ecological significance of findings
3. Potential impacts on identified receptors
4. Cumulative effects consideration
5. Key ecological constraints and sensitivities`,
  },
  recommendations: {
    prompt: `Write the Recommendations section (~300-400 words). Include:
1. Mitigation measures for identified impacts
2. Further survey requirements with optimal timing
3. Ecological monitoring recommendations
4. Biodiversity enhancement opportunities`,
  },
}

// ---------------------------------------------------------------------------
// Master registry
// ---------------------------------------------------------------------------
export const SECTION_PROMPTS: Record<string, Record<string, SectionPromptConfig>> = {
  pea: PEA_PROMPTS,
  ecia: ECIA_PROMPTS,
  aa_screening: AA_SCREENING_PROMPTS,
  aa_stage2: NIS_PROMPTS,
  nia: NIS_PROMPTS,
  bat_survey: BAT_SURVEY_PROMPTS,
  bird_survey: BIRD_SURVEY_PROMPTS,
  habitat_survey: HABITAT_SURVEY_PROMPTS,
  protected_species: PROTECTED_SPECIES_PROMPTS,
  other: OTHER_PROMPTS,
}

/**
 * Get the prompt config for a specific report type and section.
 * Returns null if no specific prompt exists (falls back to generic in route.ts).
 */
export function getSectionPrompt(
  reportType: string,
  sectionId: string
): SectionPromptConfig | null {
  return SECTION_PROMPTS[reportType]?.[sectionId] ?? null
}

/**
 * Get the max tokens for a specific report type and section.
 * Defaults to 2000 if no override exists.
 */
export function getSectionMaxTokens(reportType: string, sectionId: string): number {
  return SECTION_PROMPTS[reportType]?.[sectionId]?.maxTokens ?? DEFAULT_MAX_TOKENS
}
