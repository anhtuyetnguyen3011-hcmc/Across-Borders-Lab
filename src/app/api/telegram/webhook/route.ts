import { NextRequest, NextResponse } from "next/server";
import { getReview, updateReview, getDraft, updateDraft, addScheduledPost, getScheduledPosts } from "@/lib/data";
import { sendApprovalConfirmation, isTelegramConfigured } from "@/lib/telegram";

interface TelegramCallbackQuery {
  id: string;
  data: string;
  message?: {
    chat: { id: number };
    text: string;
  };
}

interface TelegramUpdate {
  update_id: number;
  callback_query?: TelegramCallbackQuery;
  message?: {
    chat: { id: number };
    text: string;
    reply_to_message?: {
      text: string;
    };
  };
}

function getNextAvailableSlot(): Date {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour < 9) return new Date(now.setHours(8, 0, 0, 0));
  if (hour < 12) return new Date(now.setHours(12, 0, 0, 0));
  if (hour < 18) return new Date(now.setHours(18, 0, 0, 0));
  return new Date(now.setHours(20, 0, 0, 0));
}

export async function POST(req: NextRequest) {
  if (!isTelegramConfigured()) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 503 });
  }

  const body: TelegramUpdate = await req.json();

  if (body.callback_query) {
    const { data } = body.callback_query;
    
    if (data.startsWith("approve_")) {
      const reviewId = data.replace("approve_", "");
      const review = getReview(reviewId);
      
      if (review) {
        updateReview(reviewId, { status: "approved" });
        updateDraft(review.draftId, { status: "approved" });
        
        const scheduledTime = getNextAvailableSlot();
        addScheduledPost({
          draftId: review.draftId,
          platform: getDraft(review.draftId)?.platform || "threads",
          scheduledTime: scheduledTime.toISOString(),
          publishStatus: "queued",
        });
        
        await sendApprovalConfirmation(reviewId, true);
      }
    }
    
    if (data.startsWith("reject_")) {
      const reviewId = data.replace("reject_", "");
      const review = getReview(reviewId);
      
      if (review) {
        updateReview(reviewId, { status: "needs_edit", reviewerComments: "Revision requested via Telegram" });
        updateDraft(review.draftId, { status: "needs_edit" });
        
        await sendApprovalConfirmation(reviewId, false, "Revision requested");
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (body.message && body.message.text) {
    const text = body.message.text;
    
    if (text.startsWith("/start")) {
      const response = `🤖 Across Border Lab Bot

Available commands:
/status - View post status
/list - List posts awaiting review

You'll receive notifications with Approve/Request Edit buttons when new drafts are ready.`;

      const { sendTelegramMessage } = await import("@/lib/telegram");
      await sendTelegramMessage({
        text: response,
      }, String(body.message.chat.id));
    }
    
    if (text.startsWith("/status")) {
      const posts = getScheduledPosts();
      const queued = posts.filter((p) => p.publishStatus === "queued").length;
      const published = posts.filter((p) => p.publishStatus === "published").length;
      const failed = posts.filter((p) => p.publishStatus === "failed").length;

      const { sendTelegramMessage } = await import("@/lib/telegram");
      await sendTelegramMessage({
        text: `📊 Post Status:
• Queued: ${queued}
• Published: ${published}
• Failed: ${failed}`,
      }, String(body.message.chat.id));
    }
  }

  return NextResponse.json({ ok: true });
}
