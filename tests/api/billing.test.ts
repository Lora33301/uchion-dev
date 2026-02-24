import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createProdamusSignature } from '../../server/lib/prodamus.js'

// ==================== MOCKS ====================

const TEST_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'teacher@test.ru',
  name: 'Test Teacher',
  role: 'user' as const,
  hasPaidAccess: false,
}

const TEST_SECRET = 'test-secret-key-for-billing-tests-32ch'

// In-memory DB state
let dbPaymentIntents: Array<Record<string, unknown>>
let dbWebhookEvents: Array<{ provider: string; eventKey: string; rawPayloadHash: string }>
let dbUserGenerationsLeft: number

beforeEach(() => {
  dbPaymentIntents = []
  dbWebhookEvents = []
  dbUserGenerationsLeft = 5
  vi.clearAllMocks()
})

// Environment
vi.stubEnv('PRODAMUS_SECRET', TEST_SECRET)
vi.stubEnv('PRODAMUS_PAYFORM_URL', 'https://test-shop.payform.ru/')
vi.stubEnv('APP_URL', 'http://localhost:3000')
vi.stubEnv('NODE_ENV', 'test')

// Detect table by values shape:
//   payment_intents → has productCode
//   webhook_events  → has eventKey
function detectTable(values: Record<string, unknown>): string {
  if ('eventKey' in values) return 'webhook_events'
  if ('productCode' in values) return 'payment_intents'
  return 'unknown'
}

vi.mock('../../db/index.js', () => ({
  db: {
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((values: Record<string, unknown>) => {
        const table = detectTable(values)

        if (table === 'payment_intents') {
          const intent = { id: crypto.randomUUID(), ...values, paidAt: null }
          dbPaymentIntents.push(intent)
          return { returning: vi.fn().mockResolvedValue([intent]) }
        }

        if (table === 'webhook_events') {
          // Simulate PostgreSQL unique constraint on (provider, eventKey)
          const dup = dbWebhookEvents.find(
            (e) => e.provider === values.provider && e.eventKey === values.eventKey,
          )
          if (dup) {
            const err = new Error('unique_violation') as Error & { cause: { code: string } }
            err.cause = { code: '23505' }
            throw err
          }
          dbWebhookEvents.push(values as typeof dbWebhookEvents[0])
          return { returning: vi.fn().mockResolvedValue([values]) }
        }

        return { returning: vi.fn().mockResolvedValue([values]) }
      }),
    })),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() =>
            Promise.resolve(dbPaymentIntents.length > 0 ? [dbPaymentIntents[0]] : []),
          ),
        }),
      }),
    }),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })),
  },
  runMigrations: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../db/schema.js', () => ({
  paymentIntents: { _: { name: 'payment_intents' } },
  webhookEvents: { _: { name: 'webhook_events' } },
  subscriptions: { _: { name: 'subscriptions' } },
  users: { _: { name: 'users' } },
  generationsLeft: {},
}))

vi.mock('../../server/middleware/auth.js', () => ({
  withAuth: vi.fn().mockImplementation(
    (handler: Function) => async (req: any, res: any) => {
      req.user = { ...TEST_USER }
      return handler(req, res)
    },
  ),
  withAdminAuth: vi.fn(),
}))

vi.mock('../../server/middleware/rate-limit.js', () => ({
  checkBillingCreateLinkRateLimit: vi.fn().mockResolvedValue({
    success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
  }),
  checkBillingWebhookRateLimit: vi.fn().mockResolvedValue({
    success: true, limit: 100, remaining: 99, reset: Date.now() + 60000,
  }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('../../server/lib/prodamus.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../server/lib/prodamus.js')>()
  return {
    ...original,
    // Real: createProdamusSignature, verifyWebhookSignature
    // Mock: external Prodamus API calls
    generatePaymentLink: vi.fn().mockReturnValue('https://test-shop.payform.ru/?mock=1'),
    generateSubscriptionLink: vi.fn().mockReturnValue('https://test-shop.payform.ru/?mock_sub=1'),
  }
})

vi.mock('../../server/lib/billing-effects.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../server/lib/billing-effects.js')>()
  return {
    ...original,
    applyProductEffect: vi.fn().mockImplementation(async (_userId: string, productCode: string) => {
      const match = productCode.match(/^generations_dynamic_(\d+)$/)
      if (match) {
        dbUserGenerationsLeft += parseInt(match[1], 10)
        return { success: true, message: `Added ${match[1]} generations` }
      }
      const product = original.PRODUCTS[productCode]
      if (product?.type === 'generations') {
        dbUserGenerationsLeft += product.value as number
        return { success: true, message: `Added ${product.value} generations` }
      }
      return { success: false, message: 'Unknown product' }
    }),
  }
})

vi.mock('../../api/_lib/telegram/bot.js', () => ({
  sendAdminAlert: vi.fn().mockResolvedValue(undefined),
}))

// ==================== APP SETUP ====================

async function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  const { default: billingRoutes } = await import('../../server/routes/billing.js')
  app.use('/api/billing', billingRoutes)

  const { errorHandler } = await import('../../server/middleware/error-handler.js')
  app.use(errorHandler)

  return app
}

function buildSignedPayload(data: Record<string, unknown>): Record<string, unknown> {
  const signature = createProdamusSignature(data, TEST_SECRET)
  return { ...data, sign: signature }
}

// ==================== TESTS ====================

describe('Billing API Integration', () => {

  // 1. POST /api/billing/prodamus/create-link
  describe('POST /api/billing/prodamus/create-link', () => {
    it('should return payment link for dynamic generations purchase', async () => {
      const app = await createTestApp()

      const res = await request(app)
        .post('/api/billing/prodamus/create-link')
        .send({ generationsCount: 60 })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.paymentUrl).toContain('https://test-shop.payform.ru/')
      expect(res.body.orderId).toMatch(/^UC_/)
      expect(res.body.expiresAt).toBeTruthy()

      // Payment intent persisted
      expect(dbPaymentIntents).toHaveLength(1)
      expect(dbPaymentIntents[0].productCode).toBe('generations_dynamic_60')
      expect(dbPaymentIntents[0].userId).toBe(TEST_USER.id)
      expect(dbPaymentIntents[0].status).toBe('created')
    })

    it('should reject invalid generation count', async () => {
      const app = await createTestApp()

      const res = await request(app)
        .post('/api/billing/prodamus/create-link')
        .send({ generationsCount: 999 })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Допустимые количества')
    })

    it('should reject empty request body', async () => {
      const app = await createTestApp()

      const res = await request(app)
        .post('/api/billing/prodamus/create-link')
        .send({})

      expect(res.status).toBe(400)
    })
  })

  // 2. POST /api/billing/webhook — one-time payment
  describe('POST /api/billing/webhook', () => {
    it('should process successful payment and add generations', async () => {
      const app = await createTestApp()

      // Step 1: create payment intent via create-link
      const createRes = await request(app)
        .post('/api/billing/prodamus/create-link')
        .send({ generationsCount: 60 })

      expect(createRes.status).toBe(201)
      const { orderId } = createRes.body

      // Step 2: simulate Prodamus webhook callback with valid signature
      const webhookData = {
        order_id: orderId,
        payment_status: 'success',
        sum: '990.00',
        currency: 'RUB',
        date: new Date().toISOString(),
        customer_email: TEST_USER.email,
      }

      const res = await request(app)
        .post('/api/billing/webhook')
        .send(buildSignedPayload(webhookData))

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('processed')
      expect(dbUserGenerationsLeft).toBe(5 + 60)
    })

    it('should reject webhook with invalid signature', async () => {
      const app = await createTestApp()

      const res = await request(app)
        .post('/api/billing/webhook')
        .send({
          order_id: 'UC_fake_order',
          payment_status: 'success',
          sign: '0'.repeat(64), // wrong signature
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid signature')
    })

    it('should handle failed payment without adding generations', async () => {
      const app = await createTestApp()

      // Create intent
      const createRes = await request(app)
        .post('/api/billing/prodamus/create-link')
        .send({ generationsCount: 15 })
      const { orderId } = createRes.body

      // Send fail webhook
      const res = await request(app)
        .post('/api/billing/webhook')
        .send(buildSignedPayload({
          order_id: orderId,
          payment_status: 'fail',
          sum: '300.00',
          currency: 'RUB',
        }))

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('noted')
      expect(dbUserGenerationsLeft).toBe(5) // unchanged
    })
  })

  // 3. Idempotency — duplicate webhook must not double-credit
  describe('Webhook idempotency', () => {
    it('should not add generations twice for duplicate webhook', async () => {
      const app = await createTestApp()

      // Create intent
      const createRes = await request(app)
        .post('/api/billing/prodamus/create-link')
        .send({ generationsCount: 30 })
      const { orderId } = createRes.body

      const payload = buildSignedPayload({
        order_id: orderId,
        payment_status: 'success',
        sum: '600.00',
        currency: 'RUB',
        customer_email: TEST_USER.email,
      })

      // First call — processed
      const res1 = await request(app)
        .post('/api/billing/webhook')
        .send(payload)

      expect(res1.status).toBe(200)
      expect(res1.body.status).toBe('processed')
      expect(dbUserGenerationsLeft).toBe(5 + 30)

      // Second call — already_processed
      const res2 = await request(app)
        .post('/api/billing/webhook')
        .send(payload)

      expect(res2.status).toBe(200)
      expect(res2.body.status).toBe('already_processed')
      expect(dbUserGenerationsLeft).toBe(5 + 30) // NOT 5 + 30 + 30
    })

    it('should allow different statuses for the same order', async () => {
      const app = await createTestApp()

      // Create intent
      const createRes = await request(app)
        .post('/api/billing/prodamus/create-link')
        .send({ generationsCount: 15 })
      const { orderId } = createRes.body

      // fail webhook
      const failRes = await request(app)
        .post('/api/billing/webhook')
        .send(buildSignedPayload({
          order_id: orderId,
          payment_status: 'fail',
          sum: '300.00',
        }))

      expect(failRes.status).toBe(200)
      expect(failRes.body.status).toBe('noted')
      expect(dbUserGenerationsLeft).toBe(5)

      // success webhook (different event key: orderId:success vs orderId:fail)
      const successRes = await request(app)
        .post('/api/billing/webhook')
        .send(buildSignedPayload({
          order_id: orderId,
          payment_status: 'success',
          sum: '300.00',
          customer_email: TEST_USER.email,
        }))

      expect(successRes.status).toBe(200)
      expect(successRes.body.status).toBe('processed')
      expect(dbUserGenerationsLeft).toBe(5 + 15)
    })
  })
})
