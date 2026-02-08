// /lib/airtable.js
import Airtable from 'airtable'

const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } = process.env

if (!AIRTABLE_API_KEY) {
  throw new Error('Missing env var: AIRTABLE_API_KEY')
}
if (!AIRTABLE_BASE_ID) {
  throw new Error('Missing env var: AIRTABLE_BASE_ID')
}

export const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID)

// Optional helper (makes your API routes consistent)
export function table(name) {
  if (!name) throw new Error('table(name) requires a table name')
  return base(name)
}
