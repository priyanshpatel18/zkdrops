'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Campaign } from '@/types/types'
import { useWallet } from '@solana/wallet-adapter-react'
import { saveAs } from "file-saver"
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Copy, Download, Share2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function NewQrSessionPage() {
  const router = useRouter()
  const { id } = useParams()
  const { publicKey, connected } = useWallet()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [maxClaims, setMaxClaims] = useState<string>('')
  const [expiresIn, setExpiresIn] = useState('15m')
  const [qrSessionUrl, setQrSessionUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [qrSessionNonce, setQrSessionNonce] = useState<string | null>(null)
  const [isMinting, setIsMinting] = useState(false)

  useEffect(() => {
    if (!connected) {
      router.back()
    }
  }, [connected, router])

  useEffect(() => {
    const fetchCampaign = async () => {
      if (typeof id !== 'string') return
      setIsLoading(true)

      try {
        const res = await fetch(`/api/campaign?id=${id}`)
        const data = await res.json()
        const fetchedCampaign: Campaign = data.campaign

        setCampaign(fetchedCampaign)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) fetchCampaign()
  }, [id, publicKey, connected])

  const handleCreateQRSession = async () => {
    if (!id) return

    if (!maxClaims || isNaN(parseInt(maxClaims)) || parseInt(maxClaims) <= 0) {
      toast.error('Please enter a valid maximum number of claims')
      return
    }

    try {
      setIsLoading(true)

      const body = {
        campaignId: id,
        maxClaims: parseInt(maxClaims),
        expiresIn,
      }

      const res = await fetch(`/api/qr-session/create`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        toast.error('Failed to create QR session')
        return
      }

      const data = await res.json()

      setQrSessionUrl(`${window.location.origin}/claim/${data.nonce}`)
      setQrSessionNonce(data.nonce)
    } catch (error) {
      console.error(error)
      if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleMintCPOPs = async () => {
    if (!id || !qrSessionNonce || !maxClaims) return

    if (!publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    setIsMinting(true)
    toast.success('Minting process started')
    setIsMinting(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrSessionUrl)
    setIsCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setIsCopied(false), 2000)
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

  const shareQRCode = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${campaign?.name} - Claim QR Code`,
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

  useEffect(() => {
    if (!campaign || !publicKey || isLoading) return

    if (!connected) {
      router.push('/dashboard')
      return
    }

    if (publicKey.toBase58().toLowerCase() !== campaign.organizer?.wallet.toLowerCase()) {
      router.push(`/dashboard/campaign/${id}`)
    }
  }, [campaign, publicKey, connected, id, isLoading, router])

  // Format expiration time for display
  const getExpirationDisplay = () => {
    switch (expiresIn) {
      case '15m':
        return '15 minutes'
      case '1h':
        return '1 hour'
      case '2h':
        return '2 hours'
      case '1d':
        return '24 hours'
      default:
        return expiresIn
    }
  }

  return (
    <motion.div className="p-4 mx-auto w-full max-w-screen-md flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>

      <h1 className="text-xl font-bold mb-1">{campaign?.name}</h1>
      <p className="text-muted-foreground mb-6 text-sm">Create a limited-use QR session</p>

      {!qrSessionUrl ? (
        <Card className="flex-1 flex flex-col gap-6 p-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Max Claims</Label>
              <Input type="number" min="0" value={maxClaims} onChange={(e) => setMaxClaims(e.target.value)} />
            </div>

            <div>
              <Label>Expires In</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose expiration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="2h">2 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="mt-auto w-full" onClick={handleCreateQRSession} disabled={isLoading}>
            Generate QR Code
          </Button>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-center">QR Code Generated</CardTitle>
              <p className="text-center text-sm text-muted-foreground">
                Max claims: {maxClaims} • Expires in: {getExpirationDisplay()}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg mb-6 shadow-sm">
                <QRCodeSVG value={qrSessionUrl} size={240} level="H" includeMargin={true} />
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
      )}
    </motion.div>
  )
}
