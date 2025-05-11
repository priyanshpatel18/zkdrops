'use client'

import ThemeProvider from '@/components/ThemeProvider'
import { ReactQueryProvider } from './ReactQueryProvider'
import { SolanaProvider } from '@/components/solana/SolanaProvider'
import React from 'react'

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ReactQueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <SolanaProvider>{children}</SolanaProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  )
}
