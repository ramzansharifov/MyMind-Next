import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  images: { disableStaticImages: true },
  transpilePackages: [
    '@mymind/contracts',
    '@mymind/core',
    '@mymind/design',
    '@mymind/persistence',
    'react-native-web',
    'react-native-svg',
    'react-native-safe-area-context',
    'lucide-react-native'
  ],
  outputFileTracingRoot: path.resolve(directory, '../..'),
  webpack(config, { webpack }) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native$': path.resolve(directory, 'src/platform/react-native.js')
    }
    config.resolve.extensions = ['.web.tsx', '.web.ts', '.web.js', ...config.resolve.extensions]
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, crypto: false }
    config.module.rules.push({ test: /\.(webp|png|jpe?g|gif|woff2?)$/i, type: 'asset/resource' })
    config.plugins.push(new webpack.DefinePlugin({ 'import.meta.env.DEV': JSON.stringify(false) }))
    return config
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ]
      }
    ]
  }
}
