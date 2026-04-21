// /src/data/countryMeta.js

import { countries } from './countries.js'
import { continentFromCountry } from './continents.js'
import { getCountryCanonicalMatch, normaliseCountryKey } from './countryAliases.js'

export function lookupCountry(answer) {
  const raw = String(answer || '').trim()
  if (!raw) return null

  const normalisedInput = normaliseCountryKey(raw)

  const byCode = countries.find((c) => normaliseCountryKey(c.code) === normalisedInput)
  if (byCode) {
    return {
      ISOCode: byCode.code,
      Country: byCode.name,
      Continent: continentFromCountry(byCode.code),
    }
  }

  const canonical = getCountryCanonicalMatch(
    raw,
    countries.map((c) => c.name),
  )

  if (!canonical) return null

  const found = countries.find((c) => c.name === canonical)
  if (!found) return null

  return {
    ISOCode: found.code,
    Country: found.name,
    Continent: continentFromCountry(found.code),
  }
}
