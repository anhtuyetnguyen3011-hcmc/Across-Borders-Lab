"use client";

import { useState, useEffect } from "react";
import { PILLAR_LABELS, PLATFORM_LABELS, Pillar } from "@/lib/types";

interface AnalyticsSummary {
  totalViews7d: number;
  totalViews30d: number;
  avgEngagementRate: number;
  bestPillar: { pillar: Pillar; engagementRate: number };
  topPosts: {
    title: string;
    platform: string;
    views: number;
    engagementRate: number;
    pillar: string;
  }[];
  pillarPerformance: {
    pillar: Pillar;
    avgEngagement: number;
    totalViews: number;
  }[];
}

interface UploadResult {
  success: boolean;
  uploaded: number;
  matched: number;
  unmatched: { row: { post_reference: string }; reason: string }[];
  duplicates: number;
  errors: string[];
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load analytics"))))
      .then(setSummary)
      .catch(() => setSummary({
        totalViews7d: 0,
        totalViews30d: 0,
        avgEngagementRate: 0,
        bestPillar: { pillar: "education", engagementRate: 0 },
        topPosts: [],
        pillarPerformance: [],
      }));
  }, []);

  const handleMirrorTopPost = async () => {
    setGenerating(true);
    const res = await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mirror-top-post" }),
    });
    const data = await res.json();
    setGenerating(false);
    if (data.draft) {
      alert(`New draft created based on "${summary?.topPosts[0]?.title}"! Check the AI Writing tab.`);
    } else {
      alert("Failed to create draft. Please try again.");
    }
  };

  const handleDownloadTemplate = async () => {
    const res = await fetch("/api/analytics/upload");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analytics-template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const emptyResult: UploadResult = {
      success: false,
      uploaded: 0,
      matched: 0,
      unmatched: [],
      duplicates: 0,
      errors: [],
    };

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/analytics/upload", {
        method: "POST",
        body: formData,
      });

      const result: UploadResult = await res.json().catch(() => null) ?? emptyResult;
      setUploadResult(result);

      if (result.success) {
        const summaryRes = await fetch("/api/analytics");
        if (summaryRes.ok) {
          const newSummary = await summaryRes.json();
          setSummary(newSummary);
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadResult({
        ...emptyResult,
        errors: [error instanceof Error ? error.message : "Upload failed"],
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[var(--muted)]">Loading analytics data...</p>
      </div>
    );
  }

  const maxViews = Math.max(...((summary.topPosts ?? []).map((p) => p.views) || [1]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Analytics</h2>
          <p className="text-[var(--muted)] text-sm">Upload data, track performance, and create new content</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPeriod("7d")} className={`px-3 py-1.5 rounded-lg text-sm ${period === "7d" ? "gradient-btn" : "bg-[var(--surface)] text-[var(--muted)]"}`}>
            7 days
          </button>
          <button onClick={() => setPeriod("30d")} className={`px-3 py-1.5 rounded-lg text-sm ${period === "30d" ? "gradient-btn" : "bg-[var(--surface)] text-[var(--muted)]"}`}>
            30 days
          </button>
        </div>
      </div>

      <div className="card border-[var(--accent-start)]/30">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Upload Performance Data</h3>
            <p className="text-sm text-[var(--muted)]">
              Upload an Excel file with actual performance data from your platforms.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 rounded-xl border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] transition whitespace-nowrap"
            >
              📥 Download Template
            </button>
            <label className="gradient-btn whitespace-nowrap cursor-pointer">
              {uploading ? "Uploading..." : "📤 Upload Excel File"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      </div>

      {uploadResult && (
        <div className={`card ${uploadResult.success ? "border-green-500/30" : "border-red-500/30"}`}>
          <h3 className="font-semibold mb-2">
            {uploadResult.success ? "✅ Upload Successful" : "❌ Upload Error"}
          </h3>
          <div className="space-y-1 text-sm">
            <p>Uploaded: {uploadResult.uploaded} records</p>
            <p>Matched: {uploadResult.matched} posts</p>
            {uploadResult.duplicates > 0 && (
              <p className="text-yellow-400">Overwritten: {uploadResult.duplicates} duplicate records</p>
            )}
            {(uploadResult.unmatched?.length ?? 0) > 0 && (
              <div className="mt-2">
                <p className="text-orange-400 font-medium">Unmatched Posts ({uploadResult.unmatched.length}):</p>
                <ul className="list-disc list-inside text-xs text-[var(--muted)] max-h-32 overflow-y-auto">
                  {uploadResult.unmatched.map((item, i) => (
                    <li key={i}>{item.row.post_reference} - {item.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {(uploadResult.errors?.length ?? 0) > 0 && (
              <div className="mt-2">
                <p className="text-red-400 font-medium">Errors:</p>
                <ul className="list-disc list-inside text-xs text-[var(--muted)]">
                  {uploadResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            onClick={() => setUploadResult(null)}
            className="mt-3 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Close
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-xs text-[var(--muted)] mb-1">Views ({period === "7d" ? "7 days" : "30 days"})</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] bg-clip-text text-transparent">
            {(period === "7d" ? summary.totalViews7d : summary.totalViews30d).toLocaleString()}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-[var(--muted)] mb-1">Avg. Engagement Rate</p>
          <p className="text-3xl font-bold text-green-400">{summary.avgEngagementRate.toFixed(1)}%</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-[var(--muted)] mb-1">Top Performing Pillar</p>
          <p className="text-lg font-bold text-purple-400">{PILLAR_LABELS[summary.bestPillar.pillar]}</p>
          <p className="text-xs text-[var(--muted)]">{summary.bestPillar.engagementRate.toFixed(1)}% engagement</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-[var(--muted)] mb-1">Total Posts</p>
          <p className="text-3xl font-bold text-blue-400">{summary.topPosts.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">Top Performing Posts</h3>
          <div className="space-y-3">
            {summary.topPosts.map((post, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{post.title}</span>
                  <span className="text-xs text-[var(--muted)] ml-2">{post.views.toLocaleString()} views</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)]"
                    style={{ width: `${(post.views / maxViews) * 100}%` }}
                  />
                </div>
                <div className="flex gap-1.5">
                  <span className="badge bg-purple-500/20 text-purple-400 text-[0.6rem]">{PLATFORM_LABELS[post.platform as keyof typeof PLATFORM_LABELS]}</span>
                  <span className="badge bg-blue-500/20 text-blue-400 text-[0.6rem]">{PILLAR_LABELS[post.pillar as keyof typeof PILLAR_LABELS]}</span>
                  <span className="badge bg-green-500/20 text-green-400 text-[0.6rem]">{post.engagementRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Performance by Pillar</h3>
          <div className="space-y-4">
            {summary.pillarPerformance
              .sort((a, b) => b.avgEngagement - a.avgEngagement)
              .map((pp) => (
                <div key={pp.pillar}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{PILLAR_LABELS[pp.pillar]}</span>
                    <span className="text-xs text-[var(--muted)]">{pp.totalViews.toLocaleString()} views · {pp.avgEngagement.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[var(--surface)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)]"
                      style={{ width: `${(pp.avgEngagement / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="card border-[var(--accent-start)]/30">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Generate Content Similar to Top Post</h3>
            <p className="text-sm text-[var(--muted)]">
              {summary.topPosts.length > 0 ? (
                <>Create a new post mirroring the angle, hook, and structure of <strong>{summary.topPosts[0].title}</strong> ({summary.topPosts[0].views.toLocaleString()} views).</>
              ) : (
                "No performance data available to generate content."
              )}
            </p>
          </div>
          <button
            onClick={handleMirrorTopPost}
            disabled={generating || summary.topPosts.length === 0}
            className="gradient-btn whitespace-nowrap"
          >
            {generating ? "Generating..." : "🚀 Generate Similar Content"}
          </button>
        </div>
      </div>
    </div>
  );
}
