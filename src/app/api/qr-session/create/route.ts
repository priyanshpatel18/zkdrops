import prisma from "@/lib/prismaConfig";
import { createQrSessionSchema } from "@/lib/zod";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

const calculateExpiry = (expiresIn: string): Date => {
  const now = new Date();
  const units: Record<string, number> = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "2h": 2 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
  };
  const durationMs = units[expiresIn];
  if (!durationMs) throw new Error("Invalid expiresIn value");
  return new Date(now.getTime() + durationMs);
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { campaignId, expiresIn, maxClaims } = createQrSessionSchema.parse(body);

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const expiresAt = calculateExpiry(expiresIn);
    const nonce = nanoid();

    const qrSession = await prisma.qRSession.create({
      data: {
        campaignId,
        expiresAt: expiresAt.toISOString(),
        maxClaims,
        nonce,
      },
    });

    return NextResponse.json({ nonce: qrSession.nonce }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
