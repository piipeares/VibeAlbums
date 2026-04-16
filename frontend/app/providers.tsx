'use client'

import * as React from 'react'
import { useAuthStore } from '@/lib/store'

export function Providers({ children }: { children: React.ReactNode }) {
  const { setAuth } = useAuthStore()

  React.useEffect(() => {
    // Rehydrate auth state from localStorage on mount
    const token = localStorage.getItem('vibeauth-storage')
    if (token) {
      try {
        const parsed = JSON.parse(token)
        if (parsed.state?.token && parsed.state?.user) {
          setAuth(parsed.state.user, parsed.state.token)
        }
      } catch (e) {
        console.error('Failed to parse auth state')
      }
    }
  }, [setAuth])

  return <>{children}</>
}
