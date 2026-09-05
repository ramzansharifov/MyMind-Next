import { z } from 'zod'

export const systemHealthSchema = z.object({
  database: z.literal('ready'),
  sqliteVersion: z.string()
})

export const shutdownRequestSchema = z.object({
  requestId: z.string().uuid()
})

export const shutdownResponseSchema = shutdownRequestSchema.extend({
  decision: z.enum(['success', 'failed', 'cancel', 'force'])
})
