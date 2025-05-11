import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/lib/pinataConfig";

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const originalFile = data.get("file") as unknown as File;

    if (!originalFile) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const timestamp = Date.now();
    const extension = originalFile.name.split(".").pop();
    const baseName = originalFile.name.replace(/\.[^/.]+$/, "");
    const newFilename = `${timestamp}-${baseName}.${extension}`;

    const arrayBuffer = await originalFile.arrayBuffer();
    const newFile = new File([arrayBuffer], newFilename, {
      type: originalFile.type,
      lastModified: originalFile.lastModified,
    });

    const { cid } = await pinata.upload.public.file(newFile);
    const url = await pinata.gateways.public.convert(cid);

    return NextResponse.json({ url }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
