import type { User } from './auth'

export function getGenerationsLeft(user: User | null): number {
  if (!user) return 0
  return user.generationsLeft ?? 0
}

export function canGenerate(user: User | null): boolean {
  if (!user) return false
  return getGenerationsLeft(user) > 0
}

export function requiresAuth(user: User | null): boolean {
  return !user
}

/** Whether the user can regenerate tasks (daily limit not 0) */
export function canRegenerateTask(user: User | null): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return (user.limits?.dailyRegenLimit ?? 0) !== 0
}

/** Number of remaining regen attempts today, or null if unlimited */
export function getRegenRemaining(user: User | null): number | null {
  if (!user?.limits) return null
  const limit = user.limits.dailyRegenLimit
  if (limit === -1) return null // unlimited
  if (limit === 0) return 0
  const used = user.usage?.dailyRegenUsed ?? 0
  return Math.max(0, limit - used)
}

/** Whether the user's plan allows presentation generation */
export function canGeneratePresentation(user: User | null): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return user.limits?.canGeneratePresentation ?? false
}

/** Whether a specific slide count is allowed for the user */
export function isSlideCountAllowed(user: User | null, slideCount: number): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  const allowed = user.limits?.allowedSlideCounts ?? []
  if (allowed.length === 0) return false
  return allowed.includes(slideCount)
}
