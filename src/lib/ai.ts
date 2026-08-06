import Anthropic from "@anthropic-ai/sdk";
import { Platform, Pillar } from "./types";
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
      const sourceLabel = ref.source === "link" ? "Link" : "File";
      const title = ref.title ? `\nTitle: ${ref.title}` : "";
      return `[Source: ${sourceLabel}]${title}\n${ref.body}`;
    })
    .join("\n\n");
  return `=== STYLE REFERENCE ===\n${examples}\n=== END STYLE REFERENCE ===`;
}

function styleInstruction(styleBlock: string): string {
  if (!styleBlock) return "";
  return (
    "\n\nBelow are style references from the creator's published work. " +
    "Analyze their TONE, RHYTHM, and STRUCTURE only. " +
    "Never copy, quote, or paraphrase their content, wording, or specific details. " +
    "They concern a DIFFERENT topic than the one you are asked to write; treat them as a different topic. " +
    "Your output must be entirely original text and must never reproduce any of the reference text.\n\n" +
    styleBlock
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

const HOOK_SYSTEM_PROMPT = `You write opening hooks for social/blog content.

RULES:
1. Each hook must reference a specific detail, claim, number, or tension that actually appears in the draft content provided.
2. Do NOT default to "Here's why X% of people miss out on..." or "Most people think X, but..." unless a real statistic or contradiction exists in the draft.
3. If the draft has no strong specific detail yet, base each hook on the single most concrete point available — even a small one — rather than inventing a generic template.
4. Match tone/length to the platform (Threads = punchy, 1–2 lines; Blog = can be longer).

Return ONLY a valid JSON array of 3 distinct hook strings, each grounded in the draft content provided. No numbering, no bullet markers, no extra text.`;

function parseHooks(raw: string): string[] {
  try {
    const parsed = parseJSONArray<string>(raw);
    if (parsed.length > 0) return parsed.map((h) => h.trim()).filter(Boolean);
  } catch {
    // fall through to line-based parsing for non-JSON model output
  }
  return raw
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length > 0);
}

export async function generateHooks(
  title: string,
  pillar: Pillar,
  platform: Platform,
  draftBody?: string
): Promise<string[]> {
  let grounding = draftBody || "";
  if (grounding.trim().length < 20) {
    grounding = await getQuickOutline(title);
  }

  const userPrompt = `Title: "${title}"
Platform: ${platform}
Pillar/audience: ${pillar}
Draft content:
${grounding}

Write 3 hooks, each based on a specific detail from the draft above.`;

  let raw = await complete(HOOK_SYSTEM_PROMPT, userPrompt);
  let hooks = parseHooks(raw);

  const generic = hooks.filter((h) => isGeneric(h));
  if (generic.length > 0) {
    console.warn(
      `[ai] isGeneric() fired on ${generic.length} of ${hooks.length} hooks for "${title}"`
    );
    raw = await complete(
      HOOK_SYSTEM_PROMPT,
      `${userPrompt}\n\nYour previous output was too generic. Be more specific and reference the actual draft content provided.`
    );
    hooks = parseHooks(raw);
  }

  const clean = hooks.filter((h) => !isGeneric(h));
  return clean.length > 0 ? clean : [grounding.trim().slice(0, 120)];
}

export async function generateDraft(
  idea: string,
  platform: Platform,
  pillar: Pillar,
  hook: string,
  styleReferences?: UnifiedStyleExample[]
): Promise<{ title: string; body: string; hook: string; outline: string }> {
  const styleBlock = buildStyleReferenceBlock(styleReferences);

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
    `Write the content now.`;

  const raw = await complete(system, user);

  const title = extractField(raw, "TITLE") || idea.slice(0, 80);
  const generatedHook = extractField(raw, "HOOK") || hook;
  const outline = extractField(raw, "OUTLINE") || "";

  return { title, body: extractBody(raw), hook: generatedHook, outline };
}

export async function repurposeDraft(
  body: string,
  fromPlatform: Platform,
  toPlatform: Platform,
  styleReferences?: UnifiedStyleExample[]
): Promise<{ title: string; body: string; hook: string }> {
  const styleBlock = buildStyleReferenceBlock(styleReferences);

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
    `Repurpose the content now.`;

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

async function getQuickOutline(title: string): Promise<string> {
  const system =
    "You are a content strategist. Your output must be concrete and specific, never generic.";
  const prompt = `Write 3 concrete bullet points (with specific facts, numbers, or claims — not generic statements) that could go into a piece of content titled "${title}". These will be used to ground an opening hook.`;
  return complete(system, prompt);
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
