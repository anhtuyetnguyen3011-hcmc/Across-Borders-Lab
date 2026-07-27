export type Platform = "threads" | "website";
export type Pillar = "kinh_nghiem" | "goc_nhin" | "kien_thuc" | "loi_song";
export type IdeaSource = "manual" | "audio" | "link" | "trend";
export type IdeaPriority = "high" | "medium" | "low";
export type DraftStatus = "draft" | "needs_review" | "needs_edit" | "approved";
export type ReviewStatus = "pending" | "needs_edit" | "approved";
export type PublishStatus = "queued" | "published" | "failed";
export type StyleSampleSource = "link" | "file" | "draft";

export interface StyleSample {
  id: string;
  sourceType: StyleSampleSource;
  sourceUrl: string | null;
  extractedText: string;
  title: string | null;
  createdAt: string;
}

export interface Idea {
  id: string;
  text: string;
  source: IdeaSource;
  pillar: Pillar;
  platform: Platform;
  priorityScore: number;
  priority: IdeaPriority;
  referenceLink?: string;
  createdAt: string;
}

export interface Draft {
  id: string;
  ideaId: string;
  platform: Platform;
  pillar: Pillar;
  title: string;
  hook: string;
  body: string;
  outline: string;
  metaDescription?: string;
  targetKeyword?: string;
  threadStructure?: string[];
  version: number;
  versionHistory: DraftVersion[];
  aiModel: string;
  status: DraftStatus;
  originalityRisk: number;
  isStyleReference: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DraftVersion {
  version: number;
  body: string;
  hook: string;
  createdAt: string;
}

export interface ReviewItem {
  id: string;
  draftId: string;
  status: ReviewStatus;
  aiRiskNotes: string[];
  reviewerComments: string;
  createdAt: string;
}

export interface ScheduledPost {
  id: string;
  draftId: string;
  platform: Platform;
  scheduledTime: string;
  publishStatus: PublishStatus;
  retryCount: number;
  createdAt: string;
}

export interface PerformanceMetric {
  id: string;
  scheduledPostId: string;
  draftId: string;
  platform: Platform;
  pillar: Pillar;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  capturedAt: string;
}

export interface TrendingTopic {
  id: string;
  title: string;
  source: string;
  relevance: number;
  category: string;
}

export const PILLAR_LABELS: Record<Pillar, string> = {
  kinh_nghiem: "Experience",
  goc_nhin: "Perspective",
  kien_thuc: "Knowledge",
  loi_song: "Lifestyle",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  threads: "Threads",
  website: "Website",
};

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Pending Review",
  needs_edit: "Needs Revision",
  approved: "Approved",
};

export const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  draft: "Draft",
  needs_review: "Pending Review",
  needs_edit: "Needs Revision",
  approved: "Approved",
};

export const PUBLISH_STATUS_LABELS: Record<PublishStatus, string> = {
  queued: "Scheduled",
  published: "Published",
  failed: "Failed",
};
