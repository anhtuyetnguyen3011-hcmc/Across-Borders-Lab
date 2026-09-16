import {
  addDraft,
  getDrafts,
  getIdea,
  getStyleProfile,
  getUnifiedStyleReferences,
  updateDraft,
} from "./data";
import { generateDraft, generateHookOptions } from "./ai";
import { runScoredGeneration, STYLE_PASS_THRESHOLD } from "./scoredGeneration";
import { requestReviewForDraft } from "./reviewFlow";

export interface AutoPipelineResult {
  ok: boolean;
  reason?: string;
  draftId?: string;
  styleScore?: number | null;
  sentToTelegram?: boolean;
}

// Server-side chain that runs automatically after an Idea is submitted:
// existing hook generation -> existing scored draft generation (same path as
// the "Generate with AI" button) -> if the style score clears the existing
// pass threshold, the same review + Telegram approval send the manual
// "Submit for Review" flow performs. Any failure logs and leaves the state
// exactly as the manual flow expects it, so every manual step still works.
export async function runAutoPipeline(ideaId: string): Promise<AutoPipelineResult> {
  try {
    const idea = await getIdea(ideaId);
    if (!idea) {
      console.warn(`[auto-pipeline] Idea ${ideaId} not found — skipping`);
      return { ok: false, reason: "idea_not_found" };
    }

    // Idempotency: never generate a second draft (or a second Telegram send)
    // if a draft already exists for this idea, e.g. on retry/double trigger.
    const drafts = await getDrafts();
    if (drafts.some((d) => d.ideaId === ideaId && !d.isStyleReference)) {
      console.warn(`[auto-pipeline] Draft already exists for idea ${ideaId} — skipping`);
      return { ok: false, reason: "draft_already_exists" };
    }

    // Step 1: hooks via the existing generator (manual flow's first step);
    // automation takes the first option instead of asking the user to pick.
    const styleProfile = await getStyleProfile();
    const hookOptions = await generateHookOptions(idea.text, styleProfile);
    const chosenHook = hookOptions[0];
    if (!chosenHook) {
      console.error(`[auto-pipeline] No hooks generated for idea ${ideaId}`);
      return { ok: false, reason: "no_hook_generated" };
    }

    // Step 2: scored generation — identical inputs/path to the /api/drafts
    // "generate" action behind the "Generate with AI" button.
    const styleRefs = await getUnifiedStyleReferences();
    const { result, styleScore, styleDeltas } = await runScoredGeneration(
      styleRefs,
      (corrections) =>
        generateDraft(
          idea.text,
          idea.platform,
          idea.pillar,
          chosenHook.text,
          styleRefs,
          styleProfile?.traits ?? null,
          corrections
        ),
      (r) => r.body
    );

    // Step 3: persist the draft with the same defaults the manual flow saves.
    const draft = await addDraft({
      ideaId: idea.id,
      platform: idea.platform,
      pillar: idea.pillar,
      title: result.title,
      hook: result.hook,
      body: result.body,
      outline: result.outline,
      selectedHookArchetype: chosenHook.archetype,
      ...(styleScore !== null ? { styleScore } : {}),
      ...(styleDeltas !== null ? { styleDeltas } : {}),
    });

    // Step 4: threshold gate using the existing pass boundary. Below it (or
    // no baseline scored) → stop here; the draft stays in its normal pending
    // state and the untouched manual buttons remain the fallback.
    if (styleScore === null || styleScore < STYLE_PASS_THRESHOLD) {
      console.warn(
        `[auto-pipeline] Style score ${styleScore ?? "n/a"} below ${STYLE_PASS_THRESHOLD} for idea ${ideaId} — leaving draft for manual handling`
      );
      return { ok: true, draftId: draft.id, styleScore, sentToTelegram: false };
    }

    // Step 5: send for approval — same status update + review creation +
    // Telegram notification as the manual Submit-for-Review flow.
    await updateDraft(draft.id, { status: "needs_review" });
    const { telegramSent } = await requestReviewForDraft(draft.id);

    return { ok: true, draftId: draft.id, styleScore, sentToTelegram: telegramSent };
  } catch (error) {
    console.error(`[auto-pipeline] Failed for idea ${ideaId}:`, error);
    return { ok: false, reason: "error" };
  }
}
