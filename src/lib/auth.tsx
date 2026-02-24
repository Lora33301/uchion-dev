import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { useSessionStore } from '../store/session'

// ==================== TYPES ====================

export interface UserSubscription {
  plan: 'free' | 'starter' | 'teacher' | 'expert'
  status: 'active' | 'past_due' | 'cancelled' | 'expired'
  generationsLeft: number
  generationsTotal: number
  currentPeriodEnd: string | null
  cancelledAt: string | null
}

export interface PlanLimits {
  folders: number
  maxWorksheets: number
  maxPresentations: number
  canGeneratePresentation: boolean
  allowedSlideCounts: number[]
  dailyRegenLimit: number // 0=forbidden, -1=unlimited
  pdfTemplateStyles: boolean
  pdfWatermark: boolean
}

export interface PlanUsage {
  worksheets: number
  presentations: number
  folders: number
  dailyRegenUsed: number
}

export interface User {
  id: string
  email: string
  name?: string | null
  role: 'user' | 'admin'
  generationsLeft: number
  telegramBonusClaimed?: boolean
  subscription?: UserSubscription
  limits?: PlanLimits
  usage?: PlanUsage
}

interface AuthContextType {
  user: User | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  signInWithYandex: (mailingConsent?: boolean) => void
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

// ==================== CONTEXT ====================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ==================== PROVIDER ====================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const prevUserIdRef = useRef<string | null>(null)

  // Clear session store when user identity changes
  useEffect(() => {
    if (user && prevUserIdRef.current && prevUserIdRef.current !== user.id) {
      useSessionStore.getState().clearAll()
    }
    prevUserIdRef.current = user?.id ?? null
  }, [user])

  // Try to refresh token and get user
  const tryRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        // Retry getting user info after refresh
        const meResponse = await fetch('/api/auth/me', {
          credentials: 'include',
        })

        if (meResponse.ok) {
          const data = await meResponse.json()
          setUser(data.user)
          setStatus('authenticated')
          return true
        }
      }
      return false
    } catch {
      return false
    }
  }, [])

  // Check authentication on mount
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setStatus('authenticated')
      } else if (response.status === 401) {
        const refreshed = await tryRefresh()
        if (!refreshed) {
          setUser(null)
          setStatus('unauthenticated')
        }
      } else {
        setUser(null)
        setStatus('unauthenticated')
      }
    } catch (error) {
      void error
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [tryRefresh])

  // Check auth on mount
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // OAuth redirect handlers
  const signInWithYandex = (mailingConsent?: boolean) => {
    if (mailingConsent) {
      document.cookie = 'uchion_mailing_consent=1; path=/api/auth/; max-age=600; SameSite=Lax'
    }
    window.location.href = '/api/auth/yandex/redirect'
  }

  // Logout
  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      useSessionStore.getState().clearAll()
      setUser(null)
      setStatus('unauthenticated')
    }
  }

  // Manual refresh
  const refreshAuth = async () => {
    await checkAuth()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        signInWithYandex,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ==================== HOOKS ====================

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Compatibility hook (similar structure to old useSession)
export function useSession() {
  const { user, status } = useAuth()
  return {
    data: user ? { user } : null,
    status,
  }
}
