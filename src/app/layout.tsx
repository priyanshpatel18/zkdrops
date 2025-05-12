import { AppProviders } from '@/components/AppProviders'
import { siteConfig } from '@/config/siteConfig'
import React from 'react'
import './globals.css'
import '@solana/wallet-adapter-react-ui/styles.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = siteConfig

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased`} suppressHydrationWarning>
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  )
}

// Patch BigInt so we can log it using JSON.stringify without any errors
declare global {
  interface BigInt {
    toJSON(): string
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString()
}
