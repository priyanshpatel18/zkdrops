"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { bn } from '@lightprotocol/stateless.js'
import { Campaign, Claim, QRSession, Vault } from '@prisma/client'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { saveAs } from 'file-saver'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Copy, Download, Loader2, Share2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface CampaignState extends Campaign {
  organizer: {
    wallet: string
  }
}

interface QRSessionState extends QRSession {
  campaign: CampaignState
  claims: Claim[]
  vault: Vault[]
}

const RPC_ENDPOINT = `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;

export default function QRSessionPage() {
  const router = useRouter()
  const [maxClaims, setMaxClaims] = useState<string>('')
  const [qrSessionUrl, setQrSessionUrl] = useState('')
  const { connected, publicKey, signTransaction } = useWallet();
  const [isCopied, setIsCopied] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const { sessionId } = useParams()
  const [qrSession, setQrSession] = useState<QRSessionState | null>(null)
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mintType, setMintType] = useState<"compressed" | "standard">('standard');

  const fetchQRSession = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    try {
      setIsLoading(true)
      const res = await fetch(`/api/qr-session/${sessionId}`)
      const data = await res.json()
      const fetchedQrSession: QRSessionState = data.qrSession

      setQrSession(fetchedQrSession)

      if (fetchedQrSession) {
        setQrSessionUrl(`${window.location.origin}/claim/${fetchedQrSession.nonce}`)
        setMaxClaims(fetchedQrSession.maxClaims.toString())
      }

    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
      setIsMinting(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchQRSession()
  }, [fetchQRSession])

  useEffect(() => {
    if (connected && publicKey && qrSession?.campaign && qrSession.campaign.organizer) {
      const isOrganizer = publicKey.toBase58().toLowerCase() === qrSession.campaign.organizer.wallet.toLowerCase()
      setIsOwner(isOrganizer)
    }
  }, [connected, publicKey, qrSession])

  const handleMint = async (mintType: "compressed" | "standard") => {
    if (!sessionId || !maxClaims || !qrSession?.campaign) return

    if (!publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    setIsMinting(true)
    try {
      let response;
      if (mintType === "standard") {
        response = await fetch(`/api/campaign/${qrSession.campaign.id}/qr-session/${sessionId}/mint-standard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey: publicKey.toBase58() }),
        })
      } else {
        response = await fetch(`/api/qr-session/${sessionId}/mint-compressed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey: publicKey.toBase58() }),
        })
      }
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error)
        return;
      }

      const { amount, vaultPublicKey } = data;

      await promptTransfer(amount, vaultPublicKey);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setIsMinting(false)
    }
  }

  const promptTransfer = async (lamports: number, vaultPublicKey: string) => {
    if (!publicKey || !signTransaction || !qrSession) {
      toast.error('Please connect your wallet')
      return;
    }

    const connection = new Connection(RPC_ENDPOINT);
    const vault = new PublicKey(vaultPublicKey);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: vault,
        lamports,
      })
    );
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.feePayer = publicKey;
    transaction.recentBlockhash = blockhash;

    const signature = await signTransaction(transaction);

    const txSignature = await connection.sendRawTransaction(signature.serialize())
    const result = await connection.confirmTransaction(txSignature, 'confirmed')

    if (result.value.err) {
      toast.error('Transaction failed')
    } else {
      const connection = new Connection(RPC_ENDPOINT);
      const balance = await connection.getBalance(new PublicKey(qrSession?.vault[0].publicKey));
      if (balance <= Number(qrSession?.vault[0].costInSol) * 10 ** 9) {
        toast.error('Transaction failed')
        return;
      }
      await fetch("/api/vault", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultId: qrSession?.vault[0].id,
          vaultPublicKey: qrSession?.vault[0].publicKey,
        }),
      });

      fetchQRSession()
      toast.success('NFT Minting Started');
    }
  }

  useEffect(() => {
    if (isLoading) return;

    if (!connected) {
      router.push("/dashboard")
    }
  }, [connected, isLoading, qrSession, router])

  const getExpirationDisplay = (expiresIn: string | undefined) => {
    switch (expiresIn) {
      case 'TWELVE_HOURS':
        return '12 hours'
      case 'ONE_DAY':
        return '1 day'
      case 'TWO_DAY':
        return '2 days'
      case 'NEVER':
        return 'Never'
      default:
        return expiresIn
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrSessionUrl)
    setIsCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setIsCopied(false), 2000)
  }

  const shareQRCode = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${qrSession?.campaign?.name} - Claim QR Code`,
          text: 'Scan this QR code to claim your collectible',
          url: qrSessionUrl,
        })
        toast.success('Shared successfully')
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      copyToClipboard()
    }
  }

  const downloadQR = () => {
    const svg = document.querySelector('svg')
    if (!svg) {
      toast.error('QR code not found')
      return
    }

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      toast.error('Canvas rendering failed')
      return
    }

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `qr-code-${Date.now()}.png`)
          toast.success('QR code downloaded')
        } else {
          toast.error('Failed to generate image blob')
        }
      }, 'image/png')
    }

    // Safer base64 encoding for Unicode SVGs
    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)))
    img.src = `data:image/svg+xml;base64,${svgBase64}`
  }

  if (isLoading && !qrSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="p-4 mx-auto w-full max-w-screen-md flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>

      {qrSession?.campaign ? (
        <>
          <span className='text-sm text-muted-foreground'>Campaign</span>
          <h1 className="text-xl font-bold mb-1">{qrSession?.campaign?.name}</h1>
        </>
      ) : (
        <>
          <span className='text-sm text-muted-foreground'>Campaign</span>
          <Skeleton className="h-6 w-1/2 mb-4" />
        </>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-center">QR Code Generated</CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              Max claims: {maxClaims} • Expires in: {getExpirationDisplay(qrSession?.expiry)}
            </p>
          </CardHeader>

          <CardContent className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg mb-6 shadow-sm">
              {qrSessionUrl ? (
                <QRCodeSVG value={qrSessionUrl} size={240} level="H" includeMargin={true} />
              ) : (
                <Skeleton className="h-[240px] w-[240px] rounded-md" />
              )}

            </div>

            <div className="w-full relative mb-6">
              <Input value={qrSessionUrl} readOnly className="pr-10 text-sm font-mono" />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1 h-8 w-8"
                onClick={copyToClipboard}
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex gap-3 w-full mb-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
                <span>Copy Link</span>
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={downloadQR}>
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={shareQRCode}>
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </Button>
            </div>
          </CardContent>
          {isOwner && (
            <>
              <Separator />
              <div className="w-full space-y-2 px-4">
                <Label>Mint Proof of Participation (POP)</Label>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm">Select NFT Type</Label>
                  <div className="flex gap-4">
                    <Label className="flex items-center space-x-2">
                      <Input
                        type="radio"
                        value="standard"
                        checked={mintType === 'standard'}
                        onChange={() => setMintType('standard')}
                        disabled={isMinting}
                      />
                      <span>Standard</span>
                    </Label>
                    <Label className="flex items-center space-x-2">
                      <Input
                        type="radio"
                        value="compressed"
                        checked={mintType === 'compressed'}
                        onChange={() => setMintType('compressed')}
                        disabled={true}
                      />
                      <span>Compressed</span>
                    </Label>
                  </div>
                </div>

                {/* Mint Button */}
                {!qrSession?.vault && (
                  <Button
                    onClick={() => handleMint(mintType)}
                    className="w-full"
                    disabled={isMinting}
                  >
                    {isMinting
                      ? 'Minting...'
                      : `Mint ${mintType === 'compressed' ? 'cPOPs' : 'Standard POPs'}`}
                  </Button>
                )}

                {qrSession?.vault[0] && !qrSession.vault[0].minted && (
                  <Button
                    onClick={() => {
                      setIsMinting(true)
                      console.log(qrSession.vault[0].publicKey);

                      const totalCostInLamports = Math.ceil(Number(qrSession.vault[0].costInSol) * 1e9);
                      promptTransfer(bn(totalCostInLamports), qrSession.vault[0].publicKey)
                    }}
                    className="w-full"
                    disabled={isMinting}
                  >
                    {isMinting ? 'Starting Mint...' : 'Start Mint'}
                  </Button>
                )}

                {qrSession?.vault[0] && qrSession.vault[0].minted && (
                  <div className="w-full text-center py-2 text-green-600 font-semibold border rounded">
                    🎉 NFT Minted!
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </motion.div >
  )
}