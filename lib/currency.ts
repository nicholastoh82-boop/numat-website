export type SupportedCountryCode =
  | 'US'
  | 'PH'
  | 'MY'
  | 'SG'
  | 'AU'
  | 'GB'
  | 'AE'
  | 'EU'

export type CountryOption = {
  code: SupportedCountryCode
  name: string
  currency: string
  locale: string
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'US', name: 'United States', currency: 'USD', locale: 'en-US' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', locale: 'en-PH' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', locale: 'en-MY' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', locale: 'en-SG' },
  { code: 'AU', name: 'Australia', currency: 'AUD', locale: 'en-AU' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', locale: 'en-GB' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', locale: 'en-AE' },
  { code: 'EU', name: 'Euro Area', currency: 'EUR', locale: 'en-IE' },
]

export const DEFAULT_COUNTRY = COUNTRY_OPTIONS.find((c) => c.code === 'US')!

export function getCountryByCode(code?: string | null) {
  return COUNTRY_OPTIONS.find((country) => country.code === code) ?? DEFAULT_COUNTRY
}

export function formatMoney(
  value: number | null | undefined,
  currency = 'USD',
  locale = 'en-US'
) {
  if (value == null || Number.isNaN(value)) return 'Request Quote'

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`
  }
}