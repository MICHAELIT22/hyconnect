import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HyConnect - RH Manager',
  description: 'Système de gestion des ressources humaines - Hyundai CO-TO AUTO',
  icons: { icon: '/logo.png' },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HyConnect',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#1A56DB" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
