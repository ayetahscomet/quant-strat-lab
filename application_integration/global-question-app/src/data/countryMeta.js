import { countries } from './countries.js'
import { continentFromCountry } from './continents.js'

export function lookupCountry(answer) {
  const norm = String(answer).toLowerCase()

  const found = countries.find(
    (c) => c.name.toLowerCase() === norm || c.code.toLowerCase() === norm,
  )

  if (!found) return null

  return {
    ISOCode: found.code,
    Country: found.name,
    Continent: continentFromCountry(found.code),
  }
}
