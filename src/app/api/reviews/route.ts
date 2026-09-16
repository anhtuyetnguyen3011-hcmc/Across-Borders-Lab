import { NextRequest, NextResponse } from "next/server";
import { getReviews, updateReview } from "@/lib/data";
import { generateAIReviewNotes } from "@/lib/ai";
import { requestReviewForDraft } from "@/lib/reviewFlow";

export async function GET() {
  return NextResponse.json(await getReviews());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "aiReview") {
    try {
      const notes = await generateAIReviewNotes(body.title, body.body, body.platform);
      return NextResponse.json({ notes });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "AI review failed" },
        { status: 500 }
      );
    }
  }

  const { review } = await requestReviewForDraft(body.draftId, body.aiRiskNotes || []);
  return NextResponse.json(review);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const review = await updateReview(body.id, body);
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(review);
}
