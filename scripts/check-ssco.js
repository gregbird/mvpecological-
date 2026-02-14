/* eslint-env node */
const fs = require('fs')
const data = JSON.parse(fs.readFileSync('public/data/ssco-sac-habitats.json', 'utf8'))

// Normalize function (same as in ssco-lookup.ts)
function normalizeHabitatCode(code) {
  if (!code || code.trim() === '') return []
  const cleaned = code.replace(/^Potential\s+/i, '')
  const parts = cleaned.split(/\s*\/\s*/)
  return parts.map((p) => p.trim()).filter((p) => /^\d{4}$/.test(p))
}

// Site başına habitat sayısı (with normalization)
const siteHabitats = {}
data.features.forEach((f) => {
  const code = f.properties.siteCode
  const rawHabitat = f.properties.habitatCode
  const normalizedCodes = normalizeHabitatCode(rawHabitat)

  if (!siteHabitats[code]) siteHabitats[code] = new Set()
  normalizedCodes.forEach((h) => siteHabitats[code].add(h))
})

// İstatistik
const counts = Object.values(siteHabitats).map((s) => s.size)
const distribution = {}
counts.forEach((c) => {
  distribution[c] = (distribution[c] || 0) + 1
})

console.log('Habitat sayısı dağılımı (kaç habitat: kaç site):')
Object.keys(distribution)
  .sort((a, b) => Number(a) - Number(b))
  .forEach((k) => {
    console.log(`  ${k} habitat: ${distribution[k]} site`)
  })

// Örnek: 000627 (Cuilcagh)
console.log('\nÖrnek - 000627 (Cuilcagh):')
if (siteHabitats['000627']) {
  console.log([...siteHabitats['000627']].join(', '))
}

// Örnek: çok habitatlı site
console.log('\nÇok habitatlı site örneği:')
const multiHabitat = Object.entries(siteHabitats).find(([k, v]) => v.size > 5)
if (multiHabitat) {
  console.log(`${multiHabitat[0]}: ${[...multiHabitat[1]].join(', ')}`)
}
