import { NextRequest, NextResponse } from "next/server";
import { getDrafts, addDraft, updateDraft, getUnifiedStyleReferences } from "@/lib/data";
import { generateDraft, repurposeDraft, generateHooks } from "@/lib/ai";

export async function GET() {
  return NextResponse.json(await getDrafts());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "generate") {
    try {
      const styleRefs = await getUnifiedStyleReferences();
      const result = await generateDraft(body.idea, body.platform, body.pillar, body.hook, styleRefs);
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "AI generation failed" },
        { status: 500 }
      );
    }
  }

  if (body.action === "repurpose") {
    try {
      const styleRefs = await getUnifiedStyleReferences();
      const result = await repurposeDraft(body.body, body.fromPlatform, body.toPlatform, styleRefs);
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "AI repurposing failed" },
        { status: 500 }
      );
    }
  }

  if (body.action === "hooks") {
    const hooks = await generateHooks(body.title, body.pillar, body.platform);
    return NextResponse.json({ hooks });
  }

  const draft = await addDraft({
    ideaId: body.ideaId,
    platform: body.platform,
    pillar: body.pillar,
    title: body.title,
    hook: body.hook,
    body: body.body,
    outline: body.outline || "",
    metaDescription: body.metaDescription,
    targetKeyword: body.targetKeyword,
    threadStructure: body.threadStructure,
  });
  return NextResponse.json(draft);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const draft = await updateDraft(body.id, body);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(draft);
}
