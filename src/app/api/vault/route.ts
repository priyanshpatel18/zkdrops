import prisma from "@/lib/prismaConfig";
import { pushToQueue } from "@/lib/pushToQueue";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const body = await request.json()

  try {
    const existingVault = await prisma.vault.findUnique({
      where: {
        id: body.vaultId,
      },
    });
    if (!existingVault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    // Update the vault
    await prisma.vault.update({
      where: {
        id: body.vaultId,
      },
      data: {
        minted: true,
      }
    });

    await pushToQueue({ vaultId: existingVault.id });

    return NextResponse.json({ message: 'Vault updated successfully' }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}