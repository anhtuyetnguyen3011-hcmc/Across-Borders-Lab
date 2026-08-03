import { NextRequest, NextResponse } from "next/server";
import { getReview, updateReview, updateDraft, getScheduledPosts } from "@/lib/data";
import { sendApprovalConfirmation, isTelegramConfigured } from "@/lib/telegram";

interface TelegramCallbackQuery {
  id: string;
  data: string;
  from?: { id: number };
  inline_message_id?: string;
  message?: {
    chat: { id: number };
    text: string;
  };
}

async function logStep<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    const result = await fn();
    console.log(`[WEBHOOK-DEBUG] ${label} ->`, result ?? "(null/undefined)");
    return result;
  } catch (e) {
    console.error(`[WEBHOOK-DEBUG] ${label} ERROR ->`, e);
    throw e;
  }
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

export async function POST(req: NextRequest) {
  console.log("[WEBHOOK-DEBUG] POST received", JSON.stringify({
    configured: isTelegramConfigured(),
    contentType: req.headers.get("content-type"),
    userAgent: req.headers.get("user-agent"),
  }));

  if (!isTelegramConfigured()) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 503 });
  }

  const body: TelegramUpdate = await req.json();
  console.log("[WEBHOOK-DEBUG] body", JSON.stringify({
    update_id: body.update_id,
    has_callback_query: !!body.callback_query,
    has_message: !!body.message,
    message_text: body.message?.text,
  }));

  if (body.callback_query) {
    const { data } = body.callback_query;
    console.log("[WEBHOOK-DEBUG] callback_query", JSON.stringify({
      id: body.callback_query.id,
      data,
      from_id: body.callback_query.from?.id,
      inline_message_id: body.callback_query.inline_message_id,
      chat_id: body.callback_query.message?.chat?.id,
      message_text: body.callback_query.message?.text,
    }));

    if (data.startsWith("approve_")) {
      const reviewId = data.replace("approve_", "");
      console.log("[WEBHOOK-DEBUG] approve flow, extracted reviewId =", reviewId);
      const review = await logStep("getReview(approve)", () => getReview(reviewId));
      
      if (review) {
        await logStep("updateReview(approved)", () => updateReview(reviewId, { status: "approved" }));
        await logStep("updateDraft(approved)", () => updateDraft(review.draftId, { status: "approved" }));

        await logStep("sendApprovalConfirmation(approve)", () => sendApprovalConfirmation(reviewId, true));
      } else {
        console.log("[WEBHOOK-DEBUG] approve flow SKIPPED: review not found for reviewId =", reviewId);
      }
    }
    
    if (data.startsWith("reject_")) {
      const reviewId = data.replace("reject_", "");
      console.log("[WEBHOOK-DEBUG] reject flow, extracted reviewId =", reviewId);
      const review = await logStep("getReview(reject)", () => getReview(reviewId));
      
      if (review) {
        await logStep("updateReview(needs_edit)", () => updateReview(reviewId, { status: "needs_edit", reviewerComments: "Revision requested via Telegram" }));
        await logStep("updateDraft(needs_edit)", () => updateDraft(review.draftId, { status: "needs_edit" }));
        
        await logStep("sendApprovalConfirmation(reject)", () => sendApprovalConfirmation(reviewId, false, "Revision requested"));
      } else {
        console.log("[WEBHOOK-DEBUG] reject flow SKIPPED: review not found for reviewId =", reviewId);
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
      const posts = await getScheduledPosts();
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
