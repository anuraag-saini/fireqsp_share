import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { Navigation } from '@/components/Navigation'
import { enGB } from '@clerk/localizations' // or deDE etc.
// import { SpeedInsights } from "@vercel/speed-insights/next"
// import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'FireQSP - Quantitative Systems Pharmacology',
  description: 'AI-powered QSP modeling platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Navigation />
          {children}
          {/* <SpeedInsights />
          <Analytics /> */}
        </body>
      </html>
    </ClerkProvider>
  )
}