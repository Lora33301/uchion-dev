/**
 * Subscription plans configuration.
 * Single source of truth for all plan limits and parameters.
 * Easily extensible — just add new fields to PlanConfig.
 */

export type SubscriptionPlanId = 'free' | 'starter' | 'teacher' | 'expert'

export interface PlanConfig {
  id: SubscriptionPlanId
  name: string
  price: number // rubles per month, 0 for free
  generationsPerPeriod: number
  isRecurring: boolean
  folders: number
  paidModel: boolean
  maxWorksheets: number
  maxPresentations: number
  canGeneratePresentation: boolean
  allowedSlideCounts: number[]
  dailyRegenLimit: number // 0=forbidden, -1=unlimited
  pdfTemplateStyles: boolean // can use non-standard PDF styles (rainbow, academic)
  pdfWatermark: boolean
  earlyAccess: boolean
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Бесплатный',
    price: 0,
    generationsPerPeriod: 5, // one-time, not renewable
    isRecurring: false,
    folders: 2,
    paidModel: false,
    maxWorksheets: 15,
    maxPresentations: 5,
    canGeneratePresentation: true,
    allowedSlideCounts: [12],
    dailyRegenLimit: 0,
    pdfTemplateStyles: false,
    pdfWatermark: true,
    earlyAccess: false,
  },
  starter: {
    id: 'starter',
    name: 'Начинающий',
    price: 390,
    generationsPerPeriod: 25,
    isRecurring: true,
    folders: 5,
    paidModel: true,
    maxWorksheets: 20,
    maxPresentations: 15,
    canGeneratePresentation: true,
    allowedSlideCounts: [12, 18],
    dailyRegenLimit: 3,
    pdfTemplateStyles: true,
    pdfWatermark: false,
    earlyAccess: false,
  },
  teacher: {
    id: 'teacher',
    name: 'Методист',
    price: 890,
    generationsPerPeriod: 60,
    isRecurring: true,
    folders: 10,
    paidModel: true,
    maxWorksheets: 50,
    maxPresentations: 30,
    canGeneratePresentation: true,
    allowedSlideCounts: [12, 18],
    dailyRegenLimit: 6,
    pdfTemplateStyles: true,
    pdfWatermark: false,
    earlyAccess: false,
  },
  expert: {
    id: 'expert',
    name: 'Эксперт',
    price: 1690,
    generationsPerPeriod: 120,
    isRecurring: true,
    folders: 10,
    paidModel: true,
    maxWorksheets: 100,
    maxPresentations: 60,
    canGeneratePresentation: true,
    allowedSlideCounts: [12, 18, 24],
    dailyRegenLimit: 10,
    pdfTemplateStyles: true,
    pdfWatermark: false,
    earlyAccess: false,
  },
} as const

/** All paid plan IDs */
export const PAID_PLAN_IDS = ['starter', 'teacher', 'expert'] as const
export type PaidPlanId = typeof PAID_PLAN_IDS[number]

/** Check if a plan ID is valid */
export function isValidPlanId(plan: string): plan is SubscriptionPlanId {
  return plan in SUBSCRIPTION_PLANS
}

/** Check if a plan ID is a paid plan */
export function isPaidPlan(plan: string): plan is PaidPlanId {
  return PAID_PLAN_IDS.includes(plan as PaidPlanId)
}

/** Get plan config by ID, returns free plan if invalid */
export function getPlanConfig(plan: string): PlanConfig {
  if (isValidPlanId(plan)) {
    return SUBSCRIPTION_PLANS[plan]
  }
  return SUBSCRIPTION_PLANS.free
}

/** Subscription statuses that count as "active" for plan enforcement */
export function isActiveSubscription(status: string | null | undefined): boolean {
  return status === 'active' || status === 'past_due'
}

/** Get effective plan config for a user based on their subscription status.
 *  Cancelled subscriptions remain active until currentPeriodEnd. */
export function getUserPlanConfig(
  plan: string | null | undefined,
  subscriptionStatus: string | null | undefined,
  currentPeriodEnd?: Date | string | null
): PlanConfig {
  if (!plan || plan === 'free') {
    return SUBSCRIPTION_PLANS.free
  }

  // Active or past_due — always grant paid plan
  if (isActiveSubscription(subscriptionStatus)) {
    return getPlanConfig(plan)
  }

  // Cancelled but period not yet expired — still grant paid plan
  if (subscriptionStatus === 'cancelled' && currentPeriodEnd) {
    const endDate = typeof currentPeriodEnd === 'string' ? new Date(currentPeriodEnd) : currentPeriodEnd
    if (endDate > new Date()) {
      return getPlanConfig(plan)
    }
  }

  return SUBSCRIPTION_PLANS.free
}
