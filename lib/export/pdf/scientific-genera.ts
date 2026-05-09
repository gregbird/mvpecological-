// Genus names recognised by the parser so binomial scientific names
// (e.g. "Lutra lutra") get auto-italicised in PDF output. Extend cautiously —
// every entry expands the alternation regex used per paragraph.

export const SCIENTIFIC_GENERA = [
  'Lutra',
  'Ammophila',
  'Elymus',
  'Cakile',
  'Salsola',
  'Festuca',
  'Galium',
  'Dactylorhiza',
  'Anacamptis',
  'Hippophae',
  'Salix',
  'Hydrocotyle',
  'Mentha',
  'Eryngium',
  'Armeria',
  'Plantago',
  'Lolium',
  'Trifolium',
  'Crataegus',
  'Prunus',
  'Thymus',
  'Lotus',
  'Charadrius',
  'Calidris',
  'Haematopus',
  'Numenius',
  'Pluvialis',
  'Alauda',
  'Falco',
  'Linaria',
  'Tadorna',
  'Anthus',
  'Lepus',
  'Oryctolagus',
  'Meles',
  'Erinaceus',
  'Vulpes',
  'Phocoena',
  'Tursiops',
  'Martes',
  'Mustela',
  'Pipistrellus',
  'Myotis',
  'Rhinolophus',
  'Nyctalus',
  'Eptesicus',
  'Plecotus',
  'Sorex',
  'Apodemus',
  'Cervus',
  'Dama',
  'Sciurus',
  'Neovison',
  'Ondatra',
  'Rattus',
  'Mus',
] as const

// Module-level regex — built once, reused across every paragraph. Previously
// rebuilt inside parseInlineWithScientific for every call, which dominated
// parse time on AI-generated reports (8KB Tiptap content → 3.5KB markdown
// could stall for minutes).
export const SCIENTIFIC_NAME_REGEX = new RegExp(
  `\\b(${SCIENTIFIC_GENERA.join('|')})\\s+[a-z][a-z]+(?:\\s+[a-z][a-z]+)?\\b`,
  'g'
)

// Lowercased genus list for cheap pre-filter. Most paragraphs don't mention
// any genus, so we skip the alternation regex entirely on those.
export const SCIENTIFIC_GENERA_LOWER = SCIENTIFIC_GENERA.map((g) => g.toLowerCase())
