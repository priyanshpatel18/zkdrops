import prisma from '@/lib/prismaConfig'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.pathname.split('/').pop()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }

    const qrSession = await prisma.qRSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            organizer: true,
          },
        },
        claims: true,
        vault: true,
      },
    })

    if (!qrSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ qrSession }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
