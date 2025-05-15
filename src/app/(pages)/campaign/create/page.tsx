'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createCampaign } from '@/lib/supabaseClient.'
import { Campaign } from '@/types/types'
import { useWallet } from '@solana/wallet-adapter-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Calendar, Check, ImageIcon, Loader2, TrashIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export default function CreateCampaignPage() {
  const router = useRouter()
  const { publicKey, connected } = useWallet()
  const [loading, setLoading] = useState(true)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [tokenImage, setTokenImage] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tokenSymbol: '',
    tokenUri: '',
    isActive: true,
    startsAt: '',
    tokenMediaType: '',
    endsAt: '',
    claimLimitPerUser: '',
    metadataUri: '',
    qrCodeUrl: '',
  })

  const now = new Date().toISOString().slice(0, 16)
  const nextDay = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 16)

  type HandleChange = (field: keyof Campaign, value: string | boolean) => void

  const handleChange: HandleChange = (field, value) => {
    if (field === 'name' && typeof value === 'string' && value.length > 32) {
      toast.error('Name must be less than 32 characters')
      return
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    // Validate required fields
    if (!formData.name || !formData.tokenSymbol || !formData.tokenUri) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!formData.tokenMediaType || !['image/png', 'image/jpeg', 'image/jpg'].includes(formData.tokenMediaType)) {
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

      if (!tokenImage) {
        toast.error('Please upload a token image')
        return
      }

      const body = {
        ...formData,
        id: '',
        organizerAddress: publicKey.toBase58(),
        claimLimitPerUser: parseInt(formData.claimLimitPerUser),
      }

      const imageData = new FormData()
      imageData.append('file', tokenImage)
      await createCampaign(body, imageData)

      setShowSuccessModal(true)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
      toast.error('Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(false)
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

  return (
    <motion.div
      className="p-4 mx-auto pb-16 w-full max-w-screen-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full md:w-2/3 lg:w-3/5 mx-auto">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-4 cursor-pointer" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-2/3 lg:w-3/5 mx-auto">
          <Card className="shadow-lg border-primary/10 w-full mx-auto md:mx-0">
            <div className="p-6">
              <CardTitle className="text-2xl font-bold text-center">Create New Campaign</CardTitle>
              <CardDescription className="text-center mb-6">Fill in the details below to get started</CardDescription>
            </div>

            <CardContent className="p-4 pt-0">
              <div className="space-y-6">
                {/* Basic Campaign Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center">
                      <span>Campaign Name</span>
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                      maxLength={32}
                      placeholder="Enter campaign name"
                      className="border-primary/20"
                    />
                    <p className="text-xs text-muted-foreground text-right">{formData.name.length}/32 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description || ''}
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
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleChange('isActive', checked)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Token Information */}
                <Accordion type="single" collapsible defaultValue="token-info" className="w-full">
                  <AccordionItem value="token-info">
                    <AccordionTrigger className="py-2">
                      <div className="flex items-center">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        <span>Token Details</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="tokenSymbol" className="flex items-center">
                          <span>Token Symbol</span>
                          <span className="text-destructive ml-1">*</span>
                        </Label>
                        <Input
                          id="tokenSymbol"
                          name="tokenSymbol"
                          value={formData.tokenSymbol}
                          onChange={(e) => handleChange('tokenSymbol', e.target.value)}
                          required
                          placeholder="e.g. SOL"
                          className="border-primary/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tokenMedia" className="flex items-center">
                          <span>Token Image</span>
                          <span className="text-destructive ml-1">*</span>
                        </Label>
                        <Input
                          ref={fileInputRef}
                          id="tokenMedia"
                          name="tokenMedia"
                          type="file"
                          className="cursor-pointer"
                          accept="image/png,image/jpeg,image/jpg"
                          onClick={(e) => {
                            ;(e.target as HTMLInputElement).value = ''
                            setFormData((prev) => ({ ...prev, tokenUri: '', tokenMediaType: '' }))
                            setTokenImage(null)
                          }}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0]
                              setTokenImage(file)
                              handleChange('tokenUri', file.name)
                              handleChange('tokenMediaType', file.type)
                            }
                          }}
                        />

                        {tokenImage && (
                          <div className="flex items-center justify-center mt-2">
                            <div className="relative w-[100px] h-[100px]">
                              <Image
                                src={URL.createObjectURL(tokenImage)}
                                alt="Token Image"
                                fill
                                className="object-contain rounded-md"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 transition-opacity cursor-pointer"
                                onClick={() => {
                                  setTokenImage(null)
                                  handleChange('tokenUri', '')
                                  handleChange('tokenMediaType', '')
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = ''
                                  }
                                }}
                              >
                                <TrashIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Separator />

                {/* Campaign Timing */}
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
                            value={formData.startsAt}
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
                            value={formData.endsAt}
                            min={nextDay}
                            onChange={(e) => handleChange('endsAt', e.target.value)}
                            className="border-primary/20"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Separator />

                {/* Claim Settings */}
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
                          value={formData.claimLimitPerUser}
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
                  Create Campaign
                </Button>
              </div>
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
                <h2 className="text-2xl font-bold text-primary">Campaign Created</h2>
                <p className="text-muted-foreground">Your campaign has been successfully created and is now live.</p>
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
