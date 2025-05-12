/* eslint-disable */

import { Campaign } from '@/types/types'
import { createRpc } from '@lightprotocol/stateless.js'
import { Metaplex } from '@metaplex-foundation/js'
import { MPL_BUBBLEGUM_PROGRAM_ID } from '@metaplex-foundation/mpl-bubblegum'
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'

const RPC_ENDPOINT = 'https://devnet.helius-rpc.com/?api-key=9f52f156-8987-4d04-953f-54db6be65ec2'

interface Metadata {
  name: string
  description?: string
  symbol: string
  uri: string
  sellerFeeBasisPoints: number
  creators: { address: string; verified: boolean; share: number }[]
  isMutable: boolean
  collection?: { key: PublicKey; verified: boolean }
  properties: {
    files: { type: string; uri: string }[]
  }
}

export const handleMintCPOPs = async (
  id: string,
  qrSessionNonce: string,
  maxClaims: number,
  publicKey: PublicKey | null,
  signTransaction: (<T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>) | undefined,
  campaign: Campaign,
) => {
  if (!id || !qrSessionNonce || !maxClaims) return null

  if (!publicKey) {
    return null
  }

  console.log('Minting with wallet:', publicKey.toBase58())

  try {
    const COMPRESSION_ENDPOINT = RPC_ENDPOINT
    const PROVER_ENDPOINT = RPC_ENDPOINT
    const connection = createRpc(RPC_ENDPOINT, COMPRESSION_ENDPOINT, PROVER_ENDPOINT, { commitment: 'confirmed' })

    const metaplex = new Metaplex(connection)

    // 1. Create a CollectionNFT
    await createCollectionNFT(metaplex, campaign)

    // 2. Create a Merkle Tree

    // 3. Prepare Leaf Data for Minting

    // 4. Call mintToCollectionV1 for Each NFT

    // 5. Sign and Send Transactions
  } catch (error) {
    console.error('Error in handleMintCPOPs:', error)
    if (error instanceof Error) {
      return null
    }
  }
}

const createCollectionNFT = async (metaplex: Metaplex, campaign: Campaign) => {
  const { nft } = await metaplex.nfts().create({
    name: campaign.name,
    symbol: campaign.tokenSymbol,
    uri: campaign.metadataUri,
    sellerFeeBasisPoints: 0,
    isCollection: true,
  })

  console.log('✅ Collection NFT Minted:', nft.address.toBase58())
  return nft
}

const MAX_DEPTH = 14
const MAX_BUFFER_SIZE = 64

export async function createMerkleTree(connection: Connection, payer: Keypair) {
  const BUBBLEGUM_PROGRAM_ID = new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID)

  const treeKeypair = Keypair.generate()
  const treeAuthority = PublicKey.findProgramAddressSync([treeKeypair.publicKey.toBuffer()], BUBBLEGUM_PROGRAM_ID)[0]
}
