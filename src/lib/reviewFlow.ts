import { addReview, getDraft, getReviewByDraftId } from "./data";
import { isTelegramConfigured, sendReviewNotification } from "./telegram";
import type { ReviewItem } from "./types";

// Exact sequence the manual "Submit for Review" flow performs via
// POST /api/reviews: create a pending review (or reuse the existing one)
// and, when Telegram is configured, send the approval notification.
export interface ReviewRequestResult {
  review: ReviewItem;
  telegramSent: boolean;
}

export async function requestReviewForDraft(
  draftId: string,
  aiRiskNotes: string[] = []
): Promise<ReviewRequestResult> {
  const existing = await getReviewByDraftId(draftId);
  if (existing) {
    return { review: existing, telegramSent: false };
  }

  const review = await addReview({
    draftId,
    status: "pending",
    aiRiskNotes,
    reviewerComments: "",
  });

  let telegramSent = false;
  if (isTelegramConfigured() && review.status === "pending") {
    const draft = await getDraft(draftId);
    if (draft) {
      telegramSent = await sendReviewNotification(draft, review);
    }
  }

  return { review, telegramSent };
}
