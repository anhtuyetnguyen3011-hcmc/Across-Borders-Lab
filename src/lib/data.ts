import prisma from "./db";
import type { Prisma } from "@/generated/prisma/client";
import {
  Idea as PrismaIdea,
  Draft as PrismaDraft,
  ReviewItem as PrismaReviewItem,
  ScheduledPost as PrismaScheduledPost,
  PerformanceMetric as PrismaPerformanceMetric,
  StyleSample as PrismaStyleSample,
  StyleProfile as PrismaStyleProfile,
} from "@/generated/prisma/client";
import {
  Idea,
  Draft,
  ReviewItem,
  ScheduledPost,
  PerformanceMetric,
  TrendingTopic,
  StyleSample,
  StyleSampleSource,
  StyleProfile,
  StyleProfileTraits,
  StyleProfileScope,
  Platform,
  Pillar,
  StyleSamplePlatform,
} from "./types";

function toIdea(row: PrismaIdea & { drafts?: unknown[] }): Idea {
  return {
    id: row.id,
    text: row.text,
    source: row.source as Idea["source"],
    pillar: row.pillar as Pillar,
    platform: row.platform as Platform,
    priorityScore: row.priorityScore,
    priority: row.priority as Idea["priority"],
    referenceLink: row.referenceLink ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDraft(row: PrismaDraft): Draft {
  return {
    id: row.id,
    ideaId: row.ideaId,
    platform: row.platform as Platform,
    pillar: row.pillar as Pillar,
    title: row.title,
    hook: row.hook,
    body: row.body,
    outline: row.outline,
    metaDescription: row.metaDescription ?? undefined,
    targetKeyword: row.targetKeyword ?? undefined,
    version: row.version,
    versionHistory: JSON.parse(row.versionHistory),
    aiModel: row.aiModel,
    status: row.status as Draft["status"],
    originalityRisk: row.originalityRisk,
    styleScore: row.styleScore ?? undefined,
    styleDeltas: row.styleDeltas
      ? (row.styleDeltas as unknown as Record<string, number>)
      : undefined,
    selectedHookArchetype: row.selectedHookArchetype ?? undefined,
    isStyleReference: row.isStyleReference,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toReview(row: PrismaReviewItem): ReviewItem {
  return {
    id: row.id,
    draftId: row.draftId,
    status: row.status as ReviewItem["status"],
    aiRiskNotes: JSON.parse(row.aiRiskNotes),
    reviewerComments: row.reviewerComments,
    createdAt: row.createdAt.toISOString(),
  };
}

function toScheduledPost(row: PrismaScheduledPost): ScheduledPost {
  return {
    id: row.id,
    draftId: row.draftId,
    platform: row.platform as Platform,
    scheduledTime: row.scheduledTime.toISOString(),
    publishStatus: row.publishStatus as ScheduledPost["publishStatus"],
    retryCount: row.retryCount,
    createdAt: row.createdAt.toISOString(),
  };
}

function toMetric(row: PrismaPerformanceMetric): PerformanceMetric {
  return {
    id: row.id,
    scheduledPostId: row.scheduledPostId,
    draftId: row.draftId,
    platform: row.platform as Platform,
    pillar: row.pillar as Pillar,
    views: row.views,
    likes: row.likes,
    comments: row.comments,
    engagementRate: row.engagementRate,
    capturedAt: row.capturedAt.toISOString(),
  };
}

function toStyleSample(row: PrismaStyleSample): StyleSample {
  return {
    id: row.id,
    sourceType: row.sourceType as StyleSampleSource,
    sourceUrl: row.sourceUrl,
    extractedText: row.extractedText,
    title: row.title,
    platform: row.platform as StyleSamplePlatform,
    createdAt: row.createdAt.toISOString(),
  };
}

// Ideas
export async function getIdeas(): Promise<Idea[]> {
  const rows = await prisma.idea.findMany({ orderBy: { priorityScore: "desc" } });
  return rows.map(toIdea);
}

export async function getIdea(id: string): Promise<Idea | undefined> {
  const row = await prisma.idea.findUnique({ where: { id } });
  return row ? toIdea(row) : undefined;
}

export async function addIdea(data: Omit<Idea, "id" | "createdAt" | "priorityScore" | "priority">): Promise<Idea> {
  const priorityScore = Math.floor(Math.random() * 40) + 50;
  const priority = priorityScore >= 80 ? "high" : priorityScore >= 60 ? "medium" : "low";
  const row = await prisma.idea.create({
    data: {
      text: data.text,
      source: data.source,
      pillar: data.pillar,
      platform: data.platform,
      referenceLink: data.referenceLink ?? null,
      priorityScore,
      priority,
    },
  });
  return toIdea(row);
}

export async function deleteIdea(id: string): Promise<boolean> {
  try {
    await prisma.idea.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// Drafts
export async function getDrafts(): Promise<Draft[]> {
  const rows = await prisma.draft.findMany({ orderBy: { updatedAt: "desc" } });
  return rows.map(toDraft);
}

export async function getDraft(id: string): Promise<Draft | undefined> {
  const row = await prisma.draft.findUnique({ where: { id } });
  return row ? toDraft(row) : undefined;
}

export async function addDraft(data: Omit<Draft, "id" | "createdAt" | "updatedAt" | "version" | "versionHistory" | "originalityRisk" | "aiModel" | "status" | "isStyleReference">): Promise<Draft> {
  const row = await prisma.draft.create({
    data: {
      ideaId: data.ideaId,
      platform: data.platform,
      pillar: data.pillar,
      title: data.title,
      hook: data.hook,
      body: data.body,
      outline: data.outline || "",
      metaDescription: data.metaDescription ?? null,
      targetKeyword: data.targetKeyword ?? null,
      version: 1,
      versionHistory: "[]",
      originalityRisk: Math.floor(Math.random() * 30) + 5,
      aiModel: "gpt-4o (mock)",
      status: "draft",
      isStyleReference: false,
      ...(data.styleScore !== undefined ? { styleScore: data.styleScore } : {}),
      ...(data.styleDeltas !== undefined
        ? { styleDeltas: data.styleDeltas as unknown as Prisma.InputJsonValue }
        : {}),
      ...(data.selectedHookArchetype !== undefined
        ? { selectedHookArchetype: data.selectedHookArchetype }
        : {}),
    },
  });
  return toDraft(row);
}

export async function updateDraft(id: string, data: Partial<Draft>): Promise<Draft | undefined> {
  const existing = await prisma.draft.findUnique({ where: { id } });
  if (!existing) return undefined;

  const updateData: Record<string, unknown> = { ...data };
  delete (updateData as Record<string, unknown>).id;
  delete (updateData as Record<string, unknown>).createdAt;
  delete (updateData as Record<string, unknown>).versionHistory;

  if (data.body && data.body !== existing.body) {
    const currentHistory = JSON.parse(existing.versionHistory);
    currentHistory.push({
      version: existing.version + 1,
      body: data.body,
      hook: data.hook || existing.hook,
      createdAt: new Date().toISOString(),
    });
    updateData.versionHistory = JSON.stringify(currentHistory);
    updateData.version = existing.version + 1;
  }

  const row = await prisma.draft.update({ where: { id }, data: updateData });
  return toDraft(row);
}

// Reviews
export async function getReviews(): Promise<ReviewItem[]> {
  const rows = await prisma.reviewItem.findMany();
  return rows.map(toReview);
}

export async function getReview(id: string): Promise<ReviewItem | undefined> {
  const row = await prisma.reviewItem.findUnique({ where: { id } });
  return row ? toReview(row) : undefined;
}

export async function getReviewByDraftId(draftId: string): Promise<ReviewItem | undefined> {
  const row = await prisma.reviewItem.findUnique({ where: { draftId } });
  return row ? toReview(row) : undefined;
}

export async function addReview(data: Omit<ReviewItem, "id" | "createdAt">): Promise<ReviewItem> {
  const row = await prisma.reviewItem.create({
    data: {
      draftId: data.draftId,
      status: data.status,
      aiRiskNotes: JSON.stringify(data.aiRiskNotes),
      reviewerComments: data.reviewerComments,
    },
  });
  return toReview(row);
}

export async function updateReview(id: string, data: Partial<ReviewItem>): Promise<ReviewItem | undefined> {
  const existing = await prisma.reviewItem.findUnique({ where: { id } });
  if (!existing) return undefined;

  const updateData: Record<string, unknown> = { ...data };
  delete (updateData as Record<string, unknown>).id;
  delete (updateData as Record<string, unknown>).createdAt;
  if (data.aiRiskNotes) {
    updateData.aiRiskNotes = JSON.stringify(data.aiRiskNotes);
  }

  const row = await prisma.reviewItem.update({ where: { id }, data: updateData });
  return toReview(row);
}

// Scheduled Posts
export async function getScheduledPosts(): Promise<ScheduledPost[]> {
  const rows = await prisma.scheduledPost.findMany({ orderBy: { scheduledTime: "asc" } });
  return rows.map(toScheduledPost);
}

export async function getScheduledPost(id: string): Promise<ScheduledPost | undefined> {
  const row = await prisma.scheduledPost.findUnique({ where: { id } });
  return row ? toScheduledPost(row) : undefined;
}

export async function addScheduledPost(data: Omit<ScheduledPost, "id" | "createdAt" | "retryCount">): Promise<ScheduledPost> {
  const row = await prisma.scheduledPost.create({
    data: {
      draftId: data.draftId,
      platform: data.platform,
      scheduledTime: new Date(data.scheduledTime),
      publishStatus: data.publishStatus,
      retryCount: 0,
    },
  });
  return toScheduledPost(row);
}

export async function updateScheduledPost(id: string, data: Partial<ScheduledPost>): Promise<ScheduledPost | undefined> {
  const existing = await prisma.scheduledPost.findUnique({ where: { id } });
  if (!existing) return undefined;

  const updateData: Record<string, unknown> = { ...data };
  delete (updateData as Record<string, unknown>).id;
  delete (updateData as Record<string, unknown>).createdAt;
  if (data.scheduledTime) {
    updateData.scheduledTime = new Date(data.scheduledTime);
  }

  const row = await prisma.scheduledPost.update({ where: { id }, data: updateData });
  return toScheduledPost(row);
}

// Performance Metrics
export async function getPerformanceMetrics(): Promise<PerformanceMetric[]> {
  const rows = await prisma.performanceMetric.findMany();
  return rows.map(toMetric);
}

export async function getMetricsByDraftId(draftId: string): Promise<PerformanceMetric | undefined> {
  const row = await prisma.performanceMetric.findUnique({ where: { draftId } });
  return row ? toMetric(row) : undefined;
}

export function createMetric(data: Omit<PerformanceMetric, "id">): Promise<PerformanceMetric> {
  return prisma.performanceMetric.create({ data }).then(toMetric);
}

export function updateMetric(id: string, data: Partial<PerformanceMetric>): Promise<PerformanceMetric> {
  return prisma.performanceMetric.update({ where: { id }, data }).then(toMetric);
}

export function upsertMetricByDraftId(
  draftId: string,
  data: Omit<PerformanceMetric, "id" | "draftId">,
): Promise<{ metric: PerformanceMetric; created: boolean }> {
  return prisma.performanceMetric.findUnique({
    where: { draftId },
    select: { id: true },
  }).then((existing) =>
    prisma.performanceMetric.upsert({
      where: { draftId },
      update: data,
      create: { ...data, draftId },
    }).then((metric) => ({ metric: toMetric(metric), created: !existing }))
  );
}

// Trending Topics (mock — not stored in DB)
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

export function getTrendingTopics(): TrendingTopic[] {
  return [...trendingTopics];
}

// Style Samples
export async function getStyleSamples(): Promise<StyleSample[]> {
  const rows = await prisma.styleSample.findMany();
  return rows.map(toStyleSample);
}

export async function addStyleSample(data: Omit<StyleSample, "id" | "createdAt">): Promise<StyleSample> {
  const row = await prisma.styleSample.create({
    data: {
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl,
      extractedText: data.extractedText,
      title: data.title,
      platform: data.platform,
    },
  });
  return toStyleSample(row);
}

export async function deleteStyleSample(id: string): Promise<boolean> {
  try {
    await prisma.styleSample.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function updateStyleSamplePlatform(id: string, platform: "threads" | "website"): Promise<StyleSample | null> {
  try {
    const row = await prisma.styleSample.update({ where: { id }, data: { platform } });
    return toStyleSample(row);
  } catch {
    return null;
  }
}

const DEFAULT_STYLE_PROFILE_USER = "default";

function toStyleProfile(row: PrismaStyleProfile): StyleProfile {
  return {
    id: row.id,
    userId: row.userId,
    platform: row.platform as StyleProfileScope,
    traits: row.traits as unknown as StyleProfileTraits,
    sourceSampleIds: row.sourceSampleIds as unknown as string[],
    sampleCount: row.sampleCount,
    generatedAt: row.generatedAt.toISOString(),
  };
}

export async function getStyleProfile(platform: StyleProfileScope = "all"): Promise<StyleProfile | null> {
  const row = await prisma.styleProfile.findUnique({
    where: { userId_platform: { userId: DEFAULT_STYLE_PROFILE_USER, platform } },
  });
  return row ? toStyleProfile(row) : null;
}

export interface StyleProfileInput {
  traits: StyleProfileTraits;
  sourceSampleIds: string[];
  sampleCount: number;
}

export async function saveStyleProfile(data: StyleProfileInput, platform: StyleProfileScope = "all"): Promise<StyleProfile> {
  const traits = data.traits as unknown as Prisma.InputJsonValue;
  const sourceSampleIds = data.sourceSampleIds as unknown as Prisma.InputJsonValue;
  const row = await prisma.styleProfile.upsert({
    where: { userId_platform: { userId: DEFAULT_STYLE_PROFILE_USER, platform } },
    update: {
      traits,
      sourceSampleIds,
      sampleCount: data.sampleCount,
      generatedAt: new Date(),
    },
    create: {
      userId: DEFAULT_STYLE_PROFILE_USER,
      platform,
      traits,
      sourceSampleIds,
      sampleCount: data.sampleCount,
    },
  });
  return toStyleProfile(row);
}

export interface UnifiedStyleExample {
  id: string;
  source: StyleSampleSource;
  title: string;
  body: string;
  platform?: StyleSamplePlatform;
  pillar?: Pillar;
}

export async function getUnifiedStyleReferences(): Promise<UnifiedStyleExample[]> {
  const [samples, flaggedDrafts] = await Promise.all([
    prisma.styleSample.findMany(),
    prisma.draft.findMany({ where: { isStyleReference: true } }),
  ]);
  const fromSamples: UnifiedStyleExample[] = samples.map((sample) => ({
    id: sample.id,
    source: sample.sourceType as StyleSampleSource,
    title: sample.title || "Sample",
    body: sample.extractedText,
    platform: sample.platform as StyleSamplePlatform,
  }));
  const fromDrafts: UnifiedStyleExample[] = flaggedDrafts.map((draft) => ({
    id: draft.id,
    source: "draft",
    title: draft.title,
    body: draft.body,
    platform: draft.platform as Platform,
    pillar: draft.pillar as Pillar,
  }));
  return [...fromSamples, ...fromDrafts];
}

export async function getUnifiedStyleReferencesForPlatform(filterPlatform: Platform): Promise<UnifiedStyleExample[]> {
  const all = await getUnifiedStyleReferences();
  return all.filter((ref) => ref.platform === filterPlatform);
}

export interface CalendarDayEntry {
  date: string;
  dayOfMonth: number;
  posts: { id: string; title: string; status: "published" | "queued"; time: string }[];
  publishedCount: number;
  scheduledCount: number;
}

export async function getEditorialCalendar(year: number, month: number): Promise<CalendarDayEntry[]> {
  const entries: CalendarDayEntry[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const monthPosts = await prisma.scheduledPost.findMany({
    where: {
      scheduledTime: { gte: startDate, lte: endDate },
    },
    orderBy: { scheduledTime: "asc" },
  });

  const draftIds = [...new Set(monthPosts.map((sp) => sp.draftId))];
  const drafts = await prisma.draft.findMany({
    where: { id: { in: draftIds } },
    select: { id: true, title: true },
  });
  const draftMap = new Map(drafts.map((d) => [d.id, d.title]));

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayPosts = monthPosts.filter((sp) => sp.scheduledTime.getDate() === day);
    entries.push({
      date: dayStr,
      dayOfMonth: day,
      posts: dayPosts.map((sp) => ({
        id: sp.id,
        title: draftMap.get(sp.draftId) || "Untitled",
        status: sp.publishStatus as "published" | "queued",
        time: sp.scheduledTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      })),
      publishedCount: dayPosts.filter((sp) => sp.publishStatus === "published").length,
      scheduledCount: dayPosts.filter((sp) => sp.publishStatus === "queued").length,
    });
  }

  return entries;
}
