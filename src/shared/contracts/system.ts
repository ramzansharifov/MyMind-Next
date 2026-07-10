import { z } from 'zod'

export const IPC_CHANNELS = {
  systemHealth: 'system:health'
} as const

export const systemHealthSchema = z.object({
  database: z.literal('ready'),
  sqliteVersion: z.string()
})

export type SystemHealth = z.infer<typeof systemHealthSchema>

export interface MyMindApi {
  system: {
    getHealth(): Promise<SystemHealth>
  }
}
