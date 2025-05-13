import { encryptVaultKeyUint8 } from "@/lib/encrypt";
import prisma from "@/lib/prismaConfig";
import { Keypair } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";

const BASE_COST_PER_NFT = 0.002;
const BUFFER_SOL = 0.05;

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const body = await request.json();
    const sessionId = url.pathname.split('/').slice(-2, -1)[0];

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }

    const qrSession = await prisma.qRSession.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        campaign: {
          include: {
            organizer: true,
          },
        },
      },
    });
    if (!qrSession) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    if (qrSession.campaign.organizer.wallet !== body.publicKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a new vault
    const vault = new Keypair();

    const encrypted = encryptVaultKeyUint8(vault.secretKey);

    const NUMBER_OF_NFTS = qrSession.maxClaims;
    const COLLECTION_NFT_COST = 0.002;

    const totalCostInSOL = (NUMBER_OF_NFTS * BASE_COST_PER_NFT) + BUFFER_SOL + COLLECTION_NFT_COST;
    const totalCostInLamports = Math.ceil(totalCostInSOL * 1e9);

    const newVault = await prisma.vault.create({
      data: {
        publicKey: vault.publicKey.toBase58(),
        privateKey: encrypted,
        qrSessionId: qrSession.id,
        costInSol: totalCostInSOL
      },
    });
    if (!newVault) {
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }


    return NextResponse.json({ amount: totalCostInLamports, vaultPublicKey: vault.publicKey.toBase58() }, { status: 200 });
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}