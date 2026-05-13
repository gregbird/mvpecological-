/* eslint-disable */
import { extractText, getDocumentProxy } from 'unpdf'
import { readFileSync } from 'node:fs'

const file = process.argv[2]
const pageRange = process.argv[3]
const buf = readFileSync(file)
const pdf = await getDocumentProxy(new Uint8Array(buf))
const { text, totalPages } = await extractText(pdf, { mergePages: false })

let pages = []
if (pageRange === 'all' || !pageRange) {
  pages = text.map((t, i) => `\n===== PAGE ${i + 1}/${totalPages} =====\n${t}`)
} else {
  const [start, end] = pageRange.split('-').map(Number)
  for (let i = start - 1; i < Math.min(end, totalPages); i++) {
    pages.push(`\n===== PAGE ${i + 1}/${totalPages} =====\n${text[i]}`)
  }
}
console.log(pages.join('\n'))
