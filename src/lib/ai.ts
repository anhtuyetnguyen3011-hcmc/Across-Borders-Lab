import Anthropic from "@anthropic-ai/sdk";
import { Platform, Pillar } from "./types";
import { UnifiedStyleExample } from "./data";

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

export async function generateHooks(
  title: string,
  pillar: Pillar,
  platform: Platform
): Promise<string[]> {
  const length = platform === "threads" ? "short, punchy" : "longer, with context";

  await simulateDelay(600);
  return [
    `After 2 years of experience, I discovered something about "${title.slice(0, 40)}..."`,
    `Here's why 90% of people miss out on "${title.slice(0, 40)}..."`,
    `I tried it and the results were completely unexpected: "${title.slice(0, 40)}..."`,
  ];
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
}

export async function getTrendingAngles(topic: string): Promise<TrendingAngle[]> {
  await simulateDelay(1000);

  const topicLower = topic.toLowerCase();
  const angles: TrendingAngle[] = [];

  if (topicLower.includes("ai") || topicLower.includes("artificial") || topicLower.includes("machine learning")) {
    angles.push(
      { title: "How AI is Reshaping Content Creation in 2026", reason: "Rapid adoption of AI writing tools is changing creator workflows", pillar: "Education" },
      { title: "The Human Edge: Why Authenticity Matters More Than Ever in the AI Era", reason: "Audiences are craving genuine human perspectives amid AI-generated noise", pillar: "Education" },
      { title: "My 3-Month Experiment Using Only AI Tools for Content", reason: "Hands-on experience reports are highly engaging and actionable", pillar: "Career" },
      { title: "AI Tools That Actually Saved Me 10 Hours a Week", reason: "Productivity hacks with concrete results drive strong engagement", pillar: "Education" },
      { title: "Balancing AI Efficiency with Creative Intuition", reason: "The debate around AI vs human creativity is trending across platforms", pillar: "Education" }
    );
  } else if (topicLower.includes("remote") || topicLower.includes("work from home") || topicLower.includes("digital nomad")) {
    angles.push(
      { title: "Remote Work 2.0: What Actually Works After 3 Years", reason: "Long-term remote workers are sharing refined, battle-tested setups", pillar: "Career" },
      { title: "The Hidden Costs of Remote Work Nobody Talks About", reason: "Contrarian takes on popular trends consistently outperform", pillar: "Education" },
      { title: "Building a Productive Home Office for Under $500", reason: "Budget-friendly practical guides have broad appeal", pillar: "Education" },
      { title: "How I Manage Work-Life Boundaries as a Full-Time Remote Worker", reason: "Work-life balance content resonates strongly with remote audiences", pillar: "Lifestyle" }
    );
  } else if (topicLower.includes("freelance") || topicLower.includes("freelancer") || topicLower.includes("independent")) {
    angles.push(
      { title: "Freelancing After Corporate: 5 Lessons I Learned the Hard Way", reason: "Career transition stories get high engagement from professionals", pillar: "Career" },
      { title: "Why Most Freelancers Fail in Their First Year", reason: "Cautionary content with actionable advice drives saves and shares", pillar: "Education" },
      { title: "Setting Your Freelance Rates: A No-Nonsense Guide", reason: "Pricing strategy is a perennial pain point for freelancers", pillar: "Education" },
      { title: "The Burnout Cycle: Why Freelancers Need to Rethink Hustle", reason: "Mental health in independent work is an emerging conversation", pillar: "Career" }
    );
  } else if (topicLower.includes("content") || topicLower.includes("creator") || topicLower.includes("social media")) {
    angles.push(
      { title: "Content Strategy That Actually Works in 2026", reason: "Algorithm updates have shifted what works, creating demand for new strategies", pillar: "Education" },
      { title: "From 0 to 10K Followers: What I Did Differently", reason: "Growth case studies with specific tactics perform consistently well", pillar: "Career" },
      { title: "Quality vs Quantity: The Data Behind What Actually Works", reason: "Data-driven takes on content debates attract engagement from serious creators", pillar: "Education" },
      { title: "Repurposing Content: Turn 1 Idea Into 10 Pieces", reason: "Efficiency-focused content creation guides are in high demand", pillar: "Education" }
    );
  } else {
    angles.push(
      { title: `The Beginner's Guide to ${topic}`, reason: "Foundational guides attract steady search and social traffic", pillar: "Education" },
      { title: `Why ${topic} Matters More Than You Think`, reason: "Awareness-building content with a fresh angle drives discovery", pillar: "Education" },
      { title: `My Personal Journey With ${topic}`, reason: "First-person experience stories build trust and connection", pillar: "Career" },
      { title: `5 Common Mistakes in ${topic} and How to Avoid Them`, reason: "Mistake-based content consistently outperforms generic advice", pillar: "Education" },
      { title: `How ${topic} Fits Into a Balanced Lifestyle`, reason: "Connecting topics to lifestyle resonates with broader audiences", pillar: "Lifestyle" }
    );
  }

  return angles;
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
