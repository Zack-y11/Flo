import type { Metadata } from 'next'
import { Lexend } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

export const metadata: Metadata = {
  title: 'Flo para la finca',
  description: 'Calendario de temporada para la finca.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={lexend.variable}>
      <body>{children}</body>
    </html>
  )
}
