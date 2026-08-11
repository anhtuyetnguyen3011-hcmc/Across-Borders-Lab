// Deterministic, non-LLM style scoring. Pure functions: no I/O, no external
// calls — safe to run inline and unit-test without mocking an API.

export interface StyleBaseline {
  avgSentenceLength: number;
  sentenceStddev: number;
  avgParagraphLength: number;
  emojiRate: number;
  pronounProfile: Record<string, number>;
  punctuationProfile: Record<string, number>;
}

export interface StyleScore {
  score: number;
  deltas: Record<string, number>;
}

export const STYLE_METRIC_KEYS = [
  "avgSentenceLength",
  "sentenceStddev",
  "avgParagraphLength",
  "emojiRate",
  "pronouns_mình",
  "pronouns_tôi",
  "pronouns_bạn",
  "pronouns_các_bạn",
  "punctuation_ellipsis",
  "punctuation_exclamation",
  "punctuation_question",
] as const;

const EMOJI_RE = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

export const STYLE_DELTA_LABELS: Record<string, string> = {
  avgSentenceLength: "Câu viết dài",
  sentenceStddev: "Độ dài câu biến thiên",
  avgParagraphLength: "Đoạn văn dài",
  emojiRate: "Emoji",
  "pronouns_mình": "Dùng “mình”",
  "pronouns_tôi": "Dùng “tôi”",
  "pronouns_bạn": "Dùng “bạn”",
  "pronouns_các_bạn": "Dùng “các bạn”",
  "punctuation_ellipsis": "Dùng dấu ba chấm",
  "punctuation_exclamation": "Dùng dấu chấm than",
  "punctuation_question": "Dùng dấu hỏi",
};

function words(text: string): string[] {
  return text.match(/[\p{L}\p{N}'’]+/gu) || [];
}

function countOccurrences(text: string, needle: RegExp): number {
  const matches = text.match(needle);
  return matches ? matches.length : 0;
}

function sentenceLengths(text: string): number[] {
  return text
    .split(/[.!?]+/)
    .map((part) => words(part).length)
    .filter((n) => n > 0);
}

function paragraphs(text: string): string[] {
  return text
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[], avg: number): number {
  if (values.length === 0) return 0;
  const variance = mean(values.map((v) => Math.pow(v - avg, 2)));
  return Math.sqrt(variance);
}

export function computeStyleBaseline(sources: { body: string }[]): StyleBaseline {
  const combined = sources.map((s) => s.body).join("\n\n");
  const metrics = extractMetrics(combined);
  return {
    avgSentenceLength: metrics.avgSentenceLength,
    sentenceStddev: metrics.sentenceStddev,
    avgParagraphLength: metrics.avgParagraphLength,
    emojiRate: metrics.emojiRate,
    pronounProfile: {
      mình: metrics["pronouns_mình"],
      tôi: metrics["pronouns_tôi"],
      bạn: metrics["pronouns_bạn"],
      "các bạn": metrics["pronouns_các_bạn"],
    },
    punctuationProfile: {
      ellipsis: metrics.punctuation_ellipsis,
      exclamation: metrics.punctuation_exclamation,
      question: metrics.punctuation_question,
    },
  };
}

interface DraftMetrics {
  avgSentenceLength: number;
  sentenceStddev: number;
  avgParagraphLength: number;
  emojiRate: number;
  "pronouns_mình": number;
  "pronouns_tôi": number;
  "pronouns_bạn": number;
  "pronouns_các_bạn": number;
  "punctuation_ellipsis": number;
  "punctuation_exclamation": number;
  "punctuation_question": number;
}

function extractMetrics(text: string): DraftMetrics {
  const wordCount = words(text).length;
  const perHundred = (count: number): number => (wordCount === 0 ? 0 : (count / wordCount) * 100);

  const sentenceLengthsList = sentenceLengths(text);
  const avgSentenceLength = mean(sentenceLengthsList);
  const sentenceStddev = stddev(sentenceLengthsList, avgSentenceLength);

  const paragraphList = paragraphs(text);
  const sentencesPerParagraph = paragraphList.map(
    (p) => countOccurrences(p, /[.!?]+/g) || (words(p).length > 0 ? 1 : 0)
  );
  const avgParagraphLength = mean(sentencesPerParagraph);

  return {
    avgSentenceLength,
    sentenceStddev,
    avgParagraphLength,
    emojiRate: perHundred(countOccurrences(text, EMOJI_RE)),
    "pronouns_mình": perHundred(countOccurrences(text, /\bmình\b/gi)),
    "pronouns_tôi": perHundred(countOccurrences(text, /\btôi\b/gi)),
    "pronouns_bạn": perHundred(countOccurrences(text, /\bbạn\b/gi)),
    "pronouns_các_bạn": perHundred(countOccurrences(text, /\bcác bạn\b/gi)),
    "punctuation_ellipsis": perHundred(countOccurrences(text, /\.\.\.|…/g)),
    "punctuation_exclamation": perHundred(countOccurrences(text, /!/g)),
    "punctuation_question": perHundred(countOccurrences(text, /\?/g)),
  };
}

function extractBaselineMetrics(baseline: StyleBaseline): Record<string, number> {
  return {
    avgSentenceLength: baseline.avgSentenceLength,
    sentenceStddev: baseline.sentenceStddev,
    avgParagraphLength: baseline.avgParagraphLength,
    emojiRate: baseline.emojiRate,
    "pronouns_mình": baseline.pronounProfile["mình"],
    "pronouns_tôi": baseline.pronounProfile["tôi"],
    "pronouns_bạn": baseline.pronounProfile["bạn"],
    "pronouns_các_bạn": baseline.pronounProfile["các bạn"],
    "punctuation_ellipsis": baseline.punctuationProfile["ellipsis"],
    "punctuation_exclamation": baseline.punctuationProfile["exclamation"],
    "punctuation_question": baseline.punctuationProfile["question"],
  };
}

function signedDeltaPercent(draft: number, baseline: number): number {
  if (baseline === 0) return draft === 0 ? 0 : 200;
  const delta = ((draft - baseline) / baseline) * 100;
  return Math.max(-200, Math.min(200, delta));
}

export function scoreDraftAgainstBaseline(
  draftText: string,
  baseline: StyleBaseline
): StyleScore {
  const draftMetrics = extractMetrics(draftText);
  const baselineMetrics = extractBaselineMetrics(baseline);

  const deltas: Record<string, number> = {};
  let total = 0;

  for (const key of STYLE_METRIC_KEYS) {
    const delta = signedDeltaPercent(draftMetrics[key], baselineMetrics[key]);
    deltas[key] = Math.round(delta * 10) / 10;
    total += Math.max(0, 100 - Math.abs(delta));
  }

  const score = Math.max(0, Math.min(100, Math.round(total / STYLE_METRIC_KEYS.length)));
  return { score, deltas };
}

export function describeLargestDelta(deltas: Record<string, number>): string {
  const entries = Object.entries(deltas).filter(([, v]) => Math.abs(v) >= 5);
  if (entries.length === 0) return "";
  const [key, value] = [...entries].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  const direction = value >= 0 ? "nhiều hơn" : "ít hơn";
  return `${STYLE_DELTA_LABELS[key] || key} ${direction} văn phong thường của bạn ~${Math.round(Math.abs(value))}%`;
}
