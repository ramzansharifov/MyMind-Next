import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const testAudio = {
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
}
export default defineConfig({
  testDir: './e2e',
  outputDir: '../../.data/pwa-browser-results',
  timeout: 60_000,
  workers: 1,
  projects: [
    { name: 'desktop', use: { channel: 'chrome', launchOptions: testAudio } },
    {
      name: 'phone',
      use: {
        channel: 'chrome',
        launchOptions: testAudio,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      }
    },
    {
      name: 'webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      }
    }
  ],
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    baseURL: 'http://localhost:3003',
    viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node node_modules/next/dist/bin/next start apps/pwa --port 3003',
    cwd: root,
    url: 'http://localhost:3003',
    timeout: 60_000,
    reuseExistingServer: false,
    env: { NEXT_TELEMETRY_DISABLED: '1' }
  }
})
