import { computeStyleBaseline, scoreDraftAgainstBaseline } from "./styleScoring";
import { STYLE_PASS_THRESHOLD } from "./styleThreshold";
import type { UnifiedStyleExample } from "./data";

// Re-exported so server-side consumers can import the threshold from here;
// canonical definition lives in ./styleThreshold (client-safe, no deps).
export { STYLE_PASS_THRESHOLD };

export async function runScoredGeneration<T>(
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
    if (scored.score < STYLE_PASS_THRESHOLD) {
      result = await attempt(scored.deltas);
      scored = scoreDraftAgainstBaseline(getBody(result), baseline);
    }
    styleScore = scored.score;
    styleDeltas = scored.deltas;
  }

  return { result, styleScore, styleDeltas };
}
