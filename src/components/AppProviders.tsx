'use client'

import { SolanaProvider } from '@/components/solana/SolanaProvider'
import ThemeProvider from '@/components/ThemeProvider'
import React from 'react'
import { ReactQueryProvider } from './ReactQueryProvider'

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ReactQueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <SolanaProvider>
          {children}
        </SolanaProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  )
}
