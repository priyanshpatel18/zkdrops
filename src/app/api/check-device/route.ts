import prisma from '@/lib/prismaConfig'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const fingerprint = searchParams.get('fingerprint')
    const campaignId = searchParams.get('campaignId')

    if (!fingerprint || !campaignId) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 })
    }

    const existingClaim = await prisma.claim.findFirst({
      where: {
        campaignId: campaignId as string,
        deviceHash: fingerprint as string,
      },
    })
    return NextResponse.json(
      {
        hasClaimed: !!existingClaim,
        timestamp: existingClaim?.createdAt || null,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Check device error:', error)
    return NextResponse.json({ message: 'Failed to check device' }, { status: 500 })
  }
}
