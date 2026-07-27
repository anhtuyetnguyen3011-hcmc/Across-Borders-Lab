import { Draft, ReviewItem } from "./types";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface TelegramMessage {
  text: string;
  parse_mode?: string;
  reply_markup?: {
    inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
  };
}

export async function sendTelegramMessage(message: TelegramMessage, targetChatId?: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("⚠️ Telegram bot token or chat ID not configured. Skipping notification.");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChatId || TELEGRAM_CHAT_ID,
          text: message.text,
          ...(message.parse_mode ? { parse_mode: message.parse_mode } : {}),
          ...(message.reply_markup ? { reply_markup: message.reply_markup } : {}),
        }),
      }
    );

    if (!response.ok) {
      console.error("Telegram API error:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

export async function sendReviewNotification(
  draft: Draft,
  review: ReviewItem
): Promise<boolean> {
  const platform = draft.platform === "threads" ? "Threads" : "Website";
  const pillar = draft.pillar === "kinh_nghiem" ? "Experience" 
    : draft.pillar === "goc_nhin" ? "Perspective"
    : draft.pillar === "kien_thuc" ? "Knowledge"
    : "Lifestyle";

  const riskNotes = review.aiRiskNotes.length > 0
    ? `\n\n⚠️ *AI Risk Notes:*\n${review.aiRiskNotes.map((n) => `• ${n}`).join("\n")}`
    : "";

  const text = `📝 *New Draft Pending Review*

*${draft.title}*
Platform: ${platform}
Pillar: ${pillar}
Risk Score: ${draft.originalityRisk}%

*Hook:* ${draft.hook.slice(0, 100)}...${riskNotes}

Approve or request edit from the app.`;

  return sendTelegramMessage({
    text,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `approve_${review.id}` },
          { text: "❌ Request Edit", callback_data: `reject_${review.id}` },
        ],
      ],
    },
  });
}

export async function sendApprovalConfirmation(
  reviewId: string,
  approved: boolean,
  comment?: string
): Promise<boolean> {
  const text = approved
    ? `✅ Draft has been approved!\n\nReview ID: ${reviewId}`
    : `❌ Draft needs revision\n\nReview ID: ${reviewId}\nReason: ${comment || "No reason provided"}`;

  return sendTelegramMessage({
    text,
  });
}

export async function sendPublishConfirmation(
  draftTitle: string,
  platform: string,
  success: boolean,
  error?: string
): Promise<boolean> {
  const status = success ? "✅ Success" : "❌ Failed";
  const text = `${status} publishing\n\n*${draftTitle}*\nPlatform: ${platform}${error ? `\nError: ${error}` : ""}`;

  return sendTelegramMessage({
    text,
    parse_mode: "Markdown",
  });
}

export function isTelegramConfigured(): boolean {
  return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}
