import prisma from "@/lib/prismaConfig";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing campaign id" }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({ where: { id }, include: { organizer: true, qrSessions: true } });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}