'use client'

import ThemeProvider from '@/components/ThemeProvider'
import { ReactQueryProvider } from './ReactQueryProvider'
import { SolanaProvider } from '@/components/solana/SolanaProvider'
import React, { useMemo } from 'react'
import { WalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom"
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  const wallets = useMemo(() => {
    return [new PhantomWalletAdapter()];
  }, []);

  return (
    <ReactQueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <SolanaProvider>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              {children}
            </WalletModalProvider>
          </WalletProvider>
        </SolanaProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  )
}
