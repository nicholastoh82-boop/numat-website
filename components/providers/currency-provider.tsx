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
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [exchangeRate, setExchangeRate] = useState(1)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const country = getCountryByCode(stored)

    setSelectedCountry(country)
    setShowCountryModal(!stored)
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return

    async function fetchRate() {
      try {
        if (selectedCountry.currency === 'USD') {
          setExchangeRate(1)
          return
        }

        const res = await fetch(`/api/exchange-rate?currency=${selectedCountry.currency}`, {
          cache: 'no-store',
        })

        if (!res.ok) {
          throw new Error('Failed to fetch exchange rate')
        }

        const data = await res.json()
        setExchangeRate(typeof data.rate === 'number' ? data.rate : 1)
      } catch (error) {
        console.error('Exchange rate error:', error)
        setExchangeRate(1)
      }
    }

    fetchRate()
  }, [selectedCountry.currency, hasHydrated])

  const setSelectedCountryCode = (code: string) => {
    const country = getCountryByCode(code)
    setSelectedCountry(country)
    window.localStorage.setItem(STORAGE_KEY, country.code)
    setShowCountryModal(false)
  }

  const convertFromUsd = (usdAmount: number | null | undefined) => {
    if (usdAmount == null || Number.isNaN(usdAmount)) return null
    return usdAmount * exchangeRate
  }

  const formatConvertedFromUsd = (usdAmount: number | null | undefined) => {
    const converted = convertFromUsd(usdAmount)
    if (converted == null) return 'Request Quote'

    try {
      return new Intl.NumberFormat(selectedCountry.locale, {
        style: 'currency',
        currency: selectedCountry.currency,
        maximumFractionDigits: 0,
      }).format(converted)
    } catch {
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