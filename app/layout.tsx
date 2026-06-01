import type { Metadata, Viewport } from 'next'
import { Tajawal } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const tajawal = Tajawal({ 
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
})

export const metadata: Metadata = {
  title: 'Madeira Sands | شاليه فاخر',
  description: 'شاليه Madeira Sands - ملاذ صيفي فاخر في بريدة، القصيم. مسبح خاص، مجلس خارجي، وأجواء استجمام استثنائية.',
  keywords: ['شاليه', 'بريدة', 'القصيم', 'مسبح', 'إيجار', 'عطلة', 'Madeira Sands'],
  openGraph: {
    title: 'Madeira Sands | شاليه فاخر',
    description: 'ملاذ صيفي فاخر … أجواء استجمام استثنائية',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#57534e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className="bg-white">
      <body className={`${tajawal.variable} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
