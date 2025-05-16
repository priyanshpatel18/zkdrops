'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/date'
import { editCampaign } from '@/lib/supabaseClient.'
import { Campaign } from '@/types/types'
import { useWallet } from '@solana/wallet-adapter-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Calendar, Check, Loader2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function EditCampaignPage() {
  const router = useRouter()
  const { id } = useParams()
  const { publicKey, connected } = useWallet()
  const [loading, setLoading] = useState(true)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [error, setError] = useState<string | null>(null)

  const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;

    // Pad function to keep format consistent
    const pad = (n: number) => n.toString().padStart(2, '0');

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

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
              startsAt: formatDateForInput(campaign.startsAt),
              endsAt: formatDateForInput(campaign.endsAt),
              claimLimitPerUser: campaign.claimLimitPerUser && parseInt(campaign.claimLimitPerUser?.toString()),
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


  const now = new Date().toISOString().slice(0, 16)
  const nextDay = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 16)

  type HandleChange = (field: keyof Campaign, value: string | boolean) => void

  const handleChange: HandleChange = (field, value) => {
    if (field === 'name' && typeof value === 'string' && value.length > 32) {
      toast.error('Name must be less than 32 characters')
      return
    }

    setCampaign((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  async function handleSubmit() {
    if (!campaign) {
      toast.error("Campaign not found")
      return;
    }

    if (!campaign.name || !campaign.tokenSymbol || !campaign.tokenUri) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!campaign.tokenMediaType || !['image/png', 'image/jpeg', 'image/jpg'].includes(campaign.tokenMediaType)) {
      toast.error('Please upload a valid image file (PNG or JPEG)')
      return
    }

    if (!publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    // Here you would typically save the campaign data
    try {
      setLoading(true)

      const body = {
        ...campaign,
        id: campaign.id,
        organizerAddress: publicKey.toBase58(),
        claimLimitPerUser: Number(campaign.claimLimitPerUser) ?? null,
        startsAt: formatDate(campaign.startsAt),
        endsAt: formatDate(campaign.endsAt),
      }

      await editCampaign(body)

      setShowSuccessModal(true)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
      toast.error('Failed to edit campaign')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!connected) {
      router.push('/')
    }
  }, [connected, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] flex-col">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading...</p>
      </div>
    )
  }

  // Error state
  if (error || !isOwner) {
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
              {!isOwner ? <p>You are not authorized to edit this campaign.</p> : <p>{error}</p>}
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


  return (
    <motion.div
      className="p-4 mx-auto pb-16 w-full max-w-screen-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full md:w-2/3 lg:w-3/5 mx-auto">
        <Button variant="ghost" onClick={() => router.push(`/campaign/${campaign.id}`)} className="mb-4 cursor-pointer" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaign
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-2/3 lg:w-3/5 mx-auto">
          <Card className="shadow-lg border-primary/10 w-full mx-auto md:mx-0">
            <div className="p-6">
              <CardTitle className="text-2xl font-bold text-center">Edit this Campaign</CardTitle>
              <CardDescription className="text-center mb-6">Edit the details below to update your campaign</CardDescription>
            </div>
            <CardContent className="p-4 pt-0">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center">
                    <span>Campaign Name</span>
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={campaign.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                    maxLength={32}
                    placeholder="Enter campaign name"
                    className="border-primary/20"
                  />
                  <p className="text-xs text-muted-foreground text-right">{campaign.name.length}/32 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={campaign.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Enter campaign description"
                    rows={3}
                    className="resize-none border-primary/20"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Campaign Active</Label>
                  <Switch
                    id="isActive"
                    checked={campaign.isActive}
                    onCheckedChange={(checked) => handleChange('isActive', checked)}
                  />
                </div>
              </div>

              <Separator />

              <Accordion type="single" collapsible defaultValue="timing-info" className="w-full">
                <AccordionItem value="timing-info">
                  <AccordionTrigger className="py-2">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Campaign Timing</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Start Date</Label>
                        <Input
                          type="datetime-local"
                          id="startsAt"
                          name="startsAt"
                          value={campaign.startsAt}
                          min={now}
                          onChange={(e) => handleChange('startsAt', e.target.value)}
                          className="border-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">End Date</Label>
                        <Input
                          type="datetime-local"
                          id="endsAt"
                          name="endsAt"
                          value={campaign.endsAt}
                          min={nextDay}
                          onChange={(e) => handleChange('endsAt', e.target.value)}
                          className="border-primary/20"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Accordion type="single" collapsible defaultValue="claim-settings" className="w-full">
                <AccordionItem value="claim-settings">
                  <AccordionTrigger className="py-2">
                    <div className="flex items-center">
                      <Check className="h-4 w-4 mr-2" />
                      <span>Claim Settings</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="claimLimitPerUser">Claim Limit Per User</Label>
                      <Input
                        type="number"
                        id="claimLimitPerUser"
                        name="claimLimitPerUser"
                        value={String(campaign.claimLimitPerUser)}
                        onChange={(e) => handleChange('claimLimitPerUser', e.target.value)}
                        min={0}
                        placeholder="Leave blank for unlimited"
                        className="border-primary/20"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Button onClick={handleSubmit} className="w-full cursor-pointer">
                Edit Campaign
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-background/80 p-4"
          >
            <Card className="max-w-sm w-full border-primary/20 shadow-xl">
              <CardContent className="p-6 text-center space-y-4">
                <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-primary">Campaign Edited</h2>
                <p className="text-muted-foreground">Your campaign has been successfully edited.</p>
                <Button
                  onClick={() => {
                    setShowSuccessModal(false)
                    router.push('/')
                  }}
                  className="w-full cursor-pointer mt-2"
                >
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
