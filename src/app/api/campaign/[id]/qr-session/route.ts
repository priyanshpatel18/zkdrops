import prisma from '@/lib/prismaConfig'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  const body = await request.json()

  try {
    const existingQRSession = await prisma.qRSession.findUnique({
      where: {
        id: body.qrSessionId,
      },
      include: {
        vault: true,
      },
    })
    if (!existingQRSession || !existingQRSession.vault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 })
    }

    await prisma.vault.update({
      where: {
        id: existingQRSession.vault[0].id,
      },
      data: {
        minted: true,
      },
    })

    return NextResponse.json({ message: 'Campaign updated successfully' }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
