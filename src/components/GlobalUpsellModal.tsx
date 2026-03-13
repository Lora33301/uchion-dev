import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import SubscriptionPlansModal from './SubscriptionPlansModal'

/**
 * Shows SubscriptionPlansModal globally (on any page) when:
 * 1) generationsLeft reaches 2 — once
 * 2) generationsLeft reaches 0 — once more
 *
 * Flags reset when generationsLeft goes above 2 (user topped up),
 * so the cycle repeats on next depletion.
 */
export default function GlobalUpsellModal() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    const gens = user.generationsLeft
    const key2 = `uchion_upsell_${user.id}_2`
    const key0 = `uchion_upsell_${user.id}_0`

    // Reset flags when user has plenty of generations (bought more)
    if (gens > 2) {
      localStorage.removeItem(key2)
      localStorage.removeItem(key0)
      return
    }

    // Threshold: 0 generations (priority over "2" check)
    if (gens === 0 && !localStorage.getItem(key0)) {
      const timer = setTimeout(() => {
        setOpen(true)
        localStorage.setItem(key0, '1')
      }, 800)
      return () => clearTimeout(timer)
    }

    // Threshold: 1–2 generations left
    if (gens > 0 && gens <= 2 && !localStorage.getItem(key2)) {
      const timer = setTimeout(() => {
        setOpen(true)
        localStorage.setItem(key2, '1')
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [user])

  return <SubscriptionPlansModal isOpen={open} onClose={() => setOpen(false)} />
}
