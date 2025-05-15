import prisma from '@/lib/prismaConfig'
import { createCampaignSchema } from '@/lib/zod'
import { NextRequest, NextResponse } from 'next/server'

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
    return NextResponse.json({ campaign }, { status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
