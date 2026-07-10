import { z } from 'zod'

export const systemHealthSchema = z.object({
  database: z.literal('ready'),
  sqliteVersion: z.string()
})
