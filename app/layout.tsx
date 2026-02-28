import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bilingual Video Trainer',
  description: 'Upload videos and practice with sentence-by-sentence playback',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
