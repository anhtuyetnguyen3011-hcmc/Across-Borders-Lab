"use client";

import { useState, useEffect } from "react";
import { Draft, ScheduledPost, PublishStatus, PLATFORM_LABELS, PUBLISH_STATUS_LABELS } from "@/lib/types";

export default function SchedulePage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/drafts").then((r) => r.json()).then(setDrafts);
    fetch("/api/schedule").then((r) => r.json()).then(setPosts);
  }, []);

  const approvedDrafts = drafts.filter((d) => d.status === "approved");

  const handleSchedule = async () => {
    if (!selectedDraft || !scheduleTime) return;
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId: selectedDraft.id,
        platform: selectedDraft.platform,
        scheduledTime: new Date(scheduleTime).toISOString(),
      }),
    });
    const post = await res.json();
    setPosts((prev) => [...prev, post]);
    setSelectedDraft(null);
    setScheduleTime("");
  };

  const handlePublishNow = async (post: ScheduledPost) => {
    setPublishing(post.id);
    const draft = drafts.find((d) => d.id === post.draftId);
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        title: draft?.title || "Untitled",
        body: draft?.body || "",
        platform: post.platform,
      }),
    });
    const result = await res.json();
    await fetch("/api/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: post.id,
        publishStatus: result.status,
      }),
    });
    const updated = await fetch("/api/schedule").then((r) => r.json());
    setPosts(updated);
    setPublishing(null);
  };

  const getStatusStyle = (status: PublishStatus) => {
    if (status === "queued") return "badge bg-blue-500/20 text-blue-400";
    if (status === "published") return "badge bg-green-500/20 text-green-400";
    return "badge bg-red-500/20 text-red-400";
  };

  const bestTimeHint = () => {
    const hour = new Date().getHours();
    if (hour < 9) return "8:00 - 9:00 (morning golden hour)";
    if (hour < 12) return "12:00 - 13:00 (lunch break)";
    if (hour < 18) return "18:00 - 19:00 (commute time)";
    return "20:00 - 21:00 (evening prime time)";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Schedule & Status</h2>
        <p className="text-[var(--muted)] text-sm">Manage your posting schedule and track post status</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-3">Schedule Post</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[var(--muted)] mb-1 block">Select Approved Draft</label>
                <select
                  value={selectedDraft?.id || ""}
                  onChange={(e) => {
                    const d = approvedDrafts.find((d) => d.id === e.target.value);
                    setSelectedDraft(d || null);
                  }}
                >
                  <option value="">-- Select post --</option>
                  {approvedDrafts.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-[var(--muted)] mb-1 block">Scheduled Time</label>
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
              <div className="p-2 rounded-lg bg-[var(--surface)] text-xs text-[var(--accent-end)]">
                💡 Best posting time: {bestTimeHint()}
              </div>
              <button onClick={handleSchedule} disabled={!selectedDraft || !scheduleTime} className="gradient-btn w-full">
                Schedule Post
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[var(--surface)] text-center">
                <p className="text-2xl font-bold text-blue-400">{posts.filter((p) => p.publishStatus === "queued").length}</p>
                <p className="text-xs text-[var(--muted)]">Queued</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--surface)] text-center">
                <p className="text-2xl font-bold text-green-400">{posts.filter((p) => p.publishStatus === "published").length}</p>
                <p className="text-xs text-[var(--muted)]">Published</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="font-semibold mb-3">Publish Queue ({posts.length})</h3>
            {posts.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-8">No posts scheduled yet</p>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => {
                  const draft = drafts.find((d) => d.id === post.draftId);
                  return (
                    <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{draft?.title || "Draft"}</p>
                        <div className="flex gap-1.5 mt-1">
                          <span className="badge bg-purple-500/20 text-purple-400 text-[0.65rem]">{PLATFORM_LABELS[post.platform]}</span>
                          <span className={getStatusStyle(post.publishStatus)}>
                            {PUBLISH_STATUS_LABELS[post.publishStatus]}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-1">
                          📅 {new Date(post.scheduledTime).toLocaleString("en-US")}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {post.publishStatus === "queued" && (
                          <button
                            onClick={() => handlePublishNow(post)}
                            disabled={publishing === post.id}
                            className="text-xs gradient-btn px-3 py-1.5"
                          >
                            {publishing === post.id ? "..." : "Publish Now"}
                          </button>
                        )}
                        {post.publishStatus === "failed" && (
                          <button
                            onClick={() => handlePublishNow(post)}
                            disabled={publishing === post.id}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
