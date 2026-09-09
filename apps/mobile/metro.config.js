const { getDefaultConfig } = require('expo/metro-config')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// expo-sqlite uses a WebAssembly worker on web. Metro must treat .wasm as an asset.
if (!config.resolver.assetExts.includes('wasm')) config.resolver.assetExts.push('wasm')

// SharedArrayBuffer is required by expo-sqlite's web worker.
const enhanceMiddleware = config.server.enhanceMiddleware
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const enhanced = enhanceMiddleware ? enhanceMiddleware(middleware, metroServer) : middleware
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless')
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    enhanced(req, res, next)
  }
}

module.exports = config
