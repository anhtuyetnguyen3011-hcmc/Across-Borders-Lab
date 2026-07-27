import { Platform, PublishStatus } from "./types";

export interface PublishResult {
  success: boolean;
  status: PublishStatus;
  externalId?: string;
  error?: string;
  publishedUrl?: string;
}

export interface Publisher {
  publish(draft: {
    title: string;
    body: string;
    platform: Platform;
  }): Promise<PublishResult>;
}

class MockThreadsPublisher implements Publisher {
  async publish(draft: { title: string; body: string; platform: Platform }): Promise<PublishResult> {
    await new Promise((r) => setTimeout(r, 500));
    return {
      success: true,
      status: "published",
      externalId: `threads-${Date.now()}`,
      publishedUrl: `https://threads.net/@user/${Date.now()}`,
    };
  }
}

class MockWebsitePublisher implements Publisher {
  async publish(draft: { title: string; body: string; platform: Platform }): Promise<PublishResult> {
    await new Promise((r) => setTimeout(r, 500));
    return {
      success: true,
      status: "published",
      externalId: `wp-${Date.now()}`,
      publishedUrl: `https://mysite.com/${draft.title.toLowerCase().replace(/\s+/g, "-")}`,
    };
  }
}

class Publishers {
  private adapters: Record<Platform, Publisher> = {
    threads: new MockThreadsPublisher(),
    website: new MockWebsitePublisher(),
  };

  setAdapter(platform: Platform, adapter: Publisher): void {
    this.adapters[platform] = adapter;
  }

  getAdapter(platform: Platform): Publisher {
    return this.adapters[platform];
  }

  async publish(draft: {
    title: string;
    body: string;
    platform: Platform;
  }): Promise<PublishResult> {
    const adapter = this.getAdapter(draft.platform);
    try {
      return await adapter.publish(draft);
    } catch (err) {
      return {
        success: false,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

export const publishers = new Publishers();
