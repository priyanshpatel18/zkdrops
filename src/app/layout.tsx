import { AppProviders } from '@/components/AppProviders'
import { Toaster } from '@/components/ui/sonner'
import { siteConfig } from '@/config/siteConfig'
import '@solana/wallet-adapter-react-ui/styles.css'
import { Ubuntu_Sans } from "next/font/google"
import React from 'react'
import './globals.css'

export const metadata = siteConfig

const ubuntu = Ubuntu_Sans({ weight: ["400", "500", "700"], subsets: ["latin"] })

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased ${ubuntu.className}`} suppressHydrationWarning>
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
