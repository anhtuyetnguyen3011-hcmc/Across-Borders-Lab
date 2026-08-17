import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsSummary } from "@/lib/analytics";
import { addIdea, addDraft, getDraft, getUnifiedStyleReferences } from "@/lib/data";
import { generateDraft } from "@/lib/ai";
import { Pillar } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getAnalyticsSummary());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "mirror-top-post") {
    const summary = await getAnalyticsSummary();
    const topPost = summary.topPosts[0];

    if (!topPost) {
      return NextResponse.json({ error: "No top post found" }, { status: 400 });
    }

    const topDraft = await getDraft(topPost.draftId);

    const styleRefs = await getUnifiedStyleReferences();
    const platform = topPost.platform as "threads" | "website";
    const pillar = topPost.pillar as Pillar;

    const seedText = topDraft
      ? `Analyze this top-performing post's topic/theme and propose a NEW angle within the same theme.\n\nSeed post:\nTitle: ${topDraft.title}\nHook: ${topDraft.hook}\nBody preview: ${topDraft.body.slice(0, 500)}...\nPillar: ${pillar}\nPlatform: ${platform}\nMetrics: ${topPost.views} views, ${topPost.engagementRate}% engagement\n\nYour task: Identify the core topic/theme (e.g. "studying abroad", "freelancing tips") and write a fresh post with a new angle on that SAME theme. Do not copy the structure — propose something original that builds on what made the seed post successful.`
      : `Create a new post about ${pillar} content for ${platform}. Top post: "${topPost.title}" with ${topPost.views} views and ${topPost.engagementRate}% engagement. Propose a fresh angle inspired by this topic.`;

    const aiResult = await generateDraft(
      seedText,
      platform,
      pillar,
      topDraft?.hook?.slice(0, 100) || topPost.title,
      styleRefs
    );

    const idea = await addIdea({
      text: aiResult.title || `New ${pillar} post inspired by: ${topPost.title}`,
      source: "manual",
      pillar,
      platform,
    });

    const draft = await addDraft({
      ideaId: idea.id,
      platform,
      pillar,
      title: aiResult.title,
      hook: aiResult.hook,
      body: aiResult.body,
      outline: aiResult.outline,
    });

    return NextResponse.json({ idea, draft, topPost });
  }

  const summary = await getAnalyticsSummary();
  const bestPillar = summary.bestPillar.pillar;

  const ideas = [
    `Viết thread về ${bestPillar} - dựa trên hiệu suất cao nhất`,
    `Bài viết website mở rộng chủ đề ${bestPillar} đang viral`,
    `Repurpose nội dung top performing sang format mới`,
  ];

  const created = await Promise.all(
    ideas.map((text) =>
      addIdea({
        text,
        source: "manual",
        pillar: bestPillar,
        platform: "threads",
      })
    )
  );

  return NextResponse.json({ ideas: created });
}
