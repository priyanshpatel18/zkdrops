'use client'

import { createSolanaDevnet, createSolanaLocalnet, createWalletUiConfig, WalletUi } from '@wallet-ui/react'
import '@wallet-ui/tailwind/index.css'
import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

export const WalletButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, {
  ssr: false,
})
export const ClusterButton = dynamic(async () => (await import('@wallet-ui/react')).WalletUiClusterDropdown, {
  ssr: false,
})

const config = createWalletUiConfig({
  clusters: [createSolanaDevnet(), createSolanaLocalnet()],
})

export function SolanaProvider({ children }: { children: ReactNode }) {
  return <WalletUi config={config}>{children}</WalletUi>
}
