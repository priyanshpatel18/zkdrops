import prisma from '@/lib/prismaConfig'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)

    // Extract the address from the pathname
    const address = url.pathname.split('/').pop()

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        organizer: {
          wallet: address,
        },
      },
      include: {
        organizer: true,
        qrSessions: true,
      },
    })

    if (!campaigns) {
      return NextResponse.json({ error: 'No campaigns found' }, { status: 200 })
    }

    return NextResponse.json(campaigns, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
