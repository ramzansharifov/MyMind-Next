import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/renderer/src/test/setup.ts'],
    include: ['src/renderer/src/**/*.test.{ts,tsx}', 'src/main/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'out/**', 'coverage/**', '.filetags/**'],
    pool: 'threads',
    isolate: true,
    fileParallelism: false,
    maxWorkers: 1,
    clearMocks: true,
    restoreMocks: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        'src/main/security/content-security-policy.ts': {
          statements: 60,
          branches: 75,
          functions: 55,
          lines: 60
        },
        'src/main/security/permissions.ts': {
          statements: 30,
          branches: 90,
          functions: 20,
          lines: 30
        },
        'src/main/security/single-instance.ts': {
          statements: 80,
          branches: 70,
          functions: 95,
          lines: 80
        },
        'src/main/services/study-material-coordinator.ts': {
          statements: 90,
          branches: 95,
          functions: 80,
          lines: 95
        },
        'src/shared/study-assets.ts': {
          statements: 75,
          branches: 85,
          functions: 95,
          lines: 75
        },
        'src/shared/validation/study.ts': {
          statements: 95,
          branches: 55,
          functions: 95,
          lines: 95
        },
        'src/renderer/src/modules/study/lib/study-autosave-queue.ts': {
          statements: 90,
          branches: 55,
          functions: 95,
          lines: 95
        },
        'src/main/domain/study-document-index.ts': {
          statements: 65,
          branches: 30,
          functions: 55,
          lines: 60
        }
      }
    }
  }
})
