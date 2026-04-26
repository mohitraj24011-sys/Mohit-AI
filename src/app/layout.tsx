import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'MohitJob AI — AI Job Search Platform for Indian IT',
  description: 'Fresher to CTO. 20+ platforms. Auto-apply. LinkedIn AI. Interview Coach. The complete AI career OS.',
  keywords: 'job search India, AI resume builder, ATS scorer, LinkedIn automation, interview prep, salary negotiation',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh' }}>
        <Nav />
        <main style={{ minHeight: 'calc(100vh - 52px)' }}>{children}</main>
      </body>
    </html>
  )
}
