import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './Providers'

export const metadata: Metadata = {
  title: 'llm-wiki — LaTeX Research Agent',
  description: 'Research arXiv, generate LaTeX surveys, build your knowledge graph',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
