export type CountryOption = {
  code: string
  name: string
  currency: string
  locale: string
  flagSrc: string
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  {
    code: 'PH',
    name: 'Philippines',
    currency: 'PHP',
    locale: 'en-PH',
    flagSrc: '/flags/ph.png',
  },
  {
    code: 'MY',
    name: 'Malaysia',
    currency: 'MYR',
    locale: 'en-MY',
    flagSrc: '/flags/my.png',
  },
  {
    code: 'SG',
    name: 'Singapore',
    currency: 'SGD',
    locale: 'en-SG',
    flagSrc: '/flags/sg.png',
  },
  {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    locale: 'en-US',
    flagSrc: '/flags/us.jpg',
  },
  {
    code: 'AU',
    name: 'Australia',
    currency: 'AUD',
    locale: 'en-AU',
    flagSrc: '/flags/au.png',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    locale: 'en-GB',
    flagSrc: '/flags/gb.png',
  },
  {
    code: 'EU',
    name: 'European Union',
    currency: 'EUR',
    locale: 'en-EU',
    flagSrc: '/flags/eu.jpg',
  },
]

// Philippines first: it is the home market and prices are set in PHP.
export const DEFAULT_COUNTRY = COUNTRY_OPTIONS[0]

export function getCountryByCode(code?: string | null) {
  if (!code) return DEFAULT_COUNTRY
  return COUNTRY_OPTIONS.find((country) => country.code === code) ?? DEFAULT_COUNTRY
}