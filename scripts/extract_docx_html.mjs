/* eslint-disable */
import mammoth from 'mammoth'

const file = process.argv[2]
const result = await mammoth.convertToHtml({ path: file })
console.log(result.value)
if (result.messages && result.messages.length > 0) {
  console.error('\n---MESSAGES---')
  for (const m of result.messages) {
    console.error(`[${m.type}] ${m.message}`)
  }
}
