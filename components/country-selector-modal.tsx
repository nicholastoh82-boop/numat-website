'use client'

import { useCurrency } from '@/components/providers/currency-provider'
import { COUNTRY_OPTIONS } from '@/lib/currency'
import { Button } from '@/components/ui/button'

export default function CountrySelectorModal() {
  const { showCountryModal, setSelectedCountryCode } = useCurrency()

  if (!showCountryModal) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-background p-6 shadow-2xl">
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Welcome to NUMAT
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-foreground">
            Select your country
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We’ll use this to display product pricing in your local currency using live exchange rates.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {COUNTRY_OPTIONS.map((country) => (
            <Button
              key={country.code}
              type="button"
              variant="outline"
              className="h-auto justify-start rounded-2xl border-border bg-background px-4 py-4 text-left hover:border-primary hover:bg-primary/5"
              onClick={() => setSelectedCountryCode(country.code)}
            >
              <div>
                <div className="font-semibold text-foreground">{country.name}</div>
                <div className="text-sm text-muted-foreground">{country.currency}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}