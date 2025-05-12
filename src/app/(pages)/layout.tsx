import Navbar from '@/components/layouts/Navbar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ReactNode } from 'react'

interface PagesLayoutProps {
  children: ReactNode
}

export default async function PagesLayout({ children }: PagesLayoutProps) {
  return (
    <div className="min-h-screen bg-background w-full">
      <Navbar />
      <main className="relative">
        <ThemeToggle position="fixed" />
        {children}
      </main>
    </div>
  )
}
