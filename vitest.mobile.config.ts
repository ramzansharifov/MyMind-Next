import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/mobile/**/*.test.ts'],
    // better-sqlite3 is a native addon; isolated processes avoid intermittent worker-thread exits.
    pool: 'forks',
    maxWorkers: 1,
    restoreMocks: true
  }
})
