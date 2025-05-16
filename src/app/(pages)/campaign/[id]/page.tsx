'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Campaign } from '@/types/types'
import { QRSessionExpiry } from '@prisma/client'
import { useWallet } from '@solana/wallet-adapter-react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BarChart2,
  CalendarIcon,
  CheckCircle2,
  EditIcon,
  Loader2,
  QrCode,
  Share2,
  Shield,
} from 'lucide-react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

export default function CampaignPage() {
  const { id } = useParams()
  const router = useRouter()
  const { publicKey, connected } = useWallet()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  const activeQrSession = useMemo(() => {
    const now = new Date()
    if (!campaign?.qrSessions) return null

    const getExpiresAt = (createdAt: Date, expiry: QRSessionExpiry): Date | null => {
      const created = createdAt
      switch (expiry) {
        case QRSessionExpiry.TWELVE_HOURS:
          return new Date(created.getTime() + 12 * 60 * 60 * 1000)
        case QRSessionExpiry.ONE_DAY:
          return new Date(created.getTime() + 24 * 60 * 60 * 1000)
        case QRSessionExpiry.TWO_DAY:
          return new Date(created.getTime() + 48 * 60 * 60 * 1000)
        case QRSessionExpiry.NEVER:
          return null
        default:
          return null
      }
    }

    return campaign.qrSessions.find((session) => {
      const expiresAt = getExpiresAt(new Date(session.createdAt), session.expiry)
      return !expiresAt || expiresAt >= now
    })
  }, [campaign])

  useEffect(() => {
    if (!campaign || !campaign.endsAt) return

    const interval = setInterval(() => {
      const endTime = new Date(campaign.endsAt).getTime()
      const now = new Date().getTime()
      const distance = endTime - now

      if (distance < 0) {
        clearInterval(interval)
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((distance / (1000 * 60)) % 60),
        seconds: Math.floor((distance / 1000) % 60),
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [campaign])

  useEffect(() => {
    async function fetchCampaign() {
      try {
        setLoading(true)

        // Fetch campaign campaign from Supabase
        if (typeof id === 'string') {
          const res = await fetch(`/api/campaign?id=${id}`)
          const data = await res.json()
          const campaign: Campaign = data.campaign

          if (campaign) {
            setCampaign({
              ...campaign,
              organizerAddress: campaign.organizer?.id ?? '',
              tokenMediaType: 'image/jpg',
              description: campaign.description || '',
              startsAt:
                typeof campaign.startsAt === 'string'
                  ? campaign.startsAt
                  : campaign.startsAt
                    ? new Date(campaign.startsAt).toISOString()
                    : '',
              endsAt:
                typeof campaign.endsAt === 'string'
                  ? campaign.endsAt
                  : campaign.endsAt
                    ? new Date(campaign.endsAt).toISOString()
                    : '',
              claimLimitPerUser: parseInt(campaign.claimLimitPerUser?.toString() || '0'),
              metadataUri: campaign.metadataUri || '',
              qrSessions: campaign.qrSessions || [],
            })
          }

          // Check if current user is the campaign organizer
          if (connected && publicKey && campaign) {
            const isOrganizer = publicKey.toBase58().toLowerCase() === campaign.organizer?.wallet.toLowerCase()
            setIsOwner(isOrganizer)
          }
        } else {
          throw new Error('Invalid campaign ID')
        }
      } catch (err) {
        console.error('Error fetching campaign:', err)
        setError(err instanceof Error ? err.message : 'Failed to load campaign')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchCampaign()
    }
  }, [id, publicKey, connected])

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading campaign details...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <Button variant="ghost" onClick={() => router.push('/')} className="mb-4" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <Card className="w-full border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push('/')}>Return to Dashboard</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  // Not found state
  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-4">
        <div className="w-full max-w-md">
          <Button variant="ghost" onClick={() => router.push('/')} className="mb-4" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Campaign Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p>The campaign you&apos;re looking for doesn&apos;t exist or has been removed.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push('/')} className="cursor-pointer">
                Return to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  // Main campaign page
  return (
    <motion.div
      className="p-4 mx-auto w-full max-w-screen-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => router.push('/')} size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        </div>

        <div className="flex flex-col">
          <Card className="overflow-hidden border-primary/10">
            <div className="relative p-6 py-0">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                {campaign.tokenUri && (
                  <div className="flex-shrink-0 rounded-lg bg-white shadow-md p-1 border">
                    <div className="rounded-md overflow-hidden w-16 h-16 relative">
                      <Image src={campaign.tokenUri} alt={campaign.name} fill className="object-cover" sizes="64px" />
                    </div>
                  </div>
                )}

                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
                    <Badge variant={campaign.isActive ? 'default' : 'secondary'}>
                      {campaign.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 md:mt-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() =>
                            copyToClipboard(
                              `${window.location.origin}/campaign/${id}`,
                              'Campaign link copied to clipboard!',
                            )
                          }
                        >
                          <Share2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Share</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Share this campaign</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            <CardContent>
              <div className="grid gap-6">
                {campaign.description && (
                  <div>
                    <h3 className="font-medium mb-2">About this campaign</h3>
                    <p className="text-muted-foreground">{campaign.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/30">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Token Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="font-bold text-lg">{campaign.tokenSymbol}</p>
                      <p className="text-xs text-muted-foreground">Symbol</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {!campaign ? (
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-[200px]" />
                          <Skeleton className="h-4 w-[160px]" />
                        </div>
                      ) : campaign.endsAt ? (
                        <>
                          <p className="font-bold text-lg font-mono">
                            {`${String(countdown.days).padStart(2, '0')}d ${String(countdown.hours).padStart(2, '0')}h ${String(countdown.minutes).padStart(2, '0')}m ${String(countdown.seconds).padStart(2, '0')}s left`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {campaign.startsAt ? `Starts ${formatDate(campaign.startsAt)}` : 'No start date'}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No end date</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {campaign.startsAt && campaign.endsAt && (
                  <>
                    <Progress
                      value={(() => {
                        const now = new Date()
                        const start = new Date(campaign.startsAt)
                        const end = new Date(campaign.endsAt)
                        const total = end.getTime() - start.getTime()
                        const elapsed = now.getTime() - start.getTime()

                        if (now < start) return 0
                        if (now > end) return 100

                        return Math.round((elapsed / total) * 100)
                      })()}
                      className="h-2"
                    />

                    <div className="flex justify-between text-xs text-muted-foreground font-mono mt-1">
                      <span>
                        Start: {new Date(campaign.startsAt).toLocaleDateString()} at{' '}
                        {new Date(campaign.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>
                        Ends in:{' '}
                        {`${String(countdown.days).padStart(2, '0')}:${String(countdown.hours).padStart(2, '0')}:${String(countdown.minutes).padStart(2, '0')}:${String(countdown.seconds).padStart(2, '0')}`}
                      </span>
                    </div>
                  </>
                )}

                {isOwner && (
                  <>
                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-medium">Owner Actions</h3>

                      {campaign.qrSessions && campaign.qrSessions?.length > 0 && (
                        <Card className="bg-muted/30">
                          <CardHeader>
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <BarChart2 className="w-4 h-4" />
                              QR Session Analytics
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>
                              <strong>Total Sessions:</strong> {campaign.qrSessions.length}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => {
                            router.push(`/campaign/${id}/edit`)
                          }}
                          className="gap-2"
                        >
                          <EditIcon className="h-4 w-4" />
                          <span>Edit Campaign</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => router.push(`/campaign/${id}/claims`)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>View Claims</span>
                        </Button>

                        {activeQrSession ? (
                          <Button
                            onClick={() => {
                              router.push(`/campaign/${id}/qr-sessions/${activeQrSession.id}`)
                            }}
                            className="gap-2"
                          >
                            <QrCode className="h-4 w-4" />
                            <span>View QR Session</span>
                          </Button>
                        ) : (
                          <Button onClick={() => router.push(`/campaign/${id}/qr-sessions/new`)} className="gap-2">
                            <QrCode className="h-4 w-4" />
                            <span>Create QR Session</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
