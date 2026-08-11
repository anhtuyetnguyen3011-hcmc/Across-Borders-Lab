import Anthropic from "@anthropic-ai/sdk";
import { Platform, Pillar, StyleProfile, StyleProfileTraits } from "./types";
import { UnifiedStyleExample } from "./data";

const GENERIC_PATTERNS = [
  /beginner'?s guide to/i,
  /matters more than you think/i,
  /\d+%\s*of people (miss|don'?t|think)/i,
  /everything you need to know/i,
  /ultimate guide to/i,
];

function isGeneric(text: string): boolean {
  return GENERIC_PATTERNS.some((p) => p.test(text));
}

const TREND_SIGNAL_TTL_MS = 60 * 60 * 1000;
const trendSignalCache = new Map<string, { expiresAt: number; signals: string[] }>();

export interface AIConfig {
  model: string;
  provider: string;
  temperature: number;
}

const defaultConfig: AIConfig = {
  model: "claude-sonnet-4-6",
  provider: "anthropic",
  temperature: 0.7,
};

let config = { ...defaultConfig };

export function getAIConfig(): AIConfig {
  return { ...config };
}

export function setAIConfig(newConfig: Partial<AIConfig>): void {
  config = { ...config, ...newConfig };
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment to use AI generation."
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

async function complete(system: string, user: string): Promise<string> {
  try {
    const response = await getClient().messages.create({
      model: config.model,
      max_tokens: 4096,
      temperature: config.temperature,
      system,
      messages: [{ role: "user", content: user }],
    });
    return response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("\n")
      .trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`AI generation failed (${config.model}): ${message}`);
  }
}

function buildStyleReferenceBlock(styleReferences?: UnifiedStyleExample[]): string {
  if (!styleReferences || styleReferences.length === 0) return "";
  const examples = styleReferences
    .slice(0, 5)
    .map((ref) => {
      const sourceLabel = ref.source === "link" ? "Link" : ref.source === "draft" ? "Draft" : "File";
      const title = ref.title ? `\nTitle: ${ref.title}` : "";
      return `[Source: ${sourceLabel}]${title}\n${ref.body}`;
    })
    .join("\n\n");
  return `=== STYLE REFERENCE ===\n${examples}\n=== END STYLE REFERENCE ===`;
}

const FEW_SHOT_CAP = 3;
const STOPWORDS = new Set([
  "the","a","an","and","or","but","for","to","in","on","of","with","at","by","from",
  "is","are","was","were","be","been","do","does","did","i","you","we","they","he",
  "she","it","this","that","these","those","your","my","our","their",
  "của","và","là","cho","trong","các","những","một","không","với","có","sẽ","được",
  "từ","đến","về","bạn","mình","tôi","theo","khi","nếu","như","rằng","vì","nên","đang",
]);

function tokenizeBrief(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(
    (w) => w.length > 2 && !STOPWORDS.has(w)
  );
}

function pickTopicNearest(
  brief: string,
  sources: UnifiedStyleExample[],
  pillar?: Pillar,
  max: number = FEW_SHOT_CAP
): UnifiedStyleExample[] {
  const tokens = tokenizeBrief(brief);
  const scored = sources.map((source) => {
    const haystack = `${source.body} ${source.title || ""}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) score += 1;
    }
    if (pillar && source.pillar === pillar) score += 3;
    return { source, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.source);
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}...`;
}

function buildStyleProfileGuidance(
  brief: string,
  styleReferences: UnifiedStyleExample[],
  styleProfile: StyleProfileTraits | null | undefined,
  pillar?: Pillar
): string {
  const parts: string[] = [];

  if (styleProfile) {
    const t = styleProfile;
    parts.push(
      "=== STYLE PROFILE (five traits derived from the creator's past work) ===" +
        `\nHOOK: ${t.hook.summary}\n  Anchor: “${t.hook.anchorQuote}”` +
        `\nRHYTHM: ${t.rhythm.summary}\n  Anchor: “${t.rhythm.anchorQuote}”` +
        `\nTONE: ${t.tone.summary}\n  Anchor: “${t.tone.anchorQuote}”` +
        `\nPOINT OF VIEW: ${t.pov.summary}\n  Anchor: “${t.pov.anchorQuote}”` +
        `\nCLOSING: ${t.closing.summary}\n  Anchor: “${t.closing.anchorQuote}”` +
        "\n=== END STYLE PROFILE ==="
    );
  }

  const examples = pickTopicNearest(brief, styleReferences, pillar, FEW_SHOT_CAP);
  if (examples.length > 0) {
    parts.push(
      "=== STYLE EXAMPLES (topic-nearest, read the rhythm only) ===" +
        examples
          .map((ref) => {
            const sourceLabel =
              ref.source === "link" ? "Link" : ref.source === "draft" ? "Draft" : "File";
            const title = ref.title ? `Title: ${ref.title}\n` : "";
            return `[Source: ${sourceLabel}]\n${title}${truncate(ref.body, 700)}`;
          })
          .join("\n\n") +
        "\n=== END STYLE EXAMPLES ==="
    );
  }

  return parts.join("\n\n");
}

function styleInstruction(styleBlock: string): string {
  if (!styleBlock) return "";
  return (
    "\n\nBelow are style references and a derived style profile from the creator's published work. " +
    "Match the TONE, RHYTHM, VOICE, and STRUCTURE only. " +
    "Never copy, quote, or paraphrase their content, wording, or specific details. " +
    "They concern a DIFFERENT topic than the one you are asked to write; treat them as a different topic. " +
    "Your output must be entirely original text and must never reproduce any of the reference text.\n\n" +
    styleBlock
  );
}

function buildStyleCorrectionHint(corrections?: Record<string, number>): string {
  if (!corrections) return "";
  const entries = Object.entries(corrections)
    .filter(([, v]) => Math.abs(v) >= 5)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(
      ([key, value]) =>
        `${key} ${value > 0 ? "+" : ""}${Math.round(value)}% (baseline: ${key.replace(/_/g, " ")})`
    );
  if (entries.length === 0) return "";
  return (
    "\n\nStyle match correction: your previous attempt drifted from the creator's usual style. " +
    "Adjust the following metrics to match their baseline: " +
    entries.join("; ") +
    "."
  );
}

function extractField(raw: string, label: string): string {
  const match = raw.match(new RegExp(`^${label}:\\s*(.+?)\\s*$`, "m"));
  return match ? match[1].trim() : "";
}

function extractBody(raw: string): string {
  const bodyIndex = raw.search(/^BODY:\s*/m);
  if (bodyIndex === -1) return raw.trim();
  return raw.slice(bodyIndex).replace(/^BODY:\s*/m, "").trim();
}

function parseJSONArray<T>(raw: string): T[] {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  const slice = start !== -1 && end > start ? candidate.slice(start, end + 1) : candidate;
  const parsed = JSON.parse(slice);
  if (!Array.isArray(parsed)) throw new Error("LLM response was not a JSON array");
  return parsed as T[];
}

export async function expandIdea(
  ideaText: string,
  pillar: Pillar,
  platform: Platform
): Promise<string[]> {
  const variants: Record<Pillar, string[]> = {
    education: [
      `${ideaText} - a detailed step-by-step guide`,
      `${ideaText} - essential tools and resources roundup`,
      `${ideaText} - a specific case study`,
      `${ideaText} - comparing different approaches`,
      `${ideaText} - infographic / quick summary`,
    ],
    career: [
      `${ideaText} - a personal experience perspective`,
      `${ideaText} - lessons learned after 1 year of trying`,
      `${ideaText} - 5 common mistakes and how to avoid them`,
      `${ideaText} - a contrarian perspective`,
      `${ideaText} - expectations vs reality`,
    ],
    lifestyle: [
      `${ideaText} - a realistic daily routine`,
      `${ideaText} - an honest review after 3 months`,
      `${ideaText} - optimization tips for busy people`,
      `${ideaText} - work-life balance insights`,
      `${ideaText} - is the investment worth it`,
    ],
  };

  await simulateDelay(800);
  return (variants[pillar] || variants.education).slice(0, 4);
}

const HOOK_ARCHETYPES = {
  confession: "Mở bằng một trải nghiệm/sai lầm cá nhân đã qua",
  contrarian: "Mở bằng việc bác bỏ một niềm tin phổ biến",
  dataShock: "Mở bằng một con số/sự thật gây bất ngờ",
  directQuestion: "Mở bằng một câu hỏi trực tiếp cho người đọc",
  storyInProgress: "Mở giữa một tình huống/câu chuyện đang diễn ra",
} as const;

type HookArchetype = keyof typeof HOOK_ARCHETYPES;

const HOOK_SYSTEM_PROMPT = `You are a Vietnamese content writer. You write opening hooks in the author's personal voice as specified in the prompt. Reply with only the requested hook text.`;

const ARCHETYPE_KEYWORDS: Record<HookArchetype, string[]> = {
  confession: ["cá nhân", "trải nghiệm", "sai lầm", "bản thân", "từng", "kinh nghiệm", "kể"],
  contrarian: ["phản biện", "bác bỏ", "niềm tin", "không phải", "thực ra", "ngược", "hiểu lầm"],
  dataShock: ["số liệu", "con số", "phần trăm", "thống kê", "dữ liệu", "tỷ lệ"],
  directQuestion: ["câu hỏi", "hỏi", "bạn có", "bạn đã"],
  storyInProgress: ["câu chuyện", "đang diễn ra", "hôm nay", "vừa", "lúc này"],
};

function matchArchetypeToProfileHook(hookSummary: string, all: HookArchetype[]): HookArchetype | null {
  const text = hookSummary.toLowerCase();
  let best: HookArchetype | null = null;
  let bestScore = 0;
  for (const key of all) {
    let score = 0;
    for (const kw of ARCHETYPE_KEYWORDS[key]) {
      if (text.includes(kw)) score += kw.length >= 3 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }
  return bestScore > 0 ? best : null;
}

function pickThreeArchetypes(
  topic: string,
  styleProfile: StyleProfile | null,
  topPerformingHookArchetypes?: HookArchetype[]
): HookArchetype[] {
  const all = Object.keys(HOOK_ARCHETYPES) as HookArchetype[];

  // Priority 1: archetypes that have historically performed well for this account
  // (derived from Analytics top-posts hook classification, if available).
  const proven = (topPerformingHookArchetypes ?? []).filter((a) => all.includes(a));

  // Priority 2: whatever the Style Profile's `hook` trait most resembles
  // (simple keyword match against archetype descriptions is enough — no embeddings needed).
  const profileMatch = styleProfile
    ? matchArchetypeToProfileHook(styleProfile.traits.hook.summary, all)
    : null;

  const picked = new Set<HookArchetype>();
  for (const a of proven) if (picked.size < 3) picked.add(a);
  if (profileMatch && picked.size < 3) picked.add(profileMatch);
  for (const a of all) if (picked.size < 3) picked.add(a); // fill remaining slots

  return Array.from(picked).slice(0, 3);
}

function buildHookPrompt(
  topic: string,
  archetypeKey: HookArchetype,
  styleProfile: StyleProfile | null
): string {
  if (!styleProfile) {
    return `
Viết 1 câu hook (mở đầu bài viết) về chủ đề sau: "${topic}"
Dạng hook: ${HOOK_ARCHETYPES[archetypeKey]}
Chỉ trả về câu hook, không giải thích thêm, không đặt trong dấu ngoặc kép.
    `.trim();
  }

  const { pov, tone } = styleProfile.traits;

  return `
Bạn đang viết một câu hook (mở đầu bài viết) về chủ đề sau:
"${topic}"

Dạng hook cần viết: ${HOOK_ARCHETYPES[archetypeKey]}

QUY TẮC BẮT BUỘC — đây là giọng văn của tác giả, không được vi phạm dù dạng hook nào:
- Xưng hô: ${pov.summary}
  Ví dụ đúng giọng: "${pov.anchorQuote}"
- Giọng điệu: ${tone.summary}

QUAN TRỌNG: Kể cả khi hook thuộc dạng số liệu/dữ kiện (data shock) hoặc dạng
phản biện (contrarian), câu chữ vẫn phải đi qua trải nghiệm hoặc góc nhìn cá
nhân của tác giả — không được viết như một câu trích dẫn nghiên cứu hay tường
thuật khách quan kiểu "X% người nói rằng...". Số liệu là chất liệu, không phải
người kể chuyện.

Sai (giọng báo cáo, không xưng đúng):
"70% nhân viên MNC nói rằng việc bạn quen biết ai quan trọng hơn năng lực."

Đúng (cùng số liệu, đúng giọng cá nhân):
"Mình từng nghĩ làm tốt là đủ, cho đến khi thấy 70% đồng nghiệp thăng chức
nhờ quen biết chứ không phải năng lực."

Viết 1 câu hook duy nhất (1-2 câu), theo đúng dạng "${archetypeKey}" và đúng
quy tắc giọng văn ở trên. Chỉ trả về câu hook, không giải thích thêm, không
đặt trong dấu ngoặc kép.
  `.trim();
}

function cleanHook(text: string): string {
  return text
    .replace(/^["“”'\u201c\u201d]+|["“”'\u201c\u201d]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateHookOptions(
  topic: string,
  styleProfile: StyleProfile | null
): Promise<{ archetype: HookArchetype; text: string }[]> {
  const archetypes = pickThreeArchetypes(topic, styleProfile);

  return Promise.all(
    archetypes.map(async (key) => {
      const prompt = buildHookPrompt(topic, key, styleProfile);
      const text = cleanHook(await complete(HOOK_SYSTEM_PROMPT, prompt));
      return { archetype: key, text };
    })
  );
}

export async function generateDraft(
  idea: string,
  platform: Platform,
  pillar: Pillar,
  hook: string,
  styleReferences?: UnifiedStyleExample[],
  styleProfile?: StyleProfileTraits | null,
  styleCorrections?: Record<string, number>
): Promise<{ title: string; body: string; hook: string; outline: string }> {
  const styleBlock = styleProfile
    ? buildStyleProfileGuidance(idea, styleReferences || [], styleProfile, pillar)
    : buildStyleReferenceBlock(styleReferences);

  const system =
    `You are an expert content writer. Write original, engaging ${
      platform === "threads" ? "Threads post" : "website article"
    } content for the requested topic.` +
    styleInstruction(styleBlock) +
    "\n\nRespond with EXACTLY this structure (no other text):\n" +
    "TITLE: <title>\n" +
    "HOOK: <opening hook line>\n" +
    "OUTLINE: <brief outline of the structure>\n" +
    "BODY:\n<the full content>";

  const formatInstruction =
    platform === "threads"
      ? "Format the body as 4 numbered points using emoji markers (1️⃣, 2️⃣, 3️⃣, 4️⃣), each followed by a short punchy explanation, ending with a conclusion or action item. Keep it scannable and conversational."
      : "Format the body as a markdown article: a ## Background section, three ### subsections, and a ## Conclusion with a call to action. Write in an authoritative, editorial voice.";

  const user =
    `Topic: ${idea}\nHook: ${hook}\nPlatform: ${platform}\nPillar: ${pillar}\n\n` +
    `Formatting instructions:\n${formatInstruction}\n\n` +
    `Write the content now.` +
    buildStyleCorrectionHint(styleCorrections);

  const raw = await complete(system, user);

  const title = extractField(raw, "TITLE") || idea.slice(0, 80);
  const generatedHook = extractField(raw, "HOOK") || hook;
  const outline = extractField(raw, "OUTLINE") || "";

  return { title, body: extractBody(raw), hook: generatedHook, outline };
}

function parseJSONObject<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const slice = start !== -1 && end > start ? candidate.slice(start, end + 1) : candidate;
  const parsed = JSON.parse(slice);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("LLM response was not a JSON object");
  }
  return parsed as T;
}

function truncateToWords(text: string, max: number): string {
  return text.split(/\s+/).filter(Boolean).slice(0, max).join(" ");
}

const STYLE_PROFILE_DIMENSIONS = ["hook", "rhythm", "tone", "pov", "closing"] as const;

const STYLE_PROFILE_SYSTEM_PROMPT = `You are a writing style analyst. Given a set of the creator's past writing samples, extract their consistent stylistic traits.

Return ONLY a valid JSON object with EXACTLY this shape (no prose, no code fences):
{
  "hook":    { "summary": "string", "anchorQuote": "string", "sourceId": "string" },
  "rhythm":  { "summary": "string", "anchorQuote": "string", "sourceId": "string" },
  "tone":    { "summary": "string", "anchorQuote": "string", "sourceId": "string" },
  "pov":     { "summary": "string", "anchorQuote": "string", "sourceId": "string" },
  "closing": { "summary": "string", "anchorQuote": "string", "sourceId": "string" }
}

Rules:
- "summary": 1-2 sentences, concrete and specific (mention pacing, sentence length, pronouns, sentence openers, structure).
- "anchorQuote": a verbatim excerpt of at most 20 words copied EXACTLY from one of the provided sources.
- "sourceId": must be one of the provided source ids.
- "pov": the point of view / person used (mình/tôi/bạn, you-form, we-form, etc.).`;

function validateStyleProfile(raw: unknown, sources: UnifiedStyleExample[]): StyleProfileTraits {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Style profile was not an object");
  }
  const obj = raw as Record<string, unknown>;
  const sourceById = new Map(sources.map((s) => [s.id, s.body]));

  const traits = {} as StyleProfileTraits;
  for (const dim of STYLE_PROFILE_DIMENSIONS) {
    const entry = obj[dim];
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`Style profile missing trait: ${dim}`);
    }
    const { summary, anchorQuote, sourceId } = entry as Record<string, unknown>;
    if (typeof summary !== "string" || !summary.trim()) {
      throw new Error(`Style profile trait "${dim}" missing summary`);
    }
    if (typeof sourceId !== "string" || !sourceId.trim()) {
      throw new Error(`Style profile trait "${dim}" missing sourceId`);
    }
    let quote = typeof anchorQuote === "string" ? anchorQuote.trim() : "";
    if (!quote) {
      throw new Error(`Style profile trait "${dim}" missing anchorQuote`);
    }
    const sourceBody = sourceById.get(sourceId) || "";
    if (!sourceBody.toLowerCase().includes(quote.toLowerCase())) {
      const fallback = truncateToWords(sourceBody, 20);
      if (!fallback) throw new Error(`Style profile trait "${dim}" source not found`);
      quote = fallback;
    }
    traits[dim] = {
      summary: summary.trim(),
      anchorQuote: truncateToWords(quote, 20),
      sourceId,
    };
  }
  return traits;
}

export async function analyzeStyleProfile(
  sources: UnifiedStyleExample[]
): Promise<StyleProfileTraits> {
  const sourcesBlock = sources
    .map((s, i) => `[SOURCE ${i + 1} id=${s.id}]\n${truncate(s.body, 2000)}`)
    .join("\n\n");
  const user = `Analyze the following ${sources.length} writing sample(s) and extract the style profile.\n\n${sourcesBlock}`;
  const raw = await complete(STYLE_PROFILE_SYSTEM_PROMPT, user);
  return validateStyleProfile(parseJSONObject<StyleProfileTraits>(raw), sources);
}

export async function repurposeDraft(
  body: string,
  fromPlatform: Platform,
  toPlatform: Platform,
  styleReferences?: UnifiedStyleExample[],
  styleProfile?: StyleProfileTraits | null,
  styleCorrections?: Record<string, number>
): Promise<{ title: string; body: string; hook: string }> {
  const styleBlock = styleProfile
    ? buildStyleProfileGuidance(body, styleReferences || [], styleProfile)
    : buildStyleReferenceBlock(styleReferences);

  const system =
    `You are an expert content repurposer. Rewrite the source content into a ${
      toPlatform === "threads" ? "Threads post" : "website article"
    }, preserving the core meaning, value, and insights while adapting the format.` +
    styleInstruction(styleBlock) +
    "\n\nRespond with EXACTLY this structure (no other text):\n" +
    "TITLE: <title>\n" +
    "HOOK: <opening hook line>\n" +
    "BODY:\n<the full rewritten content>";

  const formatInstruction =
    toPlatform === "threads"
      ? "Format the body as 3-4 numbered points using emoji markers (1️⃣, 2️⃣, 3️⃣), each followed by a short punchy explanation, ending with an action item."
      : "Format the body as a markdown article with ## sections and ### subsections, expanding each point with more depth and context.";

  const user =
    `Source content (originally for ${fromPlatform}):\n${body}\n\n` +
    `Target platform: ${toPlatform}\n\n` +
    `Formatting instructions:\n${formatInstruction}\n\n` +
    `Repurpose the content now.` +
    buildStyleCorrectionHint(styleCorrections);

  const raw = await complete(system, user);

  const title = extractField(raw, "TITLE") || "Repurposed content";
  const hook = extractField(raw, "HOOK") || body.slice(0, 120);

  return { title, body: extractBody(raw), hook };
}

export async function generateAIReviewNotes(
  title: string,
  body: string,
  platform: Platform
): Promise<string[]> {
  const notes: string[] = [];
  if (body.length < 200) notes.push("Content is too short, consider adding more detail");
  if (title.length > 80) notes.push("Title is too long, consider shortening for web");

  const system =
    "You are an expert content editor. Review the draft and flag genuine, specific issues " +
    "you can support from the text. Examples: the hook resembles a common/overused pattern; " +
    "the tone drifts from a consistent voice; a claim lacks a concrete example or evidence; " +
    "weak structure; formatting problems for the target platform. " +
    "Do not invent issues. Return one issue per line, each starting with '- '. " +
    "If the draft has no meaningful issues, return exactly:\n- No significant issues detected";

  const user = `Title: ${title}\nPlatform: ${platform}\n\nBody:\n${body}`;

  const raw = await complete(system, user);

  const aiNotes = raw
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^no significant issues detected$/i.test(line));

  return notes.length + aiNotes.length > 0 ? [...notes, ...aiNotes] : ["No significant issues detected"];
}

export interface TrendingAngle {
  title: string;
  reason: string;
  pillar: string;
  based_on_signal?: string;
}

const IDEAS_SYSTEM_PROMPT = `You are a content strategist generating specific, non-generic content ideas.

RULES:
1. Every idea must reference a specific angle, sub-topic, tension, or fact from the trend data provided — not just restate the keyword.
2. NEVER use these generic templates: "The Beginner's Guide to X", "Why X Matters More Than You Think", "X: Everything You Need to Know", "The Ultimate Guide to X".
3. Each title must be topic-specific enough that swapping in a different topic keyword would make the title nonsensical.
4. Ground each idea in one of the provided trend signals.

Return ONLY a valid JSON array in this exact format:
[
  {
    "category": "Education | Career | Lifestyle",
    "title": "specific, concrete title",
    "reason": "one sentence on why this angle will perform, referencing the specific signal",
    "based_on_signal": "which trend signal this came from"
  }
]`;

function mapCategoryToPillar(category: string): string {
  const c = (category || "").toLowerCase();
  if (c.includes("career")) return "career";
  if (c.includes("lifestyle")) return "lifestyle";
  return "education";
}

interface IdeaSignalGrounding {
  category?: string;
  title?: string;
  reason?: string;
  based_on_signal?: string;
}

function parseIdeas(raw: string): TrendingAngle[] {
  return parseJSONArray<IdeaSignalGrounding>(raw)
    .filter((i) => i && typeof i.title === "string" && i.title.trim().length > 0)
    .map((i) => ({
      title: i.title!.trim(),
      reason: (i.reason || "").trim(),
      pillar: mapCategoryToPillar(i.category || ""),
      based_on_signal: (i.based_on_signal || "").trim(),
    }));
}

async function getSubAngles(topic: string): Promise<string[]> {
  const key = topic.trim().toLowerCase();
  const cached = trendSignalCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.signals;

  const system =
    "You are a research analyst. Your answers must be concrete and specific, never generic.";
  const prompt = `List 6 specific, concrete sub-topics, controversies, or recent shifts related to "${topic}" that a real expert would know about. Be specific — include numbers, named trends, or specific audience segments. No generic statements.\n\nReturn ONLY a valid JSON array of strings.`;

  const raw = await complete(system, prompt);
  const signals = parseJSONArray<string>(raw)
    .map((s) => s.trim())
    .filter(Boolean);

  trendSignalCache.set(key, { expiresAt: Date.now() + TREND_SIGNAL_TTL_MS, signals });
  return signals;
}

export async function getAISuggestions(topic: string): Promise<TrendingAngle[]> {
  const signals = await getSubAngles(topic);

  const userPrompt = `Topic: "${topic}"

Real trend signals (recent searches, related questions, discussions):
${signals.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Generate 5 content ideas grounded in the specific signals above.`;

  let raw = await complete(IDEAS_SYSTEM_PROMPT, userPrompt);
  let ideas = parseIdeas(raw);

  const genericTitles = ideas.filter((i) => isGeneric(i.title));
  if (genericTitles.length > 0) {
    console.warn(
      `[ai] isGeneric() fired on ${genericTitles.length} of ${ideas.length} suggestions for "${topic}"`
    );
    raw = await complete(
      IDEAS_SYSTEM_PROMPT,
      `${userPrompt}\n\nYour previous output was too generic. Be more specific and reference the actual data provided.`
    );
    ideas = parseIdeas(raw);
  }

  return ideas.filter((i) => !isGeneric(i.title));
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
