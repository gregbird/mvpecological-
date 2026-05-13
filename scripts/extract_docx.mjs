/* eslint-disable */
import mammoth from 'mammoth'

const file = process.argv[2]
const result = await mammoth.extractRawText({ path: file })
console.log(result.value)
