import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/shared/Navbar'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'LUSU Lens',
  description: 'Business intelligence for LUSU venues',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-app-bg text-gray-900`}>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
