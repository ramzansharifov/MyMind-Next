import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWebPreviewProxy } from './web-preview-proxy.mjs'

function parsePort(value, fallback, name) {
  if (value == null || value === '') return fallback
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`)
  }
  return port
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const appDirectory = path.resolve(scriptDirectory, '..')
const publicPort = parsePort(process.env.MYMIND_WEB_PORT, 8081, 'MYMIND_WEB_PORT')
const metroPort = parsePort(process.env.MYMIND_WEB_METRO_PORT, 8082, 'MYMIND_WEB_METRO_PORT')

if (publicPort === metroPort) {
  throw new Error('MYMIND_WEB_PORT and MYMIND_WEB_METRO_PORT must be different')
}

const server = createWebPreviewProxy({ targetPort: metroPort, publicPort })
let metroProcess
let shuttingDown = false

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true

  server.close()
  if (metroProcess && !metroProcess.killed) metroProcess.kill('SIGTERM')

  const timer = setTimeout(() => process.exit(exitCode), 750)
  timer.unref()
}

server.on('error', (error) => {
  console.error(`[MyMind] Web preview proxy failed: ${error.message}`)
  shutdown(1)
})

server.listen(publicPort, '127.0.0.1', () => {
  console.log(`\n[MyMind] SQLite-safe web preview: http://localhost:${publicPort}`)
  console.log(`[MyMind] Expo Metro backend: http://127.0.0.1:${metroPort}`)
  console.log('[MyMind] Open only the SQLite-safe URL above while testing web.\n')

  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const extraExpoArguments = process.argv.slice(2)

  metroProcess = spawn(
    npxCommand,
    ['expo', 'start', '--web', '--port', String(metroPort), ...extraExpoArguments],
    {
      cwd: appDirectory,
      stdio: 'inherit',
      env: {
        ...process.env,
        BROWSER: 'none',
        EXPO_PACKAGER_PROXY_URL: `http://localhost:${publicPort}`
      }
    }
  )

  metroProcess.on('error', (error) => {
    console.error(`[MyMind] Failed to start Expo: ${error.message}`)
    shutdown(1)
  })

  metroProcess.on('exit', (code, signal) => {
    if (shuttingDown) return
    const exitCode = code ?? (signal ? 1 : 0)
    console.log(`[MyMind] Expo stopped${signal ? ` (${signal})` : ''}.`)
    shutdown(exitCode)
  })
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
