'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Campaign } from '@/types/types'
import { useWallet } from '@solana/wallet-adapter-react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function NewQrSessionPage() {
  const router = useRouter()
  const { id } = useParams()
  const { publicKey, connected } = useWallet()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [maxClaims, setMaxClaims] = useState<string>('')
  const [expiresIn, setExpiresIn] = useState('TWELVE_HOURS');
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isLoading) return

    if (!connected) {
      router.back()
    }
  }, [connected, isLoading, router])

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

      if (data.nonce) {
        router.push(`/dashboard/campaign/${id}/qr-sessions/${data.id}`)
      }
    } catch (error) {
      console.error(error)
      if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setIsLoading(false)
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

      <Card className="flex-1 flex flex-col gap-6 p-6">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Max Claims</Label>
            <Input type="number" min="0" value={maxClaims} onChange={(e) => setMaxClaims(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Expires In</Label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger>
                <SelectValue placeholder="Choose expiration" />
              </SelectTrigger>
              <SelectContent className='border-none'>
                <SelectItem value="TWELVE_HOURS">12 Hours</SelectItem>
                <SelectItem value="ONE_DAY">1 Day</SelectItem>
                <SelectItem value="TWO_DAY">2 Day</SelectItem>
                <SelectItem value="NEVER">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button className="mt-auto w-full" onClick={handleCreateQRSession} disabled={isLoading}>
          Generate QR Code
        </Button>
      </Card>
    </motion.div >
  )
}
