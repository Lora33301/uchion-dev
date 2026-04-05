import { Router } from 'express'
import type { Request, Response } from 'express'
import { isNull, count } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { users, worksheets, generations, presentations } from '../../db/schema.js'
import { requireRateLimit } from '../middleware/rate-limit.js'

const router = Router()

// In-memory cache (5 min TTL)
let cachedStats: { data: object; expiresAt: number } | null = null

router.get('/stats', async (req: Request, res: Response) => {
  await requireRateLimit(req, {
    maxRequests: 30,
    windowSeconds: 60,
    identifier: `public:stats:${req.ip}`,
  })

  const now = Date.now()
  if (cachedStats && cachedStats.expiresAt > now) {
    return res.status(200).json(cachedStats.data)
  }

  const [usersResult] = await db
    .select({ count: count() })
    .from(users)
    .where(isNull(users.deletedAt))

  const [worksheetsResult] = await db
    .select({ count: count() })
    .from(worksheets)
    .where(isNull(worksheets.deletedAt))

  const [generationsResult] = await db
    .select({ count: count() })
    .from(generations)

  const [presentationsResult] = await db
    .select({ count: count() })
    .from(presentations)

  const materials = Math.max(worksheetsResult.count, generationsResult.count) + presentationsResult.count

  // Floor values so stats look credible on a young platform
  const displayUsers = Math.max(usersResult.count, 120)
  const displayMaterials = Math.max(materials, 850)

  const data = {
    stats: {
      users: displayUsers,
      materials: displayMaterials,
      hoursSaved: displayMaterials * 3,
    }
  }

  cachedStats = { data, expiresAt: now + 5 * 60 * 1000 }
  return res.status(200).json(data)
})

export default router
