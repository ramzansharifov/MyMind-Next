import { access } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

const previewUrl = process.env.MYMIND_WEB_PREVIEW_URL || 'http://localhost:8081/'

async function firstExistingPath(candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      await access(candidate)
      return candidate
    } catch {
    }
  }
  return null
}

function windowsBrowserCandidates() {
  const programFiles = process.env.ProgramFiles
  const programFilesX86 = process.env['ProgramFiles(x86)']
  return [
    programFiles && path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    programFiles && path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    programFilesX86 && path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe')
  ]
}

const executablePath = await firstExistingPath(windowsBrowserCandidates())
if (!executablePath) throw new Error('No supported Chromium browser found on the Windows runner.')

const runtimeMessages = []
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu']
})

try {
  const context = await browser.newContext()
  const page = await context.newPage()

  page.on('console', (message) => {
    runtimeMessages.push(`[console:${message.type()}] ${message.text()}`)
  })
  page.on('pageerror', (error) => {
    runtimeMessages.push(`[pageerror] ${error?.stack || error?.message || String(error)}`)
  })
  page.on('requestfailed', (request) => {
    runtimeMessages.push(
      `[requestfailed] ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`
    )
  })

  const response = await page.goto(previewUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000
  })
  if (!response || !response.ok()) {
    throw new Error(`Preview navigation failed with HTTP ${response?.status() ?? 'no response'}.`)
  }

  await page.getByText('Главная', { exact: true }).first().waitFor({ timeout: 120_000 })
  await page.getByText('Заметки', { exact: true }).first().waitFor({ timeout: 120_000 })
  await page.getByText('Задачи', { exact: true }).first().waitFor({ timeout: 120_000 })
  await page.waitForTimeout(3_000)

  const bodyText = await page.locator('body').innerText()
  console.log('[MyMind] Browser runtime smoke rendered the mobile Home shell.')
  console.log(bodyText.slice(0, 4_000))

  const combined = `${bodyText}\n${runtimeMessages.join('\n')}`
  const forbidden = [
    'SharedArrayBuffer is not defined',
    'Sync operation timeout',
    "Expected ',' or ']' after array element in JSON",
    'validatePath is not a function',
    'Failed to reconcile workout progress photos',
    'Failed to reconcile mobile document assets',
    'expo-file-system is not supported on web'
  ]

  for (const needle of forbidden) {
    if (combined.includes(needle)) {
      throw new Error(`Known Web runtime failure is still present: ${needle}`)
    }
  }

  const pageErrors = runtimeMessages.filter((message) => message.startsWith('[pageerror]'))
  if (pageErrors.length > 0) {
    throw new Error(`Unhandled browser page error:\n${pageErrors.join('\n')}`)
  }

  console.log('[MyMind] Browser runtime smoke passed.')
  for (const message of runtimeMessages) console.log(message)
} catch (error) {
  console.error('[MyMind] Browser runtime smoke failed.')
  for (const message of runtimeMessages) console.error(message)
  throw error
} finally {
  await browser.close()
}
