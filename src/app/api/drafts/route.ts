import { NextRequest, NextResponse } from "next/server";
import {
  getDrafts,
  addDraft,
  updateDraft,
  getUnifiedStyleReferences,
  getStyleProfile,
} from "@/lib/data";
import {
  generateDraft,
  repurposeDraft,
  generateHookOptions,
} from "@/lib/ai";
import { computeStyleBaseline, scoreDraftAgainstBaseline } from "@/lib/styleScoring";
import type { UnifiedStyleExample } from "@/lib/data";

async function runScoredGeneration<T>(
  styleRefs: UnifiedStyleExample[],
  attempt: (corrections?: Record<string, number>) => Promise<T>,
  getBody: (result: T) => string
): Promise<{ result: T; styleScore: number | null; styleDeltas: Record<string, number> | null }> {
  const baseline = styleRefs.length > 0 ? computeStyleBaseline(styleRefs) : null;

  let result = await attempt();
  let styleScore: number | null = null;
  let styleDeltas: Record<string, number> | null = null;

  if (baseline) {
    let scored = scoreDraftAgainstBaseline(getBody(result), baseline);
    if (scored.score < 70) {
      result = await attempt(scored.deltas);
      scored = scoreDraftAgainstBaseline(getBody(result), baseline);
    }
    styleScore = scored.score;
    styleDeltas = scored.deltas;
  }

  return { result, styleScore, styleDeltas };
}

export async function GET() {
  return NextResponse.json(await getDrafts());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "generate") {
    try {
      const [styleRefs, styleProfile] = await Promise.all([
        getUnifiedStyleReferences(),
        getStyleProfile(),
      ]);
      const { result, styleScore, styleDeltas } = await runScoredGeneration(
        styleRefs,
        (corrections) =>
          generateDraft(
            body.idea,
            body.platform,
            body.pillar,
            body.hook,
            styleRefs,
            styleProfile?.traits ?? null,
            corrections
          ),
        (r) => r.body
      );
      return NextResponse.json({ ...result, styleScore, styleDeltas });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "AI generation failed" },
        { status: 500 }
      );
    }
  }

  if (body.action === "repurpose") {
    try {
      const [styleRefs, styleProfile] = await Promise.all([
        getUnifiedStyleReferences(),
        getStyleProfile(),
      ]);
      const { result, styleScore, styleDeltas } = await runScoredGeneration(
        styleRefs,
        (corrections) =>
          repurposeDraft(
            body.body,
            body.fromPlatform,
            body.toPlatform,
            styleRefs,
            styleProfile?.traits ?? null,
            corrections
          ),
        (r) => r.body
      );
      return NextResponse.json({ ...result, styleScore, styleDeltas });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "AI repurposing failed" },
        { status: 500 }
      );
    }
  }

  if (body.action === "hooks") {
    try {
      const styleProfile = await getStyleProfile();
      const hooks = await generateHookOptions(body.title, styleProfile);
      return NextResponse.json({ hooks });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "AI hook generation failed" },
        { status: 500 }
      );
    }
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
    styleScore: body.styleScore,
    styleDeltas: body.styleDeltas,
  });
  return NextResponse.json(draft);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const draft = await updateDraft(body.id, body);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(draft);
}
