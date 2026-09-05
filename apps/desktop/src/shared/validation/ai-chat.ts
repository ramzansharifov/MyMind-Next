import { z } from 'zod'

export const aiChatBoundsSchema = z.object({
  x: z.number().int().min(0).max(10000),
  y: z.number().int().min(0).max(10000),
  width: z.number().int().min(1).max(10000),
  height: z.number().int().min(1).max(10000)
})

export const setAiChatOpenInputSchema = z.object({
  open: z.boolean(),
  bounds: aiChatBoundsSchema.optional()
})
