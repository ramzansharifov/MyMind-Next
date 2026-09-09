import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { createWebPreviewProxy } from './web-preview-proxy.mjs'

async function listen(server) {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected TCP server address')
  return address.port
}

async function close(server) {
  server.close()
  await once(server, 'close')
}

const backend = http.createServer((request, response) => {
  if (request.url === '/redirect') {
    response.writeHead(302, { location: `http://localhost:${backend.address().port}/target` })
    response.end()
    return
  }

  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  response.end('<!doctype html><title>MyMind test</title>')
})

const targetPort = await listen(backend)
const proxy = createWebPreviewProxy({ targetPort, publicPort: 8081 })
const publicPort = await listen(proxy)

try {
  const response = await fetch(`http://127.0.0.1:${publicPort}/`)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cross-origin-embedder-policy'), 'credentialless')
  assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin')
  assert.match(await response.text(), /MyMind test/)

  const redirect = await fetch(`http://127.0.0.1:${publicPort}/redirect`, {
    redirect: 'manual'
  })
  assert.equal(redirect.status, 302)
  assert.equal(redirect.headers.get('location'), 'http://localhost:8081/target')

  console.log('Web preview proxy headers and redirects are correct.')
} finally {
  await close(proxy)
  await close(backend)
}
