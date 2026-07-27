import { getScheduledPosts, updateScheduledPost, getDraft } from "./data";
import { publishers } from "./publisher";
import { sendPublishConfirmation, isTelegramConfigured } from "./telegram";

export async function checkAndPublishDuePosts(): Promise<{ published: number; failed: number }> {
  const now = new Date();
  const posts = getScheduledPosts();
  const duePosts = posts.filter(
    (p) => p.publishStatus === "queued" && new Date(p.scheduledTime) <= now
  );

  let published = 0;
  let failed = 0;

  for (const post of duePosts) {
    const draft = getDraft(post.draftId);
    if (!draft) {
      updateScheduledPost(post.id, {
        publishStatus: "failed",
        retryCount: post.retryCount + 1,
      });
      failed++;
      continue;
    }

    try {
      const result = await publishers.publish({
        title: draft.title,
        body: draft.body,
        platform: post.platform,
      });

      if (result.success) {
        updateScheduledPost(post.id, { publishStatus: "published" });
        published++;
        
        if (isTelegramConfigured()) {
          await sendPublishConfirmation(draft.title, post.platform, true);
        }
      } else {
        updateScheduledPost(post.id, {
          publishStatus: "failed",
          retryCount: post.retryCount + 1,
        });
        failed++;
        
        if (isTelegramConfigured()) {
          await sendPublishConfirmation(draft.title, post.platform, false, result.error);
        }
      }
    } catch (error) {
      updateScheduledPost(post.id, {
        publishStatus: "failed",
        retryCount: post.retryCount + 1,
      });
      failed++;
      
      if (isTelegramConfigured()) {
        await sendPublishConfirmation(
          draft.title,
          post.platform,
          false,
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }
  }

  return { published, failed };
}

export function startPublishScheduler(intervalMs: number = 60000): () => void {
  const interval = setInterval(async () => {
    const result = await checkAndPublishDuePosts();
    if (result.published > 0 || result.failed > 0) {
      console.log(`Publish check: ${result.published} published, ${result.failed} failed`);
    }
  }, intervalMs);

  return () => clearInterval(interval);
}
