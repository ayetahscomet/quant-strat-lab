// src/data/countryAliases.js

import { countries } from './countries.js'

export function normaliseCountryKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/\./g, ' ')
    .replace(/\((.*?)\)/g, ' $1 ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\bsaint\b/g, 'st')
    .replace(/\bthe\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildBaseVariants(name) {
  const variants = new Set()
  const raw = String(name || '').trim()

  if (!raw) return []

  variants.add(raw)

  const noLeadingThe = raw.replace(/^the\s+/i, '').trim()
  if (noLeadingThe) variants.add(noLeadingThe)

  const saintToSt = raw.replace(/\bSaint\b/gi, 'St')
  if (saintToSt) variants.add(saintToSt)
  variants.add(saintToSt.replace(/\bSt\b/gi, 'St.'))

  const andToAmp = raw.replace(/\band\b/gi, '&')
  if (andToAmp) variants.add(andToAmp)

  const ampToAnd = raw.replace(/&/g, 'and')
  if (ampToAnd) variants.add(ampToAnd)

  return [...variants]
}

const manualCountryAliases = {
  'antigua and barbuda': ['antigua'],
  bahamas: ['the bahamas', 'bahamas islands'],
  bolivia: ['bolivia plurinational state of'],
  'bosnia and herzegovina': ['bosnia', 'bosnia herzegovina'],
  brazil: ['brasil'],
  brunei: ['brunei darussalam'],
  'cabo verde': ['cape verde'],
  'central african republic': ['car'],
  china: ['prc', 'peoples republic of china', "people's republic of china"],
  'congo congo brazzaville': ['republic of congo', 'congo republic', 'congo brazzaville'],
  'democratic republic of the congo': [
    'drc',
    'dr congo',
    'drc congo',
    'congo kinshasa',
    'democratic republic of congo',
    'zaire',
  ],
  "cote d'ivoire": ['ivory coast', 'cote divoire', 'cote d ivoire'],
  czechia: ['czech republic'],
  egypt: ['arab republic of egypt'],
  eswatini: ['swaziland'],
  ethiopia: ['federal democratic republic of ethiopia'],
  'falkland islands': ['falkland islands malvinas', 'falklands', 'islas malvinas'],
  gambia: ['the gambia'],
  georgia: ['sakartvelo'],
  germany: ['deutschland'],
  greece: ['hellas', 'hellenic republic'],
  'hong kong': ['hong kong sar', 'hong kong sar china', 'hk'],
  iran: ['islamic republic of iran'],
  ireland: ['republic of ireland', 'eire'],
  kyrgyzstan: ['kyrgyz republic'],
  laos: ['lao pdr', 'lao peoples democratic republic'],
  libya: ['state of libya'],
  luxembourg: ['luxemburg'],
  macao: ['macau', 'macao sar', 'macao sar china'],
  'marshall islands': ['rmi', 'republic of the marshall islands'],
  micronesia: ['fsm', 'federated states of micronesia'],
  moldova: ['republic of moldova'],
  myanmar: ['burma'],
  netherlands: ['the netherlands', 'holland'],
  'new zealand': ['nz'],
  'north korea': ['dprk', 'democratic peoples republic of korea'],
  'north macedonia': ['macedonia', 'former yugoslav republic of macedonia', 'fyrom'],
  palestine: ['state of palestine'],
  'papua new guinea': ['png'],
  philippines: ['the philippines'],
  russia: ['russian federation'],
  'saint kitts and nevis': ['st kitts', 'saint kitts'],
  'saint lucia': ['st lucia'],
  'saint vincent and the grenadines': ['st vincent and the grenadines', 'st vincent'],
  'sao tome and principe': ['sao tome'],
  'saudi arabia': ['ksa'],
  slovakia: ['slovak republic'],
  'solomon islands': ['the solomon islands'],
  somalia: ['federal republic of somalia'],
  'south africa': ['rsa'],
  'south korea': ['rok', 'republic of korea', 'korea south'],
  'south sudan': ['republic of south sudan'],
  'sri lanka': ['ceylon'],
  syria: ['syrian arab republic'],
  taiwan: ['republic of china', 'roc', 'chinese taipei'],
  tanzania: ['united republic of tanzania'],
  'timor leste': ['east timor'],
  'trinidad and tobago': ['trinidad'],
  turkey: ['turkiye'],
  turkmenistan: ['turkmenia'],
  'turks and caicos islands': ['turks and caicos', 'turks caicos'],
  'united arab emirates': ['uae'],
  'united kingdom': ['uk', 'great britain', 'britain', 'gb'],
  'united states': ['us', 'usa', 'united states of america', 'america'],
  'united states minor outlying islands': ['us minor outlying islands'],
  uzbekistan: ['uzbek republic'],
  'vatican city': ['holy see', 'vatican', 'vatican city state'],
  venezuela: ['venezuela bolivarian republic of'],
  vietnam: ['viet nam'],
  'virgin islands british': ['british virgin islands', 'bvi'],
  'virgin islands u s': ['us virgin islands', 'american virgin islands'],
  'wallis and futuna': ['wallis and futuna islands'],
}

function buildCountryAliasMap() {
  const aliasMap = {}

  for (const country of countries) {
    const canonicalName = country.name
    const canonicalKey = normaliseCountryKey(canonicalName)

    const bucket = new Set()
    bucket.add(canonicalName)

    for (const variant of buildBaseVariants(canonicalName)) {
      bucket.add(variant)
    }

    const manual = manualCountryAliases[canonicalKey] || []
    for (const variant of manual) {
      bucket.add(variant)
    }

    aliasMap[canonicalKey] = [...bucket]
  }

  return aliasMap
}

export const countryAliases = buildCountryAliasMap()

export function getCountryCanonicalMatch(input, canonList = []) {
  const inputKey = normaliseCountryKey(input)
  if (!inputKey) return null

  for (const canonical of canonList) {
    const canonicalKey = normaliseCountryKey(canonical)

    if (inputKey === canonicalKey) {
      return canonical
    }

    const aliases = countryAliases[canonicalKey] || []
    const matchedAlias = aliases.some((alias) => normaliseCountryKey(alias) === inputKey)

    if (matchedAlias) {
      return canonical
    }
  }

  return null
}
