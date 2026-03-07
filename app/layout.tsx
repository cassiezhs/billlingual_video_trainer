import type { Metadata } from 'next'
import Link from 'next/link'
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
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-bold text-white">
                B
              </span>
              <span className="text-lg font-semibold tracking-tight text-slate-900">
                Bilingual Video Trainer
              </span>
            </Link>

            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <Link href="#" className="hover:text-slate-900">
                About
              </Link>
              <Link href="#" className="rounded-full bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700">
                Try it out
              </Link>
            </nav>
          </div>
        </header>

        <main className="min-h-[calc(100vh-80px)]">{children}</main>

        <footer className="border-t border-white/10 bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between">
            <p>
              Built with Next.js, Tailwind CSS, Prisma, and Python video processing.
            </p>
            <p>© {new Date().getFullYear()} Bilingual Video Trainer</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
