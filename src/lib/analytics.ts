import { getPerformanceMetrics } from "./data";
import { prisma } from "./db";
import { Pillar, Platform } from "./types";

export interface AnalyticsSummary {
  totalViews7d: number;
  totalViews30d: number;
  avgEngagementRate: number;
  bestPillar: { pillar: Pillar; engagementRate: number };
  topPosts: {
    title: string;
    draftId: string;
    platform: Platform;
    views: number;
    engagementRate: number;
    pillar: Pillar;
  }[];
  pillarPerformance: { pillar: Pillar; avgEngagement: number; totalViews: number }[];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const metrics = await getPerformanceMetrics();
  const now = Date.now();
  const d7 = now - 86400000 * 7;
  const d30 = now - 86400000 * 30;

  const recent7d = metrics.filter(
    (m) => new Date(m.capturedAt).getTime() >= d7
  );
  const recent30d = metrics.filter(
    (m) => new Date(m.capturedAt).getTime() >= d30
  );

  const totalViews7d = recent7d.reduce((sum, m) => sum + m.views, 0);
  const totalViews30d = recent30d.reduce((sum, m) => sum + m.views, 0);
  const avgEngagementRate =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.engagementRate, 0) / metrics.length
      : 0;

  // Group by pillar
  const pillarMap = new Map<Pillar, { total: number; count: number; views: number }>();
  metrics.forEach((m) => {
    const existing = pillarMap.get(m.pillar) || { total: 0, count: 0, views: 0 };
    pillarMap.set(m.pillar, {
      total: existing.total + m.engagementRate,
      count: existing.count + 1,
      views: existing.views + m.views,
    });
  });

  let bestPillar = { pillar: "education" as Pillar, engagementRate: 0 };
  const pillarPerformance: AnalyticsSummary["pillarPerformance"] = [];

  pillarMap.forEach((val, pillar) => {
    const avg = val.total / val.count;
    pillarPerformance.push({ pillar, avgEngagement: avg, totalViews: val.views });
    if (avg > bestPillar.engagementRate) {
      bestPillar = { pillar, engagementRate: avg };
    }
  });

  const topMetrics = metrics
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const draftIds = [...new Set(topMetrics.map((m) => m.draftId))];
  const drafts = await prisma.draft.findMany({ where: { id: { in: draftIds } } });
  const draftMap = new Map(drafts.map((d) => [d.id, d.title]));

  const topPosts = topMetrics
    .map((m) => ({
      title: draftMap.get(m.draftId) || "Untitled post",
      draftId: m.draftId,
      platform: m.platform,
      views: m.views,
      engagementRate: m.engagementRate,
      pillar: m.pillar,
    }));

  return {
    totalViews7d,
    totalViews30d,
    avgEngagementRate,
    bestPillar,
    topPosts,
    pillarPerformance,
  };
}
