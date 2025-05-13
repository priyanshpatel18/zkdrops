import prisma from '@/lib/prismaConfig'
import { createQrSessionSchema } from '@/lib/zod'
import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { QRSessionExpiry } from '@prisma/client'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { campaignId, expiresIn, maxClaims } = createQrSessionSchema.parse(body)

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const nonce = nanoid()

    const qrSession = await prisma.qRSession.create({
      data: {
        campaignId,
        expiry: QRSessionExpiry[expiresIn],
        maxClaims,
        nonce,
      },
    })

    return NextResponse.json({ nonce: qrSession.nonce, id: qrSession.id }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
