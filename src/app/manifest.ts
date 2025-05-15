import type { MetadataRoute } from 'next'

const { appName, description } = {
  appName: 'zkdrops – Compressed Proof of Participation on Solana',
  description:
    'zkdrops is a zk-compressed Proof-of-Participation interface built on Solana. Let creators mint experience tokens, attendees claim them via QR, and all actions remain scalable, verifiable, and private.',
}

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appName,
    short_name: appName,
    description: description,
    start_url: '/',
    display: 'standalone',
    background_color: '#fff',
    theme_color: '#fff',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
