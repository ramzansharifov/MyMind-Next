const { getDefaultConfig } = require('expo/metro-config')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// expo-sqlite uses a WebAssembly worker on web. Metro must treat .wasm as an asset.
if (!config.resolver.assetExts.includes('wasm')) config.resolver.assetExts.push('wasm')

// SharedArrayBuffer is required by expo-sqlite's web worker.
// Match Expo's documented setup exactly so the HTML response itself is cross-origin isolated.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless')
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    middleware(req, res, next)
  }
}

module.exports = config
