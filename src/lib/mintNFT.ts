/* eslint-disable */

import { Campaign } from '@/types/types'
import { createRpc, Rpc, selectStateTreeInfo } from '@lightprotocol/stateless.js'
import { Metaplex } from '@metaplex-foundation/js'
import { MPL_BUBBLEGUM_PROGRAM_ID } from '@metaplex-foundation/mpl-bubblegum'
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js'
const {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  createAllocTreeIx,
} = require('@solana/spl-account-compression')

const RPC_ENDPOINT = `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIOUS_API_KEY}`

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

  if (!publicKey || !signTransaction) {
    console.error('Wallet not connected or signTransaction not available')
    return null
  }

  console.log('Minting with wallet:', publicKey.toBase58())

  try {
    const COMPRESSION_ENDPOINT = RPC_ENDPOINT
    const PROVER_ENDPOINT = RPC_ENDPOINT
    const connection = createRpc(RPC_ENDPOINT, COMPRESSION_ENDPOINT, PROVER_ENDPOINT, { commitment: 'confirmed' })

    const metaplex = new Metaplex(connection)

    // 1. Create a CollectionNFT
    const collectionNFT = await createCollectionNFT(metaplex, campaign)
    console.log('Collection NFT created:', collectionNFT.address.toBase58())

    // 2. Create a Merkle Tree
    const { treeKeypair, treeAuthority, canopyDepth } = await createMerkleTree(connection, publicKey, signTransaction)
    console.log('Merkle tree created:', treeKeypair.publicKey.toBase58())
    console.log('Tree authority:', treeAuthority.toBase58())

    // 3. Prepare NFT metadata for each claim
    const nftsToMint = prepareNFTMetadata(campaign, maxClaims, collectionNFT.address)

    // 4. Mint compressed NFTs to the collection
    const mintResults = await mintCompressedNFTs(
      connection,
      publicKey,
      signTransaction,
      treeKeypair.publicKey,
      treeAuthority,
      collectionNFT.address,
      nftsToMint,
    )

    return {
      collectionAddress: collectionNFT.address.toBase58(),
      treeAddress: treeKeypair.publicKey.toBase58(),
      mintResults,
    }
  } catch (error) {
    console.error('Error in handleMintCPOPs:', error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: 'Unknown error occurred' }
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

const MAX_DEPTH = 14 // Maximum depth of the merkle tree
const MAX_BUFFER_SIZE = 64 // Maximum buffer size for the merkle tree
const CANOPY_DEPTH = 10 // Canopy depth for faster verification

export async function createMerkleTree(
  connection: Rpc,
  payer: PublicKey,
  signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>,
) {
  const BUBBLEGUM_PROGRAM_ID = new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID)

  // Generate a new keypair for the tree
  const treeKeypair = Keypair.generate()

  // Calculate the tree authority PDA
  const [treeAuthority] = PublicKey.findProgramAddressSync([treeKeypair.publicKey.toBuffer()], BUBBLEGUM_PROGRAM_ID)

  // Calculate space needed and minimum balance for rent exemption
  const space = 8 + 32 + 32 + 4
  const lamports = await connection.getMinimumBalanceForRentExemption(space)

  // Create a new transaction
  const transaction = new Transaction()

  // Add system create account instruction
  const treeInfos = await connection.getStateTreeInfos()
  const treeInfo = selectStateTreeInfo(treeInfos)

  // Add allocate tree instruction
  transaction.add(createAllocTreeIx(treeKeypair.publicKey, payer, MAX_DEPTH, MAX_BUFFER_SIZE, payer))

  // Sign the transaction with the tree keypair and the payer
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  transaction.feePayer = payer
  transaction.partialSign(treeKeypair)

  const signedTx = await signTransaction(transaction)

  // Send the transaction
  const txSignature = await connection.sendRawTransaction(signedTx.serialize())
  await connection.confirmTransaction(txSignature, 'confirmed')

  console.log(`Merkle tree created: ${treeKeypair.publicKey.toBase58()}`)
  console.log(`Transaction signature: ${txSignature}`)

  return { treeKeypair, treeAuthority, canopyDepth: CANOPY_DEPTH }
}

function prepareNFTMetadata(campaign: Campaign, maxClaims: number, collectionAddress: PublicKey): Metadata[] {
  const nfts: Metadata[] = []

  for (let i = 0; i < maxClaims; i++) {
    nfts.push({
      name: `${campaign.name} #${i + 1}`,
      symbol: campaign.tokenSymbol,
      uri: campaign.metadataUri,
      sellerFeeBasisPoints: 0,
      creators: [
        {
          address: campaign.organizer?.wallet || '',
          verified: true,
          share: 100,
        },
      ],
      isMutable: true,
      collection: {
        key: collectionAddress,
        verified: true,
      },
      properties: {
        files: [
          {
            type: 'image/png',
            uri: campaign.tokenUri,
          },
        ],
      },
    })
  }

  return nfts
}

async function mintCompressedNFTs(
  connection: Connection,
  payer: PublicKey,
  signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>,
  merkleTree: PublicKey,
  treeAuthority: PublicKey,
  collectionMint: PublicKey,
  metadataList: Metadata[],
): Promise<string[]> {
  const txSignatures: string[] = []

  // Get the collection metadata and master edition addresses
  const [collectionMetadata] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
      collectionMint.toBuffer(),
    ],
    new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
  )

  const [collectionMasterEdition] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
      collectionMint.toBuffer(),
      Buffer.from('edition'),
    ],
    new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
  )

  const bubblegumProgramId = new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID)
  const compressionProgramId = new PublicKey(SPL_ACCOUNT_COMPRESSION_PROGRAM_ID)
  // const tokenMetadataProgramId = new PublicKey();
  const systemProgramId = new PublicKey('11111111111111111111111111111111')
  const rentSysvarId = new PublicKey('SysvarRent111111111111111111111111111111111')

  // Mint each NFT one at a time (you could batch these for efficiency)
  for (const metadata of metadataList) {
    const mintInstruction = new TransactionInstruction({
      programId: bubblegumProgramId,
      keys: [
        { pubkey: treeAuthority, isSigner: true, isWritable: false },
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: payer, isSigner: false, isWritable: false }, // leafOwner
        { pubkey: payer, isSigner: false, isWritable: false }, // leafDelegate
        { pubkey: merkleTree, isSigner: false, isWritable: true },
        { pubkey: treeAuthority, isSigner: false, isWritable: false }, // treeDelegate
        { pubkey: collectionMint, isSigner: false, isWritable: false },
        { pubkey: collectionMetadata, isSigner: false, isWritable: false },
        { pubkey: collectionMasterEdition, isSigner: false, isWritable: false },
        { pubkey: compressionProgramId, isSigner: false, isWritable: false },
        // { pubkey: tokenMetadataProgramId, isSigner: false, isWritable: false },
        { pubkey: bubblegumProgramId, isSigner: false, isWritable: false },
        { pubkey: systemProgramId, isSigner: false, isWritable: false },
        { pubkey: rentSysvarId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([
        ...Buffer.from('mint_compressed_nft').subarray(0, 8), // Instruction discriminator
        ...Buffer.from([0]), // No extra args for now
        ...Buffer.from(
          JSON.stringify({
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
            creators: metadata.creators.map((creator) => ({
              address: creator.address,
              verified: creator.verified,
              share: creator.share,
            })),
          }),
        ),
      ]),
    })

    const transaction = new Transaction()

    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    transaction.feePayer = payer

    const signedTx = await signTransaction(transaction)
    const txSignature = await connection.sendRawTransaction(signedTx.serialize())
    await connection.confirmTransaction(txSignature, 'confirmed')

    console.log(`Minted compressed NFT with signature: ${txSignature}`)
    txSignatures.push(txSignature)
  }

  return txSignatures
}

const BUBBLEGUM_PROGRAM_ID = new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID)
