import {
  getDefaultFieldsForType,
  FIELD_SURVEY_TYPES,
  templateFieldsToJson,
} from '../lib/config/survey-field-definitions'

const wanted = process.argv.slice(2)
const types = wanted.length > 0 ? wanted : FIELD_SURVEY_TYPES.map((t) => t.id)

for (const t of types) {
  const meta = FIELD_SURVEY_TYPES.find((x) => x.id === t)
  const fields = getDefaultFieldsForType(t)
  process.stdout.write(
    JSON.stringify({
      survey_type: t,
      name: meta?.label ?? t,
      description: meta?.description ?? null,
      is_active: true,
      default_fields: fields ? templateFieldsToJson(fields) : {},
    }) + '\n'
  )
}
