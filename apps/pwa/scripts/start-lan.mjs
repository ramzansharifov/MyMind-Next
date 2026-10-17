import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:https'
import next from 'next'

const require = createRequire(import.meta.url)
const development = process.argv.includes('--dev')
const directory = fileURLToPath(new URL('..', import.meta.url))
const cert = process.env.MYMIND_HTTPS_CERT
const key = process.env.MYMIND_HTTPS_KEY
const port = Number(process.env.MYMIND_PWA_PORT || 3000)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid MYMIND_PWA_PORT')
if (Boolean(cert) !== Boolean(key))
  throw new Error('Set both MYMIND_HTTPS_CERT and MYMIND_HTTPS_KEY')
if (cert && key) {
  process.env.MYMIND_LAN_SYNC_ENABLED = '1'
  const app = next({ dev: development, dir: directory, hostname: '0.0.0.0', port, webpack: true })
  await app.prepare()
  const handle = app.getRequestHandler()
  const server = createServer(
    { cert: await readFile(cert), key: await readFile(key) },
    (request, response) => {
      request.headers['x-forwarded-proto'] = 'https'
      void handle(request, response).catch(() => {
        if (!response.headersSent) response.writeHead(500)
        response.end()
      })
    }
  )
  server.listen(port, '0.0.0.0', () =>
    console.log(`MyMind local HTTPS service: https://localhost:${port}`)
  )
  server.on('error', (error) => {
    console.error(error.message)
    process.exitCode = 1
  })
} else {
  const child = spawn(
    process.execPath,
    [
      require.resolve('next/dist/bin/next'),
      development ? 'dev' : 'start',
      ...(development ? ['--webpack'] : []),
      '--port',
      String(port)
    ],
    {
      cwd: directory,
      env: { ...process.env, MYMIND_LAN_SYNC_ENABLED: '1' },
      stdio: 'inherit',
      windowsHide: true
    }
  )
  child.on('exit', (code) => {
    process.exitCode = code ?? 1
  })
}
