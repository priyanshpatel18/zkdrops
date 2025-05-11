import prisma from "@/lib/prismaConfig";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const nonce = searchParams.get("nonce");
    if (!nonce) {
      return NextResponse.json({ error: "Missing campaign nonce" }, { status: 400 });
    }

    const session = await prisma.qRSession.findFirst({ where: { nonce }, include: { campaign: true, claims: true } });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}