import prisma from '@/lib/prismaConfig'
import { createCampaignSchema, editCampaignSchema } from '@/lib/zod'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 })
    }

    const campaign = await prisma.campaign.findUnique({ where: { id }, include: { organizer: true, qrSessions: true } })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

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
        startsAt: formData.startsAt,
        endsAt: formData.endsAt,
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const formData = editCampaignSchema.parse(body)
    console.log(formData);
    

    if (!formData || !formData.id) {
      return NextResponse.json({ error: 'Missing or invalid campaign ID' }, { status: 400 })
    }

    let organizer = await prisma.organizer.findUnique({
      where: { wallet: formData.organizerAddress },
    })

    if (!organizer) {
      organizer = await prisma.organizer.create({
        data: {
          wallet: formData.organizerAddress,
        },
      })
    }

    const updated = await prisma.campaign.update({
      where: { id: formData.id },
      data: {
        name: formData.name,
        description: formData.description,
        tokenSymbol: formData.tokenSymbol,
        tokenUri: formData.tokenUri,
        isActive: formData.isActive,
        startsAt: formData.startsAt,
        endsAt: formData.endsAt,
        claimLimitPerUser: formData.claimLimitPerUser,
        metadataUri: formData.metadataUri,
        organizerId: organizer.id,
      },
    })

    return NextResponse.json({ campaign: updated }, { status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error);
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}