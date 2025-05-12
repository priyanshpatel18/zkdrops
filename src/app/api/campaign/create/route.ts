import prisma from '@/lib/prismaConfig'
import { createCampaignSchema } from '@/lib/zod'
import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const formData = createCampaignSchema.parse(body)

  if (!formData || typeof formData.tokenUri !== 'string')
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  try {
    let organizer = await prisma.organizer.findUnique({ where: { wallet: formData.organizerAddress } })

    if (!organizer) {
      organizer = await prisma.organizer.create({
        data: {
          wallet: formData.organizerAddress,
        },
      })
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: formData.name,
        description: formData.description,
        tokenSymbol: formData.tokenSymbol,
        tokenUri: formData.tokenUri,
        isActive: formData.isActive,
        startsAt: new Date(formData.startsAt).toISOString(),
        endsAt: new Date(formData.endsAt).toISOString(),
        claimLimitPerUser: formData.claimLimitPerUser,
        metadataUri: formData.metadataUri,
        organizerId: organizer.id,
      },
    })
    if (!campaign) return NextResponse.json({ error: 'Failed to create campaign' }, { status: 400 })

    // Generate QR Code
    const qrData = `https://zkdrops.xyz/dashboard/campaign/${campaign.id}`
    const qrDataUrl = await QRCode.toDataURL(qrData)

    // Convert base64 to Blob and then to File
    const qrBlob = await (await fetch(qrDataUrl)).blob()
    const qrFile = new File([qrBlob], `${Date.now()}-${formData.name}-qr.png`, { type: 'image/png' })

    const qrFormData = new FormData()
    qrFormData.append('file', qrFile)

    const qrUploadRes = await fetch(`${baseUrl}/api/files`, {
      method: 'POST',
      body: qrFormData,
    })
    if (qrUploadRes.status !== 200) {
      return NextResponse.json({ error: 'Failed to upload qr code' }, { status: 400 })
    }
    const qrUploadData = await qrUploadRes.json()

    await prisma.campaign.update({
      where: {
        id: campaign.id,
      },
      data: {
        qrCodeUrl: qrUploadData.url,
      },
    })

    return NextResponse.json({ campaign }, { status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
