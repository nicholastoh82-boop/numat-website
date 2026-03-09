'use client'

import { useCurrency } from '@/components/providers/currency-provider'
import { COUNTRY_OPTIONS } from '@/lib/currency'

export default function CountrySelector() {
  const { selectedCountry, setSelectedCountryCode } = useCurrency()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="country-selector" className="sr-only">
        Select country
      </label>
      <select
        id="country-selector"
        value={selectedCountry.code}
        onChange={(e) => setSelectedCountryCode(e.target.value)}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary"
      >
        {COUNTRY_OPTIONS.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name} ({country.currency})
          </option>
        ))}
      </select>
    </div>
  )
}