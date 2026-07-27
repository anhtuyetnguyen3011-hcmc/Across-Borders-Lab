import { Platform, Pillar } from "./types";
import { UnifiedStyleExample } from "./data";

export interface AIConfig {
  model: string;
  provider: string;
  temperature: number;
}

const defaultConfig: AIConfig = {
  model: "gpt-4o",
  provider: "openai",
  temperature: 0.7,
};

let config = { ...defaultConfig };

export function getAIConfig(): AIConfig {
  return { ...config };
}

export function setAIConfig(newConfig: Partial<AIConfig>): void {
  config = { ...config, ...newConfig };
}

export async function expandIdea(
  ideaText: string,
  pillar: Pillar,
  platform: Platform
): Promise<string[]> {
  const variants: Record<Pillar, string[]> = {
    kinh_nghiem: [
      `${ideaText} - a personal experience perspective`,
      `${ideaText} - lessons learned after 1 year of trying`,
      `${ideaText} - 5 common mistakes and how to avoid them`,
      `${ideaText} - a beginner's checklist`,
      `${ideaText} - expectations vs reality`,
    ],
    goc_nhin: [
      `${ideaText} - why most people get this wrong`,
      `${ideaText} - a contrarian perspective`,
      `${ideaText} - a deeper analysis of this issue`,
      `${ideaText} - connecting to current trends`,
      `${ideaText} - the story behind the truth`,
    ],
    kien_thuc: [
      `${ideaText} - a detailed step-by-step guide`,
      `${ideaText} - essential tools and resources roundup`,
      `${ideaText} - a specific case study`,
      `${ideaText} - comparing different approaches`,
      `${ideaText} - infographic / quick summary`,
    ],
    loi_song: [
      `${ideaText} - a realistic daily routine`,
      `${ideaText} - an honest review after 3 months`,
      `${ideaText} - optimization tips for busy people`,
      `${ideaText} - work-life balance insights`,
      `${ideaText} - is the investment worth it`,
    ],
  };

  await simulateDelay(800);
  return (variants[pillar] || variants.kinh_nghiem).slice(0, 4);
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
  await simulateDelay(1200);

  const styleExamples = styleReferences && styleReferences.length > 0
    ? styleReferences.slice(0, 5).map((ref) => {
        const sourceLabel = ref.source === "draft" ? `Draft (${ref.platform || "unknown"})` 
          : ref.source === "link" ? "Link"
          : "File";
        return `\n\n--- STYLE EXAMPLE (Source: ${sourceLabel}) ---\nTitle: ${ref.title}\nBody: ${ref.body.slice(0, 500)}...`;
      }).join("")
    : "";

  const stylePrompt = styleExamples
    ? `\n\nWrite in the same tone, sentence rhythm, and structure as these examples from the creator's published work:${styleExamples}\n\n--- END STYLE EXAMPLES ---\n\n`
    : "";

  if (platform === "threads") {
    return {
      title: idea.slice(0, 60),
      hook,
      body: `${hook}\n\n1️⃣ The first key point\n\nDetailed explanation of the first point with real-world examples.\n\n2️⃣ The second point you can't ignore\n\nAnalysis of why this matters to most people.\n\n3️⃣ The third point - insider tip\n\nShare knowledge that few people know about.\n\n4️⃣ Conclusion + Action item\n\nSummary and specific action suggestions.${stylePrompt}`,
      outline: "4 numbered points with hook and conclusion",
    };
  }

  return {
    title: idea.slice(0, 80),
    hook,
    body: `# ${idea}\n\n${hook}\n\n## Background\n\nIntroduce the issue and why it matters.\n\n## Detailed Analysis\n\n### Point 1\n\nIn-depth content...\n\n### Point 2\n\nIn-depth content...\n\n### Point 3\n\nIn-depth content...\n\n## Conclusion\n\nSummary and call to action.${stylePrompt}`,
    outline: "Introduction, 3 main sections, conclusion",
  };
}

export async function repurposeDraft(
  body: string,
  fromPlatform: Platform,
  toPlatform: Platform,
  styleReferences?: UnifiedStyleExample[]
): Promise<{ title: string; body: string; hook: string }> {
  await simulateDelay(900);

  const styleExamples = styleReferences && styleReferences.length > 0
    ? styleReferences.slice(0, 5).map((ref) => {
        const sourceLabel = ref.source === "draft" ? `Draft (${ref.platform || "unknown"})` 
          : ref.source === "link" ? "Link"
          : "File";
        return `\n\n--- STYLE EXAMPLE (Source: ${sourceLabel}) ---\nTitle: ${ref.title}\nBody: ${ref.body.slice(0, 500)}...`;
      }).join("")
    : "";

  const stylePrompt = styleExamples
    ? `\n\nWrite in the same tone, sentence rhythm, and structure as these examples from the creator's published work:${styleExamples}\n\n--- END STYLE EXAMPLES ---\n\n`
    : "";

  if (toPlatform === "threads") {
    return {
      title: "Repurposed from website",
      hook: "Key takeaways from an important article you need to read:",
      body: "1️⃣ Key point from the article\n\nSummary of the main content.\n\n2️⃣ The most important takeaway\n\nHighlight the insight.\n\n3️⃣ Action item\n\nYou can start implementing this today." + stylePrompt,
    };
  }

  return {
    title: "Expanded article from thread",
    hook: "This article expands on a viral thread I wrote.",
    body: `# Full Article\n\n${body}\n\n## Expansion\n\nDeeper analysis of each point.${stylePrompt}`,
  };
}

export async function generateAIReviewNotes(
  title: string,
  body: string,
  platform: Platform
): Promise<string[]> {
  await simulateDelay(500);

  const notes: string[] = [];
  if (body.length < 200) notes.push("Content is too short, consider adding more detail");
  if (!body.includes("1️⃣") && platform === "threads")
    notes.push("Consider using numbered list format for Threads");
  if (title.length > 80) notes.push("Title is too long, consider shortening for web");
  if (Math.random() > 0.5) notes.push("Hook may overlap with existing content");
  if (Math.random() > 0.6) notes.push("Tone may need adjustment to match brand voice");

  return notes.length > 0 ? notes : ["No significant issues detected"];
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
      { title: "How AI is Reshaping Content Creation in 2026", reason: "Rapid adoption of AI writing tools is changing creator workflows", pillar: "Knowledge" },
      { title: "The Human Edge: Why Authenticity Matters More Than Ever in the AI Era", reason: "Audiences are craving genuine human perspectives amid AI-generated noise", pillar: "Perspective" },
      { title: "My 3-Month Experiment Using Only AI Tools for Content", reason: "Hands-on experience reports are highly engaging and actionable", pillar: "Experience" },
      { title: "AI Tools That Actually Saved Me 10 Hours a Week", reason: "Productivity hacks with concrete results drive strong engagement", pillar: "Knowledge" },
      { title: "Balancing AI Efficiency with Creative Intuition", reason: "The debate around AI vs human creativity is trending across platforms", pillar: "Perspective" }
    );
  } else if (topicLower.includes("remote") || topicLower.includes("work from home") || topicLower.includes("digital nomad")) {
    angles.push(
      { title: "Remote Work 2.0: What Actually Works After 3 Years", reason: "Long-term remote workers are sharing refined, battle-tested setups", pillar: "Experience" },
      { title: "The Hidden Costs of Remote Work Nobody Talks About", reason: "Contrarian takes on popular trends consistently outperform", pillar: "Perspective" },
      { title: "Building a Productive Home Office for Under $500", reason: "Budget-friendly practical guides have broad appeal", pillar: "Knowledge" },
      { title: "How I Manage Work-Life Boundaries as a Full-Time Remote Worker", reason: "Work-life balance content resonates strongly with remote audiences", pillar: "Lifestyle" }
    );
  } else if (topicLower.includes("freelance") || topicLower.includes("freelancer") || topicLower.includes("independent")) {
    angles.push(
      { title: "Freelancing After Corporate: 5 Lessons I Learned the Hard Way", reason: "Career transition stories get high engagement from professionals", pillar: "Experience" },
      { title: "Why Most Freelancers Fail in Their First Year", reason: "Cautionary content with actionable advice drives saves and shares", pillar: "Knowledge" },
      { title: "Setting Your Freelance Rates: A No-Nonsense Guide", reason: "Pricing strategy is a perennial pain point for freelancers", pillar: "Knowledge" },
      { title: "The Burnout Cycle: Why Freelancers Need to Rethink Hustle", reason: "Mental health in independent work is an emerging conversation", pillar: "Perspective" }
    );
  } else if (topicLower.includes("content") || topicLower.includes("creator") || topicLower.includes("social media")) {
    angles.push(
      { title: "Content Strategy That Actually Works in 2026", reason: "Algorithm updates have shifted what works, creating demand for new strategies", pillar: "Knowledge" },
      { title: "From 0 to 10K Followers: What I Did Differently", reason: "Growth case studies with specific tactics perform consistently well", pillar: "Experience" },
      { title: "Quality vs Quantity: The Data Behind What Actually Works", reason: "Data-driven takes on content debates attract engagement from serious creators", pillar: "Perspective" },
      { title: "Repurposing Content: Turn 1 Idea Into 10 Pieces", reason: "Efficiency-focused content creation guides are in high demand", pillar: "Knowledge" }
    );
  } else {
    angles.push(
      { title: `The Beginner's Guide to ${topic}`, reason: "Foundational guides attract steady search and social traffic", pillar: "Knowledge" },
      { title: `Why ${topic} Matters More Than You Think`, reason: "Awareness-building content with a fresh angle drives discovery", pillar: "Perspective" },
      { title: `My Personal Journey With ${topic}`, reason: "First-person experience stories build trust and connection", pillar: "Experience" },
      { title: `5 Common Mistakes in ${topic} and How to Avoid Them`, reason: "Mistake-based content consistently outperforms generic advice", pillar: "Knowledge" },
      { title: `How ${topic} Fits Into a Balanced Lifestyle`, reason: "Connecting topics to lifestyle resonates with broader audiences", pillar: "Lifestyle" }
    );
  }

  return angles;
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
