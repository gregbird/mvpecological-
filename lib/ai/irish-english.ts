/**
 * American English → Irish/British English post-processing for AI-generated text.
 *
 * GPT-4o is instructed to write in Irish English but sometimes slips into
 * American spellings. This function catches those slips after generation,
 * adding ~1-2 ms to response time.
 *
 * Covers:
 * - -ize/-ise  (analyze → analyse, organize → organise, etc.)
 * - -or/-our   (color → colour, behavior → behaviour, etc.)
 * - -er/-re    (center → centre, meter → metre, fiber → fibre, etc.)
 * - -ense/-ence (defense → defence, offense → offence, license → licence)
 * - -og/-ogue  (catalog → catalogue, dialog → dialogue)
 * - -led/-lled (traveled → travelled, modeled → modelled, etc.)
 * - -ling/-lling (traveling → travelling, modeling → modelling, etc.)
 * - -ment      (fulfill → fulfil, enrollment → enrolment, etc.)
 * - Scientific  (sulfur → sulphur, aluminum → aluminium, gray → grey, etc.)
 * - Ecological  (paleontology → palaeontology, archeology → archaeology, etc.)
 */

type Replacement = string | ((_match: string, ...groups: string[]) => string)

// Words that already end in -ise/-ising/-ised in standard English and must NOT be
// transformed by the catch-all -ize → -ise rules.
const IZE_EXCEPTIONS = new Set([
  'size',
  'sized',
  'sizes',
  'sizing',
  'prize',
  'prized',
  'prizes',
  'prizing',
  'capsize',
  'capsized',
  'capsizes',
  'capsizing',
  'seize',
  'seized',
  'seizes',
  'seizing',
  'rise',
  'rising',
  'surprise',
  'surprised',
  'surprises',
  'surprising',
  'advise',
  'advised',
  'advises',
  'advising',
  'comprise',
  'comprised',
  'comprises',
  'comprising',
  'devise',
  'devised',
  'devises',
  'devising',
  'exercise',
  'exercised',
  'exercises',
  'exercising',
  'revise',
  'revised',
  'revises',
  'revising',
  'supervise',
  'supervised',
  'supervises',
  'supervising',
  'improvise',
  'improvised',
  'improvises',
  'improvising',
  'disguise',
  'disguised',
  'disguises',
  'disguising',
  'promise',
  'promised',
  'promises',
  'promising',
  'surmise',
  'surmised',
  'surmises',
  'surmising',
])

// Each entry: [American regex pattern, Irish/British replacement]
// Patterns use word boundaries (\b) to avoid partial matches.
// Ordered from most specific to least specific to prevent double-replacement.
const REPLACEMENTS: [RegExp, Replacement][] = [
  // === -ize / -ise family (most common in ecological reports) ===
  // Base forms + all conjugations are handled by suffix patterns below,
  // but we list high-frequency ecological terms explicitly for clarity.

  // -yze → -yse (irregular: analyze, paralyze)
  [/\banalyze\b/gi, 'analyse'],
  [/\banalyzed\b/gi, 'analysed'],
  [/\banalyzes\b/gi, 'analyses'],
  [/\banalyzing\b/gi, 'analysing'],
  [/\bparalyze\b/gi, 'paralyse'],
  [/\bparalyzed\b/gi, 'paralysed'],
  [/\bparalyzes\b/gi, 'paralyses'],
  [/\bparalyzing\b/gi, 'paralysing'],

  // Common -ize → -ise verbs in ecological/scientific writing
  // summarize, minimize, characterize, organize, utilize, standardize,
  // categorize, prioritize, specialize, stabilize, fertilize, colonize,
  // acclimatize, neutralize, recognize, optimize, emphasize, hypothesize,
  // jeopardize, harmonize, authorize, customize, localize, visualize,
  // materialize, maximize, normalize, oxidize, mineralize, vaporize,
  // memorize, sympathize, criticize, apologize, rationalize, generalize,
  // finalize, formalize, legalize, privatize, revitalize, sensitize,
  // symbolize, synchronize, systematize, traumatize, urbanize, vandalize
  //
  // Instead of listing every verb, we use suffix-based catch-all patterns:
  // IZE_EXCEPTIONS guards words that already end in -ise in standard English.
  [
    /\b(\w+)izing\b/g,
    (match: string, p: string) => (IZE_EXCEPTIONS.has(match.toLowerCase()) ? match : `${p}ising`),
  ],
  [
    /\b(\w+)ized\b/g,
    (match: string, p: string) => (IZE_EXCEPTIONS.has(match.toLowerCase()) ? match : `${p}ised`),
  ],
  [
    /\b(\w+)izes\b/g,
    (match: string, p: string) => (IZE_EXCEPTIONS.has(match.toLowerCase()) ? match : `${p}ises`),
  ],
  [
    /\b(\w+)ize\b/g,
    (match: string, p: string) => (IZE_EXCEPTIONS.has(match.toLowerCase()) ? match : `${p}ise`),
  ],
  [/\b(\w+)ization\b/g, (_m: string, p: string) => `${p}isation`],
  [/\b(\w+)izations\b/g, (_m: string, p: string) => `${p}isations`],

  // === -or / -our family ===
  [/\bcolor\b/gi, 'colour'],
  [/\bcolored\b/gi, 'coloured'],
  [/\bcoloring\b/gi, 'colouring'],
  [/\bcolors\b/gi, 'colours'],
  [/\bbehavior\b/gi, 'behaviour'],
  [/\bbehaviors\b/gi, 'behaviours'],
  [/\bbehavioral\b/gi, 'behavioural'],
  [/\bfavor\b/gi, 'favour'],
  [/\bfavored\b/gi, 'favoured'],
  [/\bfavoring\b/gi, 'favouring'],
  [/\bfavorable\b/gi, 'favourable'],
  [/\bfavorably\b/gi, 'favourably'],
  [/\bfavorite\b/gi, 'favourite'],
  [/\bhonor\b/gi, 'honour'],
  [/\bhonored\b/gi, 'honoured'],
  [/\bhonoring\b/gi, 'honouring'],
  [/\blabor\b/gi, 'labour'],
  [/\blabored\b/gi, 'laboured'],
  [/\bharbor\b/gi, 'harbour'],
  [/\bharbors\b/gi, 'harbours'],
  [/\bhumor\b/gi, 'humour'],
  [/\bneighbor\b/gi, 'neighbour'],
  [/\bneighbors\b/gi, 'neighbours'],
  [/\bneighboring\b/gi, 'neighbouring'],
  [/\bneighborhood\b/gi, 'neighbourhood'],
  [/\bodor\b/gi, 'odour'],
  [/\bodors\b/gi, 'odours'],
  [/\brigor\b/gi, 'rigour'],
  [/\bvigor\b/gi, 'vigour'],
  [/\bsavor\b/gi, 'savour'],
  [/\bendeavor\b/gi, 'endeavour'],
  [/\bendeavors\b/gi, 'endeavours'],
  [/\bfervor\b/gi, 'fervour'],
  [/\btumor\b/gi, 'tumour'],
  [/\btumors\b/gi, 'tumours'],
  [/\bvalor\b/gi, 'valour'],
  [/\bsplendor\b/gi, 'splendour'],
  [/\brumor\b/gi, 'rumour'],
  [/\brumors\b/gi, 'rumours'],

  // === -er / -re family ===
  [/\bcenter\b/gi, 'centre'],
  [/\bcenters\b/gi, 'centres'],
  [/\bcentered\b/gi, 'centred'],
  [/\bcentering\b/gi, 'centring'],
  // "meter" only when standalone unit, not "parameter", "perimeter", "thermometer"
  [/\b(?<!para|peri|thermo|baro|hydro|specto|pluvio|acido|alti|gravi)meter\b/gi, 'metre'],
  [/\b(?<!para|peri|thermo|baro|hydro|specto|pluvio|acido|alti|gravi)meters\b/gi, 'metres'],
  [/\bfiber\b/gi, 'fibre'],
  [/\bfibers\b/gi, 'fibres'],
  [/\bliter\b/gi, 'litre'],
  [/\bliters\b/gi, 'litres'],
  [/\btheater\b/gi, 'theatre'],
  [/\btheaters\b/gi, 'theatres'],
  [/\bsomber\b/gi, 'sombre'],
  [/\bcaliber\b/gi, 'calibre'],
  [/\bspecter\b/gi, 'spectre'],
  [/\bluster\b/gi, 'lustre'],

  // === -ense / -ence family ===
  [/\bdefense\b/gi, 'defence'],
  [/\bdefenses\b/gi, 'defences'],
  [/\boffense\b/gi, 'offence'],
  [/\boffenses\b/gi, 'offences'],
  [/\blicense\b/gi, 'licence'], // noun form; verb "licensed" is same in both
  [/\blicenses\b/gi, 'licences'],
  [/\bpretense\b/gi, 'pretence'],

  // === -og / -ogue family ===
  [/\bcatalog\b/gi, 'catalogue'],
  [/\bcatalogs\b/gi, 'catalogues'],
  [/\bcataloged\b/gi, 'catalogued'],
  [/\bcataloging\b/gi, 'cataloguing'],
  [/\bdialog\b/gi, 'dialogue'],
  [/\bdialogs\b/gi, 'dialogues'],
  [/\banalog\b/gi, 'analogue'],
  [/\banalogs\b/gi, 'analogues'],
  [/\bprolog\b/gi, 'prologue'],
  [/\bepilog\b/gi, 'epilogue'],
  [/\bmonolog\b/gi, 'monologue'],

  // === Double-L family (American single-L → British double-L) ===
  [/\btraveled\b/gi, 'travelled'],
  [/\btraveling\b/gi, 'travelling'],
  [/\btraveler\b/gi, 'traveller'],
  [/\btravelers\b/gi, 'travellers'],
  [/\bmodeled\b/gi, 'modelled'],
  [/\bmodeling\b/gi, 'modelling'],
  [/\blabeled\b/gi, 'labelled'],
  [/\blabeling\b/gi, 'labelling'],
  [/\bsignaled\b/gi, 'signalled'],
  [/\bsignaling\b/gi, 'signalling'],
  [/\bchanneled\b/gi, 'channelled'],
  [/\bchanneling\b/gi, 'channelling'],
  [/\bcanceled\b/gi, 'cancelled'],
  [/\bcanceling\b/gi, 'cancelling'],
  [/\bcounseled\b/gi, 'counselled'],
  [/\bcounseling\b/gi, 'counselling'],
  [/\bcounselor\b/gi, 'counsellor'],
  [/\bleveled\b/gi, 'levelled'],
  [/\bleveling\b/gi, 'levelling'],
  [/\bmarshaled\b/gi, 'marshalled'],
  [/\bmarshaling\b/gi, 'marshalling'],
  [/\bpaneled\b/gi, 'panelled'],
  [/\bpaneling\b/gi, 'panelling'],
  [/\brivaled\b/gi, 'rivalled'],
  [/\brivaling\b/gi, 'rivalling'],
  [/\btotaled\b/gi, 'totalled'],
  [/\btotaling\b/gi, 'totalling'],
  [/\bfueled\b/gi, 'fuelled'],
  [/\bfueling\b/gi, 'fuelling'],
  [/\bdueled\b/gi, 'duelled'],
  [/\bdueling\b/gi, 'duelling'],
  [/\bjeweled\b/gi, 'jewelled'],

  // === -ment / -l family ===
  [/\bfulfill\b/gi, 'fulfil'],
  [/\bfulfilled\b/gi, 'fulfilled'], // same in both — already double-L
  [/\bfulfilling\b/gi, 'fulfilling'], // same
  [/\bfulfillment\b/gi, 'fulfilment'],
  [/\benrollment\b/gi, 'enrolment'],
  [/\benrollments\b/gi, 'enrolments'],
  [/\binstallment\b/gi, 'instalment'],
  [/\binstallments\b/gi, 'instalments'],
  [/\bskilful\b/gi, 'skilful'], // American "skillful" → British "skilful"
  [/\bskillful\b/gi, 'skilful'],
  [/\bwilful\b/gi, 'wilful'],
  [/\bwillful\b/gi, 'wilful'],

  // === -am / -amme family ===
  [/\bprogram\b/gi, 'programme'],
  [/\bprograms\b/gi, 'programmes'],
  // "programming" and "programmer" stay with double-M in both

  // === Scientific / Ecological terms ===
  [/\bgray\b/gi, 'grey'],
  [/\bgrays\b/gi, 'greys'],
  [/\bgrayed\b/gi, 'greyed'],
  [/\bgraying\b/gi, 'greying'],
  [/\bgrayish\b/gi, 'greyish'],
  [/\bsulfur\b/gi, 'sulphur'],
  [/\bsulfate\b/gi, 'sulphate'],
  [/\bsulfates\b/gi, 'sulphates'],
  [/\bsulfide\b/gi, 'sulphide'],
  [/\bsulfides\b/gi, 'sulphides'],
  [/\baluminum\b/gi, 'aluminium'],
  [/\bartifact\b/gi, 'artefact'],
  [/\bartifacts\b/gi, 'artefacts'],
  [/\bmaneuver\b/gi, 'manoeuvre'],
  [/\bmaneuvers\b/gi, 'manoeuvres'],
  [/\bmaneuvered\b/gi, 'manoeuvred'],
  [/\bmaneuvering\b/gi, 'manoeuvring'],
  [/\bpaleontology\b/gi, 'palaeontology'],
  [/\bpaleontological\b/gi, 'palaeontological'],
  [/\barcheology\b/gi, 'archaeology'],
  [/\barcheological\b/gi, 'archaeological'],
  [/\besthetic\b/gi, 'aesthetic'],
  [/\besthetics\b/gi, 'aesthetics'],
  [/\bfetus\b/gi, 'foetus'],
  [/\banemia\b/gi, 'anaemia'],
  [/\banemic\b/gi, 'anaemic'],
  [/\bhemorrhage\b/gi, 'haemorrhage'],
  [/\bedema\b/gi, 'oedema'],
  [/\besophagus\b/gi, 'oesophagus'],
  [/\bestrogen\b/gi, 'oestrogen'],

  // === Miscellaneous ===
  [/\baged\b/gi, 'aged'], // same — no change
  [/\bjudgment\b/gi, 'judgement'],
  [/\bjudgments\b/gi, 'judgements'],
  [/\backnowledgment\b/gi, 'acknowledgement'],
  [/\backnowledgments\b/gi, 'acknowledgements'],
  [/\bplow\b/gi, 'plough'],
  [/\bplowed\b/gi, 'ploughed'],
  [/\bplowing\b/gi, 'ploughing'],
  [/\bmold\b/gi, 'mould'],
  [/\bmolds\b/gi, 'moulds'],
  [/\bmolding\b/gi, 'moulding'],
  [/\bmoldy\b/gi, 'mouldy'],
  [/\bsmolder\b/gi, 'smoulder'],
  [/\bsmoldering\b/gi, 'smouldering'],
]

/**
 * Convert American English spellings to Irish/British English.
 * Safe to call on any text — only replaces whole words using word boundaries.
 */
/**
 * Convert American English spellings to Irish/British English.
 * Safe to call on any text — only replaces whole words using word boundaries.
 */
export function toIrishEnglish(text: string): string {
  if (!text) return text

  let result = text
  for (const [pattern, replacement] of REPLACEMENTS) {
    if (typeof replacement === 'string') {
      result = result.replace(pattern, (_match: string) => {
        // Preserve original capitalisation
        if (_match[0] === _match[0].toUpperCase()) {
          return replacement.charAt(0).toUpperCase() + replacement.slice(1)
        }
        return replacement
      })
    } else {
      result = result.replace(pattern, replacement as (...args: string[]) => string)
    }
  }

  return result
}
