'use client'

import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { CoinbaseWalletAdapter } from '@solana/wallet-adapter-coinbase'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import '@wallet-ui/tailwind/index.css'
import dynamic from 'next/dynamic'
import { ReactNode, useMemo } from 'react'

export const WalletButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, {
  ssr: false,
})

export function SolanaProvider({ children }: { children: ReactNode }) {
  // const network =
  //   process.env.NEXT_PUBLIC_NODE_ENV === "development"
  //     ? WalletAdapterNetwork.Devnet
  //     : WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl('devnet'), [])

  const wallets = useMemo(() => {
    return [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new CoinbaseWalletAdapter()]
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
