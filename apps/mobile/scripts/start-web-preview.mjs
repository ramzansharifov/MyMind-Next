import { spawn } from 'node:child_process'
import http from 'node:http'
import net from 'node:net'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const appDirectory = fileURLToPath(new URL('..', import.meta.url))
const publicPort = Number(process.env.MYMIND_WEB_PORT ?? 8081)
const metroPort = Number(process.env.MYMIND_METRO_PORT ?? 8082)
const host = '127.0.0.1'

if (!Number.isInteger(publicPort) || !Number.isInteger(metroPort) || publicPort === metroPort) {
  throw new Error('MYMIND_WEB_PORT and MYMIND_METRO_PORT must be different integer ports')
}

const isolationHeaders = {
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin'
}

const server = http.createServer((request, response) => {
  const headers = { ...request.headers, host: `${host}:${metroPort}` }
  const upstreamRequest = http.request(
    {
      hostname: host,
      port: metroPort,
      method: request.method,
      path: request.url,
      headers
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, {
        ...upstreamResponse.headers,
        ...isolationHeaders
      })
      upstreamResponse.pipe(response)
    }
  )

  upstreamRequest.on('error', () => {
    if (!response.headersSent) response.writeHead(503, isolationHeaders)
    response.end('MyMind Metro is starting. Reload in a moment.')
  })
  request.pipe(upstreamRequest)
})

server.on('upgrade', (request, socket, head) => {
  const upstream = net.connect(metroPort, host, () => {
    let requestHead = `${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`
    for (let index = 0; index < request.rawHeaders.length; index += 2) {
      const name = request.rawHeaders[index]
      const value =
        name.toLowerCase() === 'host' ? `${host}:${metroPort}` : request.rawHeaders[index + 1]
      requestHead += `${name}: ${value}\r\n`
    }
    upstream.write(`${requestHead}\r\n`)
    if (head.length) upstream.write(head)
    socket.pipe(upstream).pipe(socket)
  })

  upstream.on('error', () => socket.destroy())
})

const expoCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const expo = spawn(
  expoCommand,
  ['expo', 'start', '--web', '--port', String(metroPort), ...process.argv.slice(2)],
  {
    cwd: appDirectory,
    env: { ...process.env, BROWSER: 'none' },
    stdio: 'inherit'
  }
)

let shuttingDown = false
function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  if (!expo.killed) expo.kill(signal)
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
expo.on('exit', (code) => {
  if (shuttingDown) return
  server.close(() => process.exit(code ?? 0))
})

server.listen(publicPort, host, () => {
  console.log(`\nMyMind web preview: http://localhost:${publicPort}`)
  console.log(`Expo Metro upstream: http://localhost:${metroPort}`)
  console.log('The preview proxy adds the cross-origin isolation required by expo-sqlite Web.\n')
})
