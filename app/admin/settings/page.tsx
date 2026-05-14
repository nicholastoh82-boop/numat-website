'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Save } from 'lucide-react'

type AdminSettings = {
  id?: string
  quote_validity_days: number
  default_lead_time_days: number
  whatsapp_number: string
  sales_email: string
}

const DEFAULT_SETTINGS: AdminSettings = {
  quote_validity_days: 14,
  default_lead_time_days: 10,
  whatsapp_number: '+639123456789',
  sales_email: 'sales@numat.ph',
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/admin/settings')
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load settings')
        }

        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setMessage(null)

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }

      setSettings({
        ...DEFAULT_SETTINGS,
        ...data,
      })

      setMessage('Settings saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure pricing rules and system settings
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold text-foreground">Quote Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">
              Quote Validity (days)
            </label>
            <Input
              type="number"
              value={settings.quote_validity_days}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  quote_validity_days: Number(e.target.value),
                }))
              }
              className="mt-1.5 max-w-32"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              Default Lead Time (days)
            </label>
            <Input
              type="number"
              value={settings.default_lead_time_days}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  default_lead_time_days: Number(e.target.value),
                }))
              }
              className="mt-1.5 max-w-32"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold text-foreground">Contact Information</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">
              WhatsApp Number
            </label>
            <Input
              type="tel"
              value={settings.whatsapp_number}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  whatsapp_number: e.target.value,
                }))
              }
              className="mt-1.5"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              Sales Email
            </label>
            <Input
              type="email"
              value={settings.sales_email}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  sales_email: e.target.value,
                }))
              }
              className="mt-1.5"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  )
}