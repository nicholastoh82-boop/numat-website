'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_COUNTRY, getCountryByCode, type CountryOption } from '@/lib/currency'

type CurrencyContextValue = {
  selectedCountry: CountryOption
  setSelectedCountryCode: (code: string) => void
  hasHydrated: boolean
  showCountryModal: boolean
  closeCountryModal: () => void
  convertFromUsd: (usdAmount: number | null | undefined) => number | null
  formatConvertedFromUsd: (usdAmount: number | null | undefined) => string
  exchangeRate: number
  currency: string
  locale: string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

const STORAGE_KEY = 'numat-selected-country'

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(DEFAULT_COUNTRY)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [exchangeRate, setExchangeRate] = useState(1)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      const country = getCountryByCode(stored)

      setSelectedCountry(country)
      setShowCountryModal(!stored)
    } catch (error) {
      console.error('Currency provider hydration error:', error)
      setSelectedCountry(DEFAULT_COUNTRY)
      setShowCountryModal(true)
    } finally {
      setHasHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hasHydrated) return

    const controller = new AbortController()

    async function fetchRate() {
      if (selectedCountry.currency === 'USD') {
        setExchangeRate(1)
        return
      }

      try {
        const res = await fetch(`/api/exchange-rate?currency=${encodeURIComponent(selectedCountry.currency)}`, {
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        })

        if (!res.ok) {
          console.warn(
            `Exchange rate fetch failed for ${selectedCountry.currency}. Status: ${res.status}. Falling back to 1.`
          )
          setExchangeRate(1)
          return
        }

        let data: unknown = null

        try {
          data = await res.json()
        } catch (jsonError) {
          console.warn('Exchange rate response was not valid JSON. Falling back to 1.', jsonError)
          setExchangeRate(1)
          return
        }

        const rate =
          typeof data === 'object' &&
          data !== null &&
          'rate' in data &&
          typeof (data as { rate?: unknown }).rate === 'number' &&
          Number.isFinite((data as { rate: number }).rate) &&
          (data as { rate: number }).rate > 0
            ? (data as { rate: number }).rate
            : 1

        if (rate === 1) {
          console.warn(`Exchange rate missing/invalid for ${selectedCountry.currency}. Using fallback rate 1.`)
        }

        setExchangeRate(rate)
      } catch (error) {
        if (controller.signal.aborted) return

        console.error('Exchange rate error:', error)
        setExchangeRate(1)
      }
    }

    fetchRate()

    return () => controller.abort()
  }, [selectedCountry.currency, hasHydrated])

  const setSelectedCountryCode = (code: string) => {
    const country = getCountryByCode(code)

    setSelectedCountry(country)

    try {
      window.localStorage.setItem(STORAGE_KEY, country.code)
    } catch (error) {
      console.error('Failed to persist selected country:', error)
    }

    setShowCountryModal(false)
  }

  const convertFromUsd = (usdAmount: number | null | undefined) => {
    if (usdAmount == null || !Number.isFinite(usdAmount)) return null
    return usdAmount * exchangeRate
  }

  const formatConvertedFromUsd = (usdAmount: number | null | undefined) => {
    const converted = convertFromUsd(usdAmount)

    if (converted == null) return 'Request Quote'

    const isSubUnit = converted < 1
    const minFraction = isSubUnit ? 2 : 0
    const maxFraction = isSubUnit ? 4 : 0

    try {
      return new Intl.NumberFormat(selectedCountry.locale, {
        style: 'currency',
        currency: selectedCountry.currency,
        minimumFractionDigits: minFraction,
        maximumFractionDigits: maxFraction,
      }).format(converted)
    } catch {
      if (isSubUnit) {
        return `${selectedCountry.currency} ${converted.toFixed(4)}`
      }
      return `${selectedCountry.currency} ${Math.round(converted).toLocaleString()}`
    }
  }

  const value = useMemo<CurrencyContextValue>(
    () => ({
      selectedCountry,
      setSelectedCountryCode,
      hasHydrated,
      showCountryModal,
      closeCountryModal: () => setShowCountryModal(false),
      convertFromUsd,
      formatConvertedFromUsd,
      exchangeRate,
      currency: selectedCountry.currency,
      locale: selectedCountry.locale,
    }),
    [selectedCountry, hasHydrated, showCountryModal, exchangeRate]
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const context = useContext(CurrencyContext)

  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider')
  }

  return context
}