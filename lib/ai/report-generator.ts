/**
 * AI Report Generation Utilities
 * Uses OpenAI GPT-4 for generating ecological report sections
 */

interface ReportContext {
  projectName: string
  siteCode: string
  gridReference?: string
  habitats?: Array<{
    code: string
    name: string
    condition: string
    area?: number
  }>
  species?: Array<{
    scientificName: string
    commonName?: string
    isProtected: boolean
    recordCount?: number
  }>
  designatedSites?: Array<{
    name: string
    code: string
    type: string
    distance?: number
  }>
  surveys?: Array<{
    type: string
    date: string
    surveyor: string
  }>
}

interface GeneratedSection {
  title: string
  content: string
  subsections?: Array<{
    title: string
    content: string
  }>
}

const SYSTEM_PROMPT = `You are an expert ecological consultant writing sections for an Ecological Impact Assessment (EcIA) report in Ireland.

Follow these guidelines:
1. Use formal, technical language appropriate for professional ecological reports
2. Follow Irish and EU ecological assessment standards
3. Use Irish English spelling (e.g., colour, behaviour, metre)
4. Reference Fossitt (2000) habitat classification where applicable
5. Reference relevant Irish wildlife legislation (Wildlife Act 1976-2021) and EU Directives (Birds Directive, Habitats Directive)
6. Be precise and evidence-based
7. Include caveats where data is limited
8. Structure content with clear headings and paragraphs

Do NOT:
- Make up specific survey data or counts that weren't provided
- Include personal opinions without scientific basis
- Use informal language or colloquialisms`

/**
 * Generate an introduction section for the report
 */
export async function generateIntroductionSection(
  context: ReportContext,
  apiKey: string
): Promise<GeneratedSection> {
  const prompt = `Generate an introduction section for an Ecological Impact Assessment report.

Project Details:
- Project Name: ${context.projectName}
- Site Code: ${context.siteCode}
${context.gridReference ? `- Grid Reference: ${context.gridReference}` : ''}

The introduction should include:
1. Brief project background and purpose
2. Scope of the ecological assessment
3. Report structure overview
4. Relevant legislation and policy context (Irish and EU)

Keep the section concise (approximately 300-400 words).`

  const response = await callOpenAI(prompt, apiKey)

  return {
    title: 'Introduction',
    content: response,
  }
}

/**
 * Generate a methodology section
 */
export async function generateMethodologySection(
  context: ReportContext,
  apiKey: string
): Promise<GeneratedSection> {
  const surveyDetails =
    context.surveys
      ?.map((s) => `- ${s.type} survey conducted on ${s.date} by ${s.surveyor}`)
      .join('\n') || 'No survey details provided'

  const prompt = `Generate a methodology section for an Ecological Impact Assessment report.

Project: ${context.projectName}

Surveys Conducted:
${surveyDetails}

The methodology section should include:
1. Desk study methodology (data sources consulted)
2. Field survey methodology (survey types and methods used)
3. Assessment methodology (impact significance criteria)
4. Limitations of the assessment

Reference standard ecological survey guidelines (e.g., CIEEM, NRA guidelines, Bat Conservation Ireland guidelines as appropriate).

Keep the section focused and approximately 400-500 words.`

  const response = await callOpenAI(prompt, apiKey)

  return {
    title: 'Methodology',
    content: response,
    subsections: [
      { title: 'Desk Study', content: '' },
      { title: 'Field Surveys', content: '' },
      { title: 'Impact Assessment', content: '' },
      { title: 'Limitations', content: '' },
    ],
  }
}

/**
 * Generate a habitats section
 */
export async function generateHabitatsSection(
  context: ReportContext,
  apiKey: string
): Promise<GeneratedSection> {
  const habitatDetails =
    context.habitats
      ?.map(
        (h) => `- ${h.code} ${h.name}: ${h.condition} condition${h.area ? `, ${h.area} ha` : ''}`
      )
      .join('\n') || 'No habitat data provided'

  const prompt = `Generate a habitat description section for an Ecological Impact Assessment report.

Project: ${context.projectName}

Habitats Recorded (Fossitt Classification):
${habitatDetails}

The habitats section should:
1. Describe each habitat type recorded on site
2. Assess habitat quality and ecological value
3. Note any habitats corresponding to EU Habitats Directive Annex I types
4. Identify habitat connectivity and ecological corridors
5. Highlight any rare or sensitive habitats

Use Fossitt (2000) terminology and reference any Annex I habitat types where applicable.

Keep the section approximately 400-600 words, adjusting based on habitat diversity.`

  const response = await callOpenAI(prompt, apiKey)

  return {
    title: 'Habitats',
    content: response,
  }
}

/**
 * Generate a species section
 */
export async function generateSpeciesSection(
  context: ReportContext,
  apiKey: string
): Promise<GeneratedSection> {
  const speciesDetails =
    context.species
      ?.map(
        (s) =>
          `- ${s.scientificName}${s.commonName ? ` (${s.commonName})` : ''}${s.isProtected ? ' [PROTECTED]' : ''}${s.recordCount ? `, ${s.recordCount} records` : ''}`
      )
      .join('\n') || 'No species data provided'

  const protectedCount = context.species?.filter((s) => s.isProtected).length || 0

  const prompt = `Generate a species description section for an Ecological Impact Assessment report.

Project: ${context.projectName}

Species Recorded:
${speciesDetails}

Protected species count: ${protectedCount}

The species section should:
1. Summarise the fauna and flora recorded during surveys
2. Highlight protected and notable species
3. Reference relevant protection status (Wildlife Act, Habitats Directive Annex II/IV, Birds Directive Annex I)
4. Assess the ecological importance of species assemblages
5. Note any invasive species if present

Be specific about protection status and ecological significance.

Keep the section approximately 400-600 words.`

  const response = await callOpenAI(prompt, apiKey)

  return {
    title: 'Flora and Fauna',
    content: response,
    subsections: [
      { title: 'Mammals', content: '' },
      { title: 'Birds', content: '' },
      { title: 'Other Fauna', content: '' },
      { title: 'Flora', content: '' },
    ],
  }
}

/**
 * Generate a designated sites section
 */
export async function generateDesignatedSitesSection(
  context: ReportContext,
  apiKey: string
): Promise<GeneratedSection> {
  const siteDetails =
    context.designatedSites
      ?.map(
        (s) =>
          `- ${s.name} (${s.code}): ${s.type}${s.distance !== undefined ? `, ${s.distance}km from site` : ''}`
      )
      .join('\n') || 'No designated sites identified'

  const prompt = `Generate a designated sites section for an Ecological Impact Assessment report.

Project: ${context.projectName}

Designated Sites within Study Area:
${siteDetails}

The designated sites section should:
1. List all European sites (SACs, SPAs) and National sites (NHAs, pNHAs) within the zone of influence
2. Summarise the qualifying interests of each relevant site
3. Assess potential connectivity between the project site and designated areas
4. Note any Ramsar sites, Nature Reserves, or National Parks
5. Reference the need for Appropriate Assessment screening where relevant

Be specific about site designations and qualifying interests where data is available.

Keep the section approximately 300-500 words.`

  const response = await callOpenAI(prompt, apiKey)

  return {
    title: 'Designated Sites',
    content: response,
  }
}

/**
 * Generate an impact assessment section
 */
export async function generateImpactSection(
  context: ReportContext,
  apiKey: string
): Promise<GeneratedSection> {
  const prompt = `Generate an impact assessment section for an Ecological Impact Assessment report.

Project: ${context.projectName}

Context:
- Habitats present: ${context.habitats?.map((h) => h.name).join(', ') || 'Various'}
- Protected species: ${
    context.species
      ?.filter((s) => s.isProtected)
      .map((s) => s.commonName || s.scientificName)
      .join(', ') || 'None identified'
  }
- Nearby designated sites: ${context.designatedSites?.map((s) => s.name).join(', ') || 'None within study area'}

The impact assessment section should:
1. Identify potential impacts during construction and operation phases
2. Assess impact significance using standard criteria (geographic scale, duration, reversibility)
3. Consider cumulative and in-combination effects
4. Apply the precautionary principle where uncertainty exists
5. Distinguish between direct, indirect, and secondary impacts

Use CIEEM impact assessment guidelines and terminology.

Keep the section approximately 500-700 words.`

  const response = await callOpenAI(prompt, apiKey)

  return {
    title: 'Impact Assessment',
    content: response,
    subsections: [
      { title: 'Construction Phase Impacts', content: '' },
      { title: 'Operational Phase Impacts', content: '' },
      { title: 'Cumulative Impacts', content: '' },
    ],
  }
}

/**
 * Generate mitigation measures section
 */
export async function generateMitigationSection(
  context: ReportContext,
  apiKey: string
): Promise<GeneratedSection> {
  const prompt = `Generate a mitigation measures section for an Ecological Impact Assessment report.

Project: ${context.projectName}

Key Ecological Features:
- Habitats: ${context.habitats?.map((h) => h.name).join(', ') || 'Various'}
- Protected species: ${
    context.species
      ?.filter((s) => s.isProtected)
      .map((s) => s.commonName || s.scientificName)
      .join(', ') || 'None identified'
  }

The mitigation section should:
1. Follow the mitigation hierarchy (avoid, minimise, remediate, compensate)
2. Propose specific, implementable mitigation measures
3. Include timing restrictions for sensitive periods
4. Recommend best practice construction methods
5. Consider habitat enhancement opportunities

Be practical and specific with recommendations.

Keep the section approximately 400-600 words.`

  const response = await callOpenAI(prompt, apiKey)

  return {
    title: 'Mitigation Measures',
    content: response,
  }
}

/**
 * Generate conclusions section
 */
export async function generateConclusionsSection(
  context: ReportContext,
  apiKey: string
): Promise<GeneratedSection> {
  const prompt = `Generate a conclusions section for an Ecological Impact Assessment report.

Project: ${context.projectName}

Summarise the key findings and provide a clear conclusion regarding:
1. The ecological baseline of the site
2. The significance of residual impacts after mitigation
3. Whether the project can proceed without significant ecological harm
4. Any requirements for further assessment (e.g., Appropriate Assessment)
5. Key conditions or recommendations

Be concise and definitive while maintaining appropriate caveats.

Keep the section approximately 200-300 words.`

  const response = await callOpenAI(prompt, apiKey)

  return {
    title: 'Conclusions',
    content: response,
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'OpenAI API error')
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

/**
 * Generate a complete report draft
 */
export async function generateFullReportDraft(
  context: ReportContext,
  apiKey: string,
  onProgress?: (section: string, progress: number) => void
): Promise<GeneratedSection[]> {
  const sections: GeneratedSection[] = []
  const generators = [
    { name: 'Introduction', fn: generateIntroductionSection },
    { name: 'Methodology', fn: generateMethodologySection },
    { name: 'Designated Sites', fn: generateDesignatedSitesSection },
    { name: 'Habitats', fn: generateHabitatsSection },
    { name: 'Species', fn: generateSpeciesSection },
    { name: 'Impact Assessment', fn: generateImpactSection },
    { name: 'Mitigation', fn: generateMitigationSection },
    { name: 'Conclusions', fn: generateConclusionsSection },
  ]

  for (let i = 0; i < generators.length; i++) {
    const { name, fn } = generators[i]
    onProgress?.(name, ((i + 1) / generators.length) * 100)

    try {
      const section = await fn(context, apiKey)
      sections.push(section)
    } catch (error) {
      console.error(`Error generating ${name} section:`, error)
      sections.push({
        title: name,
        content: `[Error generating section: ${error instanceof Error ? error.message : 'Unknown error'}]`,
      })
    }
  }

  return sections
}
