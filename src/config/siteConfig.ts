import { Metadata } from 'next'

const { title, description, ogImage, baseURL } = {
  title: 'zkdrops – Compressed Proof of Participation on Solana',
  description:
    'zkdrops is a zk-compressed Proof-of-Participation protocol built on Solana. Let creators mint experience tokens, attendees claim them via QR, and all actions remain scalable, verifiable, and private.',
  baseURL: 'https://zkdrops.xyz',
  ogImage: 'https://zkdrops.xyz/open-graph.png',
}

export const siteConfig: Metadata = {
  title,
  description,
  metadataBase: new URL(baseURL),
  openGraph: {
    title,
    description,
    images: [ogImage],
    url: baseURL,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [ogImage],
  },
  icons: {
    icon: '/favicon.ico',
  },
  applicationName: 'cPOP',
  alternates: {
    canonical: baseURL,
  },
  keywords: [
    'cPOP',
    'Proof of Participation',
    'ZK Compression',
    'Solana',
    'Light Protocol',
    'Helius',
    'Solana Foundation',
    'ZK Airdrops',
    'QR Claim',
    'Compressed Tokens',
    'Solana Hackathon',
    'Zero-Knowledge Proofs',
    'Scalable Airdrops',
    'Privacy-Preserving Rewards',
  ],
}
