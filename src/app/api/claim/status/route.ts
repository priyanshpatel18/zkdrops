import prisma from '@/lib/prismaConfig'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 })
    }

    const existingClaim = await prisma.claim.findFirst({
      where: {
        id: id as string,
      },
    })

    return NextResponse.json(
      {
        status: existingClaim?.status || null,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Check device error:', error)
    return NextResponse.json({ message: 'Failed to check device' }, { status: 500 })
  }
}
