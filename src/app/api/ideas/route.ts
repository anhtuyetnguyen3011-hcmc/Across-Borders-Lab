import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getIdeas, addIdea, deleteIdea } from "@/lib/data";
import { expandIdea } from "@/lib/ai";
import { runAutoPipeline } from "@/lib/automation";

export async function GET() {
  return NextResponse.json(await getIdeas());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "expand") {
    const variants = await expandIdea(body.text, body.pillar, body.platform);
    return NextResponse.json({ variants });
  }

  const idea = await addIdea({
    text: body.text,
    source: body.source || "manual",
    pillar: body.pillar,
    platform: body.platform,
    referenceLink: body.referenceLink,
  });

  // Auto-pipeline: draft generation → style scoring → Telegram approval send
  // runs server-side right after submission, without blocking the response.
  after(async () => {
    await runAutoPipeline(idea.id);
  });

  return NextResponse.json(idea);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const deleted = await deleteIdea(id);
  return NextResponse.json({ deleted });
}
