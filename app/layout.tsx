import type { Metadata, Viewport } from 'next'
import './globals.css'
import './editor.css'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const viewport: Viewport = {
  themeColor: '#08060e',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'TFT Grimoire — The Arcane Source for TFT Comps & Strategy',
  description: 'Master Teamfight Tactics with curated tier lists, meta shift tracking, smart recommendations, and in-depth strategy guides. Your magical grimoire for climbing.',
  keywords: 'TFT, Teamfight Tactics, tier list, comps, meta, strategy, guides, grimoire',
  openGraph: {
    title: 'TFT Grimoire — The Arcane Source for TFT Comps & Strategy',
    description: 'Master Teamfight Tactics with curated tier lists, meta shift tracking, smart recommendations, and in-depth strategy guides.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }} suppressHydrationWarning>
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
