'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Get the current user
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user || null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user'))
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null)
        setIsLoading(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  return { user, isLoading, error, isLoggedIn: !!user }
}
