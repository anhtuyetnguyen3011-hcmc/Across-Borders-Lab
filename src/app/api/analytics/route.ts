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

    const topDraft = (await getDraft(topPost.title.replace("Post ", ""))) || 
      (await getDraft(topPost.title));

    const styleRefs = await getUnifiedStyleReferences();
    const platform = topPost.platform as "threads" | "website";
    const pillar = topPost.pillar as Pillar;

    const seedText = topDraft
      ? `Mirror this top-performing post's angle, hook style, and structure:\nTitle: ${topDraft.title}\nHook: ${topDraft.hook}\nBody preview: ${topDraft.body.slice(0, 300)}...\nMetrics: ${topPost.views} views, ${topPost.engagementRate}% engagement`
      : `Create content similar to the top-performing post: "${topPost.title}" with ${topPost.views} views and ${topPost.engagementRate}% engagement on ${topPost.platform}`;

    const aiResult = await generateDraft(
      seedText,
      platform,
      pillar,
      `Góc tương tự: "${topPost.title.slice(0, 50)}..."`,
      styleRefs
    );

    const idea = await addIdea({
      text: `Tạo nội dung tương tự bài hiệu quả nhất: ${topPost.title}`,
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
