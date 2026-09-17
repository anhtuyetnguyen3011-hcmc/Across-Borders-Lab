import { NextRequest, NextResponse } from "next/server";
import {
  getDrafts,
  getDraft,
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

function logAIError(action: string, error: unknown): void {
  const status =
    error && typeof error === "object" && "status" in error
      ? (error as { status?: number }).status
      : undefined;
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[api/drafts] ${action} failed:`, { message, status: status ?? null });
}

function redactSecrets(value: string): string {
  const secrets = [
    process.env.ANTHROPIC_API_KEY,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DIRECT_URL,
    process.env.TELEGRAM_BOT_TOKEN,
  ].filter((s): s is string => Boolean(s));
  return secrets.reduce(
    (acc, s) => (s ? acc.split(s).join("[REDACTED]") : acc),
    value
  );
}

export async function GET() {
  return NextResponse.json(await getDrafts());
}

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (error) {
    const name = error instanceof Error ? error.name : typeof error;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[api/drafts] POST unhandled error (${name}): ${message}`);
    const safeMessage = redactSecrets(message);
    return NextResponse.json(
      {
        error: safeMessage || "Request failed",
        category: name === "SyntaxError" ? "invalid_request_body" : "server_error",
      },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  const body = await req.json();

  if (body.action === "generate") {
    try {
      const [styleRefs, styleProfile] = await Promise.all([
        getUnifiedStyleReferences(),
        getStyleProfile(),
      ]);
      const result = await generateDraft(
        body.idea,
        body.platform,
        body.pillar,
        body.hook,
        styleRefs,
        styleProfile?.traits ?? null
      );
      return NextResponse.json({ ...result, styleScore: null, styleDeltas: null });
    } catch (error) {
      logAIError("generate", error);
      return NextResponse.json(
        {
          error: redactSecrets(error instanceof Error ? error.message : "AI generation failed"),
          category: "generate",
        },
        { status: 500 }
      );
    }
  }

  if (body.action === "repurpose") {
    try {
      const sourceDraft = await getDraft(body.draftId);
      if (!sourceDraft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }
      const fromPlatform = sourceDraft.platform;
      const toPlatform = body.toPlatform as "threads" | "website";
      const [styleRefs, styleProfile] = await Promise.all([
        getUnifiedStyleReferences(),
        getStyleProfile(),
      ]);
      const { result, styleScore, styleDeltas } = await runScoredGeneration(
        styleRefs,
        (corrections) =>
          repurposeDraft(
            sourceDraft.body,
            fromPlatform,
            toPlatform,
            styleRefs,
            styleProfile?.traits ?? null,
            corrections
          ),
        (r) => r.body
      );
      return NextResponse.json({ ...result, styleScore, styleDeltas });
    } catch (error) {
      logAIError("repurpose", error);
      return NextResponse.json(
        {
          error: redactSecrets(error instanceof Error ? error.message : "AI repurposing failed"),
          category: "repurpose",
        },
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
      logAIError("hooks", error);
      return NextResponse.json(
        {
          error: redactSecrets(error instanceof Error ? error.message : "AI hook generation failed"),
          category: "hooks",
        },
        { status: 500 }
      );
    }
  }

  try {
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
  } catch (error) {
    logAIError("addDraft", error);
    return NextResponse.json(
      {
        error: redactSecrets(error instanceof Error ? error.message : "Failed to create draft"),
        category: "addDraft",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const draft = await updateDraft(body.id, body);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(draft);
}
