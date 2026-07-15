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
  unitPhp: (usdAmount: number | null | undefined) => number | null
  lineTotalPhpFromUsd: (usdAmount: number | null | undefined, qty: number) => number | null
  formatPhpAmount: (phpAmount: number | null | undefined) => string
  exchangeRate: number
  // PHP based pricing. NuWeave and everything priced after it authors its list
  // price in PHP and converts outward at the rate of the day.
  convertFromPhp: (phpAmount: number | null | undefined) => number | null
  formatConvertedFromPhp: (phpAmount: number | null | undefined) => string
  lineTotalFromPhp: (phpAmount: number | null | undefined, qty: number) => number | null
  phpRate: number
  phpRateDate: string | null
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
  const [phpRate, setPhpRate] = useState(1)
  const [phpRateDate, setPhpRateDate] = useState<string | null>(null)

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

  // Legacy USD based rate. Cart, quotes and admin still read this.
  useEffect(() => {
    if (!hasHydrated) return

    const controller = new AbortController()

    async function fetchRate() {
      if (selectedCountry.currency === 'USD') {
        setExchangeRate(1)
        return
      }

      try {
        const res = await fetch(
          `/api/exchange-rate?currency=${encodeURIComponent(selectedCountry.currency)}`,
          { cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } }
        )

        if (!res.ok) {
          console.warn(
            `Exchange rate fetch failed for ${selectedCountry.currency}. Status: ${res.status}. Falling back to 1.`
          )
          setExchangeRate(1)
          return
        }

        const data = await res.json()
        const rate =
          typeof data?.rate === 'number' && Number.isFinite(data.rate) && data.rate > 0
            ? data.rate
            : 1

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

  // PHP based rate. Product pricing converts from the PHP list price.
  useEffect(() => {
    if (!hasHydrated) return

    const controller = new AbortController()

    async function fetchPhpRate() {
      if (selectedCountry.currency === 'PHP') {
        setPhpRate(1)
        setPhpRateDate(null)
        return
      }

      try {
        const res = await fetch(
          `/api/exchange-rate?base=PHP&currency=${encodeURIComponent(selectedCountry.currency)}`,
          { cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } }
        )

        if (!res.ok) {
          console.warn(
            `PHP rate fetch failed for ${selectedCountry.currency}. Status: ${res.status}.`
          )
          setPhpRate(0)
          setPhpRateDate(null)
          return
        }

        const data = await res.json()
        const rate =
          typeof data?.rate === 'number' && Number.isFinite(data.rate) && data.rate > 0
            ? data.rate
            : 0

        setPhpRate(rate)
        setPhpRateDate(typeof data?.date === 'string' ? data.date : null)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('PHP exchange rate error:', error)
        setPhpRate(0)
        setPhpRateDate(null)
      }
    }

    fetchPhpRate()
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
    const minFraction = 2
    const maxFraction = isSubUnit ? 4 : 2

    try {
      return new Intl.NumberFormat(selectedCountry.locale, {
        style: 'currency',
        currency: selectedCountry.currency,
        minimumFractionDigits: minFraction,
        maximumFractionDigits: maxFraction,
      }).format(converted)
    } catch {
      if (isSubUnit) return `${selectedCountry.currency} ${converted.toFixed(4)}`
      return `${selectedCountry.currency} ${converted.toFixed(2)}`
    }
  }

  const unitPhp = (usdAmount: number | null | undefined): number | null => {
    if (usdAmount == null || !Number.isFinite(usdAmount)) return null
    return Math.round(usdAmount * exchangeRate * 100) / 100
  }

  const lineTotalPhpFromUsd = (
    usdAmount: number | null | undefined,
    qty: number
  ): number | null => {
    const unit = unitPhp(usdAmount)
    if (unit == null) return null
    return Math.round(unit * qty * 100) / 100
  }

  const formatPhpAmount = (phpAmount: number | null | undefined): string => {
    if (phpAmount == null || !Number.isFinite(phpAmount)) return 'Request Quote'

    try {
      return new Intl.NumberFormat(selectedCountry.locale, {
        style: 'currency',
        currency: selectedCountry.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(phpAmount)
    } catch {
      return `${selectedCountry.currency} ${phpAmount.toFixed(2)}`
    }
  }

  // Rounded to 2dp so a displayed line total reconciles against the displayed unit.
  const convertFromPhp = (phpAmount: number | null | undefined): number | null => {
    if (phpAmount == null || !Number.isFinite(phpAmount)) return null
    if (!phpRate || phpRate <= 0) return null
    return Math.round(phpAmount * phpRate * 100) / 100
  }

  const formatConvertedFromPhp = (phpAmount: number | null | undefined): string => {
    const converted = convertFromPhp(phpAmount)

    if (converted == null) return 'Request Quote'

    try {
      return new Intl.NumberFormat(selectedCountry.locale, {
        style: 'currency',
        currency: selectedCountry.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted)
    } catch {
      return `${selectedCountry.currency} ${converted.toFixed(2)}`
    }
  }

  const lineTotalFromPhp = (
    phpAmount: number | null | undefined,
    qty: number
  ): number | null => {
    const unit = convertFromPhp(phpAmount)
    if (unit == null) return null
    return Math.round(unit * qty * 100) / 100
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
      unitPhp,
      lineTotalPhpFromUsd,
      formatPhpAmount,
      exchangeRate,
      convertFromPhp,
      formatConvertedFromPhp,
      lineTotalFromPhp,
      phpRate,
      phpRateDate,
      currency: selectedCountry.currency,
      locale: selectedCountry.locale,
    }),
    [selectedCountry, hasHydrated, showCountryModal, exchangeRate, phpRate, phpRateDate]
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
