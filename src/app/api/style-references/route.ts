import { NextRequest, NextResponse } from "next/server";
import { addStyleSample, deleteStyleSample, getUnifiedStyleReferences } from "@/lib/data";

export async function GET() {
  return NextResponse.json(await getUnifiedStyleReferences());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "add-sample") {
    const sample = await addStyleSample({
      sourceType: body.sourceType,
      sourceUrl: body.sourceUrl || null,
      extractedText: body.extractedText,
      title: body.title || null,
    });
    return NextResponse.json(sample);
  }

  if (body.action === "delete-sample") {
    const deleted = await deleteStyleSample(body.sampleId);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
