'use client'

import { useEffect, useState } from 'react'
import AppNav from '@/components/AppNav'
import CarrotLoading from '@/components/CarrotLoading'
import UserSettingsForm from '@/components/UserSettingsForm'
import { UserSettings } from '@/lib/supabase'

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/user-settings')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setSettings(await res.json())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load settings'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <AppNav />
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Kitchen settings
        </h1>
        <p className="text-gray-600 mb-8">
          Diets and preferences guide recipe generation. Staples are checked
          afterward to note what you may not have on hand.
        </p>

        {loading && (
          <div className="flex justify-center py-16">
            <CarrotLoading />
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 mb-3">{error}</p>
            <button
              type="button"
              onClick={load}
              className="bg-forest-green text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {settings && !loading && (
          <UserSettingsForm
            initial={settings}
            onSaved={(s) => setSettings(s)}
          />
        )}
      </div>
    </div>
  )
}
