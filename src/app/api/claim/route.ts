import prisma from '@/lib/prismaConfig'
import { mintNFT } from '@/lib/pushToQueue'
import { claimSchema } from '@/lib/zod'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const data = claimSchema.parse(body)

  try {
    const session = await prisma.qRSession.findUnique({
      where: { nonce: data.sessionNonce },
      include: { campaign: { include: { organizer: true } } },
    })
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.campaign.organizer.wallet === data.walletAddress) {
      return NextResponse.json({ error: 'Organizer cannot claim' }, { status: 403 })
    }

    const zkProof = await prisma.zKProof.create({
      data: {
        proof: data.proof,
        publicSignals: data.publicSignals,
      },
    })

    const claim = await prisma.claim.create({
      data: {
        campaignId: data.campaignId,
        deviceHash: data.deviceHash,
        geoRegion: data.geoRegion,
        zkProofId: zkProof.id,
        wallet: data.walletAddress,
        qrSessionId: session.id,
        organizerId: session.campaign.organizerId,
      },
    })

    await mintNFT({ claimId: claim.id });

    return NextResponse.json({ claim }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
