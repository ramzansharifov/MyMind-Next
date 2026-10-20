import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MyMind',
  description: 'Личное пространство. Данные хранятся на вашем устройстве.',
  applicationName: 'MyMind',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MyMind' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' }
}
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#13111c'
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
