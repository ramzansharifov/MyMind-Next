import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  resolve: {
    alias: {
      'better-sqlite3': fileURLToPath(new URL('./src/test/sqlite-driver.ts', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: [
      'apps/pwa/src/**/*.test.ts',
      'packages/persistence/src/*.test.ts',
      'packages/core/src/**/*.test.ts'
    ]
  }
})
