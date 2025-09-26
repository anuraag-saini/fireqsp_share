// app/layout.tsx - No Auth Version
import './globals-simple.css'

export const metadata = {
  title: 'SaaS Starter - Modern SaaS Application',
  description: 'A complete SaaS starter with authentication, payments, and database',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
