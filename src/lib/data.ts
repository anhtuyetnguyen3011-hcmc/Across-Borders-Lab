import {
  Idea,
  Draft,
  ReviewItem,
  ScheduledPost,
  PerformanceMetric,
  TrendingTopic,
  StyleSample,
  StyleSampleSource,
  Platform,
  Pillar,
} from "./types";

let ideas: Idea[] = [
  {
    id: "idea-1",
    text: "5 bài học từ việc chuyển sang làm freelance sau 5 năm corporate",
    source: "manual",
    pillar: "career",
    platform: "threads",
    priorityScore: 92,
    priority: "high",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "idea-2",
    text: "Tại sao mình chọn sống ở Đà Nẵng thay vì Sài Gòn cho người làm remote",
    source: "manual",
    pillar: "lifestyle",
    platform: "website",
    priorityScore: 85,
    priority: "high",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "idea-3",
    text: "Review công cụ AI giúp tăng năng suất 3x cho content creator",
    source: "link",
    pillar: "education",
    platform: "threads",
    priorityScore: 78,
    priority: "medium",
    referenceLink: "https://example.com/ai-tools-review",
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "idea-4",
    text: "Quan điểm: Tại sao 'hustle culture' đang giết chết thế hệ trẻ",
    source: "trend",
    pillar: "education",
    platform: "website",
    priorityScore: 88,
    priority: "high",
    createdAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
  },
  {
    id: "idea-5",
    text: "Chi tiết cách mình quản lý tài chính cá nhân bằng spreadsheet",
    source: "manual",
    pillar: "education",
    platform: "website",
    priorityScore: 65,
    priority: "medium",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "idea-6",
    text: "5 cuốn sách thay đổi tư duy mình trong năm 2026",
    source: "audio",
    pillar: "career",
    platform: "threads",
    priorityScore: 71,
    priority: "medium",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: "idea-7",
    text: "Một ngày làm việc của mình: 6h productivity, 2h family, 2h learning",
    source: "manual",
    pillar: "lifestyle",
    platform: "threads",
    priorityScore: 60,
    priority: "low",
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
];

const drafts: Draft[] = [
  {
    id: "draft-1",
    ideaId: "idea-1",
    platform: "threads",
    pillar: "career",
    title: "5 bài học từ Freelance sau 5 năm Corporate",
    hook: "Sau 5 năm ngồi văn phòng, mình quyết định nghỉ việc. Đây là 5 điều mình ước ai nói cho mình sớm hơn.",
    body: `1️⃣ Income không ổn định ≠ income thấp\n\nTháng đầu tiên freelance mình kiếm được 40 triệu. Tháng tiếp theo chỉ 8 triệu. Nhưng trung bình năm đầu mình vẫn hơn lúc đi làm.\n\n2️⃣ Bạn cần discipline hơn cả lúc đi làm\n\nKhông ai bắt bạn schedule 9h sáng. Nhưng nếu bạn không tự kỷ luật, 1 năm sau bạn sẽ ở trong phòng ngủ lúc 2h chiều vẫn còn pyjamas.\n\n3️⃣ Network = Net worth\n\n80% khách hàng mình đến từ referral. Invest vào relationships.\n\n4️⃣ Học cách nói "không"\n\nClient xấu = poison. 10 năm kinh nghiệm cho mình bài học đắt nhất.\n\n5️⃣ Mental health là priority #1\n\nBurnout không có gì cool cả. Freelance cho bạn freedom, nhưng cũng cho bạn freedom to destroy yourself.`,
    outline: "5 numbered lessons, each with short explanation",
    version: 2,
    versionHistory: [
      {
        version: 1,
        body: "Original draft content...",
        hook: "Mình đã nghỉ việc sau 5 năm. Đây là 5 bài học.",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        version: 2,
        body: "Updated content with more detail...",
        hook: "Sau 5 năm ngồi văn phòng, mình quyết định nghỉ việc. Đây là 5 điều mình ước ai nói cho mình sớm hơn.",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    aiModel: "gpt-4o",
    status: "needs_review",
    originalityRisk: 15,
    isStyleReference: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "draft-2",
    ideaId: "idea-2",
    platform: "website",
    pillar: "lifestyle",
    title: "Tại Sao Mình Chọn Đà Nẵng: Cuộc Sống Remote Worker Ở Việt Nam",
    hook: "Sau 2 năm sống và làm việc từ cả Sài Gòn, Hà Nội, lẫn Đà Nẵng, mình đã đưa ra quyết định cuối cùng.",
    body: `## Vấn đề với Sài Gòn\n\nTraffic, khói bụi, chi phí leo thang... \n\n## Tại sao Đà Nẵng?\n\nChi phí sống thấp hơn 40%, internet fiber nhanh, cộng đồng digital nomad đang phát triển mạnh.\n\n## Schedule hàng ngày của mình\n\n5h30 - Thức dậy, chạy bộ ở bãi biển\n7h00 - Bắt đầu work\n12h00 - Lunch + break\n14h00 - Afternoon session\n17h00 - Off work, explore\n20h00 - Reading / learning`,
    outline: "Long-form article comparing cities, personal schedule, practical tips",
    metaDescription: "Kinh nghiệm sống và làm việc từ Đà Nẵng cho digital nomad Việt Nam",
    targetKeyword: "digital nomad đà nẵng",
    version: 1,
    versionHistory: [
      {
        version: 1,
        body: "Full article content...",
        hook: "Sau 2 năm sống và làm việc từ cả Sài Gòn, Hà Nội, lẫn Đà Nẵng...",
        createdAt: new Date(Date.now() - 72000000).toISOString(),
      },
    ],
    aiModel: "gpt-4o",
    status: "approved",
    originalityRisk: 8,
    isStyleReference: true,
    createdAt: new Date(Date.now() - 72000000).toISOString(),
    updatedAt: new Date(Date.now() - 36000000).toISOString(),
  },
  {
    id: "draft-3",
    ideaId: "idea-3",
    platform: "threads",
    pillar: "education",
    title: "5 AI Tools Tăng Năng Suất 3x",
    hook: "Mình đã test 20+ công cụ AI trong 6 tháng. Chỉ 5 tools này mới thực sự đáng tiền.",
    body: `1️⃣ Cursor - Viết code 3x nhanh hơn\n\nAI coding assistant tốt nhất hiện tại. Không phải copilot.\n\n2️⃣ Notion AI - Quản lý knowledge\n\nTích hợp AI vào workflow quản lý project.\n\n3️⃣ Descript - Edit video/audio\n\nTranscription + editing trong 1 tool.\n\n4️⃣ Perplexity - Research\n\nGoogle replacement cho người làm nội dung.\n\n5️⃣ Opus Clip - Repurpose content\n\nBiến video dài thành shorts/threads tự động.`,
    outline: "5 tools with short reviews, each with use case",
    version: 1,
    versionHistory: [],
    aiModel: "gpt-4o",
    status: "needs_review",
    originalityRisk: 22,
    isStyleReference: false,
    createdAt: new Date(Date.now() - 54000000).toISOString(),
    updatedAt: new Date(Date.now() - 54000000).toISOString(),
  },
  {
    id: "draft-4",
    ideaId: "idea-4",
    platform: "website",
    pillar: "education",
    title: "Hustle Culture Đang Giết Chết Thế Hệ Trẻ: Tại Sao Mình Nghĩ vậy",
    hook: "Thế hệ chúng ta bị ám ảnh bởi 'hustle' đến mức quên mất rằng nghỉ ngơi cũng là productive.",
    body: "Full article about hustle culture critique...",
    outline: "Opinion piece on hustle culture with data and personal stories",
    metaDescription: "Phân tích tác động của hustle culture lên thế hệ trẻ Việt Nam",
    targetKeyword: "hustle culture việt nam",
    version: 1,
    versionHistory: [],
    aiModel: "gpt-4o",
    status: "draft",
    originalityRisk: 5,
    isStyleReference: false,
    createdAt: new Date(Date.now() - 18000000).toISOString(),
    updatedAt: new Date(Date.now() - 18000000).toISOString(),
  },
];

const reviews: ReviewItem[] = [
  {
    id: "review-1",
    draftId: "draft-1",
    status: "pending",
    aiRiskNotes: [
      "Hook có thể trùng với nhiều bài viết về freelance",
      "Tone hơi casual cho platform Threads",
    ],
    reviewerComments: "",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "review-2",
    draftId: "draft-3",
    status: "pending",
    aiRiskNotes: [
      "Danh sách tools có thể đã có nhiều bài tương tự",
      "Nên thêm personal experience cụ thể hơn",
    ],
    reviewerComments: "",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

const scheduledPosts: ScheduledPost[] = [
  {
    id: "sched-1",
    draftId: "draft-2",
    platform: "website",
    scheduledTime: new Date(Date.now() + 86400000).toISOString(),
    publishStatus: "queued",
    retryCount: 0,
    createdAt: new Date(Date.now() - 36000000).toISOString(),
  },
];

const performanceMetrics: PerformanceMetric[] = [
  {
    id: "metric-1",
    scheduledPostId: "sched-old-1",
    draftId: "draft-old-1",
    platform: "threads",
    pillar: "career",
    views: 12450,
    likes: 890,
    comments: 134,
    engagementRate: 8.2,
    capturedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "metric-2",
    scheduledPostId: "sched-old-2",
    draftId: "draft-old-2",
    platform: "website",
    pillar: "lifestyle",
    views: 8900,
    likes: 567,
    comments: 89,
    engagementRate: 7.4,
    capturedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: "metric-3",
    scheduledPostId: "sched-old-3",
    draftId: "draft-old-3",
    platform: "threads",
    pillar: "education",
    views: 6780,
    likes: 445,
    comments: 67,
    engagementRate: 7.5,
    capturedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "metric-4",
    scheduledPostId: "sched-old-4",
    draftId: "draft-old-4",
    platform: "threads",
    pillar: "education",
    views: 15200,
    likes: 1100,
    comments: 203,
    engagementRate: 8.5,
    capturedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "metric-5",
    scheduledPostId: "sched-old-5",
    draftId: "draft-old-5",
    platform: "website",
    pillar: "career",
    views: 4300,
    likes: 312,
    comments: 45,
    engagementRate: 8.3,
    capturedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "metric-6",
    scheduledPostId: "sched-old-6",
    draftId: "draft-old-6",
    platform: "threads",
    pillar: "lifestyle",
    views: 21000,
    likes: 1560,
    comments: 278,
    engagementRate: 8.8,
    capturedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: "metric-7",
    scheduledPostId: "sched-old-7",
    draftId: "draft-old-7",
    platform: "website",
    pillar: "education",
    views: 9800,
    likes: 723,
    comments: 112,
    engagementRate: 8.5,
    capturedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

const trendingTopics: TrendingTopic[] = [
  {
    id: "trend-1",
    title: "AI Agent là gì? Xu hướng 2026",
    source: "Google Trends",
    relevance: 95,
    category: "Công nghệ",
  },
  {
    id: "trend-2",
    title: "Remote work policies tại các công ty lớn",
    source: "Twitter/X",
    relevance: 88,
    category: "Career",
  },
  {
    id: "trend-3",
    title: "Tối ưu hóa workflow với Notion + AI",
    source: "ProductHunt",
    relevance: 82,
    category: "Productivity",
  },
  {
    id: "trend-4",
    title: "Cuộc sống ở Đà Nẵng cho digital nomad",
    source: "Facebook Groups",
    relevance: 79,
    category: "Lối sống",
  },
  {
    id: "trend-5",
    title: "Side hustle ideas cho dân tech 2026",
    source: "Reddit",
    relevance: 76,
    category: "Career",
  },
];

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Ideas
export function getIdeas(): Idea[] {
  return [...ideas].sort(
    (a, b) => b.priorityScore - a.priorityScore
  );
}

export function getIdea(id: string): Idea | undefined {
  return ideas.find((i) => i.id === id);
}

export function addIdea(data: Omit<Idea, "id" | "createdAt" | "priorityScore" | "priority">): Idea {
  const priorityScore = Math.floor(Math.random() * 40) + 50;
  const priority =
    priorityScore >= 80 ? "high" : priorityScore >= 60 ? "medium" : "low";
  const idea: Idea = {
    ...data,
    id: generateId("idea"),
    priorityScore,
    priority,
    createdAt: new Date().toISOString(),
  };
  ideas.unshift(idea);
  return idea;
}

export function deleteIdea(id: string): boolean {
  const before = ideas.length;
  ideas = ideas.filter((i) => i.id !== id);
  return ideas.length < before;
}

// Drafts
export function getDrafts(): Draft[] {
  return [...drafts].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getDraft(id: string): Draft | undefined {
  return drafts.find((d) => d.id === id);
}

export function addDraft(data: Omit<Draft, "id" | "createdAt" | "updatedAt" | "version" | "versionHistory" | "originalityRisk" | "aiModel" | "status" | "isStyleReference">): Draft {
  const draft: Draft = {
    ...data,
    id: generateId("draft"),
    version: 1,
    versionHistory: [],
    originalityRisk: Math.floor(Math.random() * 30) + 5,
    aiModel: "gpt-4o (mock)",
    status: "draft",
    isStyleReference: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  drafts.push(draft);
  return draft;
}

export function updateDraft(id: string, data: Partial<Draft>): Draft | undefined {
  const idx = drafts.findIndex((d) => d.id === id);
  if (idx === -1) return undefined;
  const existing = drafts[idx];
  const updated: Draft = {
    ...existing,
    ...data,
    id: existing.id,
    version: data.body && data.body !== existing.body ? existing.version + 1 : existing.version,
    updatedAt: new Date().toISOString(),
  };
  if (data.body && data.body !== existing.body) {
    updated.versionHistory = [
      ...existing.versionHistory,
      {
        version: existing.version + 1,
        body: data.body,
        hook: data.hook || existing.hook,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  drafts[idx] = updated;
  return updated;
}

// Reviews
export function getReviews(): ReviewItem[] {
  return [...reviews];
}

export function getReview(id: string): ReviewItem | undefined {
  return reviews.find((r) => r.id === id);
}

export function getReviewByDraftId(draftId: string): ReviewItem | undefined {
  return reviews.find((r) => r.draftId === draftId);
}

export function addReview(data: Omit<ReviewItem, "id" | "createdAt">): ReviewItem {
  const review: ReviewItem = {
    ...data,
    id: generateId("review"),
    createdAt: new Date().toISOString(),
  };
  reviews.push(review);
  return review;
}

export function updateReview(id: string, data: Partial<ReviewItem>): ReviewItem | undefined {
  const idx = reviews.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  reviews[idx] = { ...reviews[idx], ...data, id: reviews[idx].id };
  return reviews[idx];
}

// Scheduled Posts
export function getScheduledPosts(): ScheduledPost[] {
  return [...scheduledPosts].sort(
    (a, b) =>
      new Date(a.scheduledTime).getTime() -
      new Date(b.scheduledTime).getTime()
  );
}

export function getScheduledPost(id: string): ScheduledPost | undefined {
  return scheduledPosts.find((s) => s.id === id);
}

export function addScheduledPost(data: Omit<ScheduledPost, "id" | "createdAt" | "retryCount">): ScheduledPost {
  const post: ScheduledPost = {
    ...data,
    id: generateId("sched"),
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };
  scheduledPosts.push(post);
  return post;
}

export function updateScheduledPost(id: string, data: Partial<ScheduledPost>): ScheduledPost | undefined {
  const idx = scheduledPosts.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  scheduledPosts[idx] = { ...scheduledPosts[idx], ...data, id: scheduledPosts[idx].id };
  return scheduledPosts[idx];
}

// Performance Metrics
export function getPerformanceMetrics(): PerformanceMetric[] {
  return [...performanceMetrics];
}

export function getMetricsByDraftId(draftId: string): PerformanceMetric | undefined {
  return performanceMetrics.find((m) => m.draftId === draftId);
}

// Trending Topics
export function getTrendingTopics(): TrendingTopic[] {
  return [...trendingTopics];
}

// Style Samples
const styleSamples: StyleSample[] = [];

export function getStyleSamples(): StyleSample[] {
  return [...styleSamples];
}

export function addStyleSample(data: Omit<StyleSample, "id" | "createdAt">): StyleSample {
  const sample: StyleSample = {
    ...data,
    id: generateId("sample"),
    createdAt: new Date().toISOString(),
  };
  styleSamples.push(sample);
  return sample;
}

export function deleteStyleSample(id: string): boolean {
  const before = styleSamples.length;
  const idx = styleSamples.findIndex((s) => s.id === id);
  if (idx !== -1) styleSamples.splice(idx, 1);
  return styleSamples.length < before;
}

export interface UnifiedStyleExample {
  id: string;
  source: StyleSampleSource;
  title: string;
  body: string;
  platform?: Platform;
  pillar?: Pillar;
}

export interface CalendarDayEntry {
  date: string;
  dayOfMonth: number;
  posts: { id: string; title: string; status: "published" | "queued"; time: string }[];
  publishedCount: number;
  scheduledCount: number;
}

export function getEditorialCalendar(year: number, month: number): CalendarDayEntry[] {
  const entries: CalendarDayEntry[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  const monthPosts = scheduledPosts.filter((sp) => {
    const d = new Date(sp.scheduledTime);
    return d.getFullYear() === year && d.getMonth() === month - 1;
  });

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayPosts = monthPosts.filter((sp) => {
      const d = new Date(sp.scheduledTime);
      return d.getDate() === day;
    });
    entries.push({
      date: dayStr,
      dayOfMonth: day,
      posts: dayPosts.map((sp) => ({
        id: sp.id,
        title: drafts.find((d) => d.id === sp.draftId)?.title || "Untitled",
        status: sp.publishStatus as "published" | "queued",
        time: new Date(sp.scheduledTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      })),
      publishedCount: dayPosts.filter((sp) => sp.publishStatus === "published").length,
      scheduledCount: dayPosts.filter((sp) => sp.publishStatus === "queued").length,
    });
  }

  return entries;
}

export function getUnifiedStyleReferences(): UnifiedStyleExample[] {
  return styleSamples.map((sample) => ({
    id: sample.id,
    source: sample.sourceType,
    title: sample.title || "Sample",
    body: sample.extractedText,
  }));
}
