import http from 'node:http'

export const crossOriginIsolationHeaders = Object.freeze({
  'cross-origin-embedder-policy': 'credentialless',
  'cross-origin-opener-policy': 'same-origin'
})

function withIsolationHeaders(headers = {}) {
  return {
    ...headers,
    ...crossOriginIsolationHeaders
  }
}

function rewriteLocation(location, targetPort, publicPort) {
  if (typeof location !== 'string') return location

  try {
    const url = new URL(location)
    const isLocalTarget =
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      Number(url.port || (url.protocol === 'https:' ? 443 : 80)) === targetPort

    if (!isLocalTarget) return location
    url.hostname = 'localhost'
    url.port = String(publicPort)
    return url.toString()
  } catch {
    return location
  }
}

function proxyHttpRequest(request, response, targetPort, publicPort) {
  const headers = {
    ...request.headers,
    'x-forwarded-host': request.headers.host ?? `localhost:${publicPort}`,
    'x-forwarded-port': String(publicPort),
    'x-forwarded-proto': 'http'
  }

  const proxyRequest = http.request(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: request.url,
      method: request.method,
      headers
    },
    (proxyResponse) => {
      const responseHeaders = withIsolationHeaders(proxyResponse.headers)
      if (responseHeaders.location) {
        responseHeaders.location = rewriteLocation(responseHeaders.location, targetPort, publicPort)
      }

      response.writeHead(
        proxyResponse.statusCode ?? 502,
        proxyResponse.statusMessage,
        responseHeaders
      )
      proxyResponse.pipe(response)
    }
  )

  proxyRequest.on('error', () => {
    if (response.headersSent) {
      response.destroy()
      return
    }

    response.writeHead(
      503,
      withIsolationHeaders({
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'retry-after': '1'
      })
    )
    response.end('Metro is starting. Reload MyMind in a moment.\n')
  })

  request.pipe(proxyRequest)
}

function proxyWebSocketUpgrade(request, clientSocket, head, targetPort) {
  const proxyRequest = http.request({
    hostname: '127.0.0.1',
    port: targetPort,
    path: request.url,
    method: request.method,
    headers: request.headers
  })

  proxyRequest.on('upgrade', (proxyResponse, proxySocket, proxyHead) => {
    const statusMessage = proxyResponse.statusMessage || 'Switching Protocols'
    clientSocket.write(
      `HTTP/${proxyResponse.httpVersion} ${proxyResponse.statusCode ?? 101} ${statusMessage}\r\n`
    )

    for (let index = 0; index < proxyResponse.rawHeaders.length; index += 2) {
      clientSocket.write(
        `${proxyResponse.rawHeaders[index]}: ${proxyResponse.rawHeaders[index + 1]}\r\n`
      )
    }
    clientSocket.write('\r\n')

    if (proxyHead.length) clientSocket.write(proxyHead)
    if (head.length) proxySocket.write(head)

    proxySocket.on('error', () => clientSocket.destroy())
    clientSocket.on('error', () => proxySocket.destroy())
    proxySocket.pipe(clientSocket)
    clientSocket.pipe(proxySocket)
  })

  proxyRequest.on('response', () => clientSocket.destroy())
  proxyRequest.on('error', () => clientSocket.destroy())
  proxyRequest.end()
}

export function createWebPreviewProxy({ targetPort, publicPort }) {
  const server = http.createServer((request, response) => {
    proxyHttpRequest(request, response, targetPort, publicPort)
  })

  server.on('upgrade', (request, socket, head) => {
    proxyWebSocketUpgrade(request, socket, head, targetPort)
  })

  return server
}
