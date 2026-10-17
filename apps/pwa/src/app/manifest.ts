import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'MyMind',
    short_name: 'MyMind',
    lang: 'ru',
    description: 'Локальное пространство для заметок, задач и личных данных',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#13111c',
    theme_color: '#13111c',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }
}
