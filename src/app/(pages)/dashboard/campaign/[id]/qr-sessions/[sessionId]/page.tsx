"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Campaign, Claim, QRSession } from '@prisma/client'
import { useWallet } from '@solana/wallet-adapter-react'
import { saveAs } from 'file-saver'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Copy, Download, Share2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface QRSessionState extends QRSession {
  campaign: Campaign
  claims: Claim[]
}

export default function QRSessionPage() {
  const router = useRouter()
  const [maxClaims, setMaxClaims] = useState<string>('')
  const [qrSessionUrl, setQrSessionUrl] = useState('')
  const { connected, publicKey } = useWallet();
  const [isCopied, setIsCopied] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const { sessionId } = useParams()
  const [qrSession, setQrSession] = useState<QRSessionState | null>(null)

  useEffect(() => {
    const fetchQRSession = async () => {
      if (!sessionId) return

      try {
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
      }
    }

    fetchQRSession()
  }, [sessionId])

  const handleMintCPOPs = async () => {
    if (!sessionId || !maxClaims) return

    if (!publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    setIsMinting(true)
    toast.success('Minting process started')
    setIsMinting(false)
  }

  useEffect(() => {
    if (!connected) {
      router.back()
    }
  }, [connected, router])

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


  return (
    <motion.div className="p-4 mx-auto w-full max-w-screen-md flex flex-col">
      <div className="flex items-center justify-between mb-6">
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
          <CardHeader className="pb-4">
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
          <Separator />
          <div className="w-full space-y-2 px-4">
            <Label>Mint cPOPs (compressed NFTs)</Label>
            <Button onClick={handleMintCPOPs} className="w-full" disabled={isMinting}>
              {isMinting ? 'Minting...' : 'Mint cPOPs'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
