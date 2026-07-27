import { NextRequest, NextResponse } from "next/server";
import { getDrafts, updateDraft, addStyleSample, deleteStyleSample, getUnifiedStyleReferences } from "@/lib/data";

export async function GET() {
  return NextResponse.json(getUnifiedStyleReferences());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "toggle") {
    const draft = updateDraft(body.draftId, { isStyleReference: body.isStyleReference });
    if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(draft);
  }

  if (body.action === "add-sample") {
    const sample = addStyleSample({
      sourceType: body.sourceType,
      sourceUrl: body.sourceUrl || null,
      extractedText: body.extractedText,
      title: body.title || null,
    });
    return NextResponse.json(sample);
  }

  if (body.action === "delete-sample") {
    const deleted = deleteStyleSample(body.sampleId);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "set-all") {
    const drafts = getDrafts();
    for (const draft of drafts) {
      updateDraft(draft.id, { isStyleReference: body.draftIds.includes(draft.id) });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
