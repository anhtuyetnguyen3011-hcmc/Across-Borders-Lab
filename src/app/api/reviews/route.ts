import { NextRequest, NextResponse } from "next/server";
import { getReviews, addReview, updateReview, getReviewByDraftId, getDraft } from "@/lib/data";
import { generateAIReviewNotes } from "@/lib/ai";
import { sendReviewNotification, isTelegramConfigured } from "@/lib/telegram";

export async function GET() {
  return NextResponse.json(getReviews());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "aiReview") {
    const notes = await generateAIReviewNotes(body.title, body.body, body.platform);
    return NextResponse.json({ notes });
  }

  const existing = getReviewByDraftId(body.draftId);
  if (existing) {
    return NextResponse.json(existing);
  }

  const review = addReview({
    draftId: body.draftId,
    status: "pending",
    aiRiskNotes: body.aiRiskNotes || [],
    reviewerComments: "",
  });

  if (isTelegramConfigured() && review.status === "pending") {
    const draft = getDraft(body.draftId);
    if (draft) {
      await sendReviewNotification(draft, review);
    }
  }

  return NextResponse.json(review);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const review = updateReview(body.id, body);
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(review);
}
