import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MyMind',
  description: 'Личное пространство. Данные хранятся на вашем устройстве.',
  applicationName: 'MyMind',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MyMind' },
  icons: { icon: '/icons/icon-192-v5.png', apple: '/icons/apple-touch-icon-v5.png' }
}
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0b0d'
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
