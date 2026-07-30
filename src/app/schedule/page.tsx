"use client";

import { useState, useEffect } from "react";
import {
  Draft,
  ScheduledPost,
  ReviewItem,
  ReviewStatus,
  PublishStatus,
  STATUS_LABELS,
  PLATFORM_LABELS,
  PILLAR_LABELS,
  PUBLISH_STATUS_LABELS,
} from "@/lib/types";

interface CalendarDay {
  day: number;
  posts: { id: string; title: string; status: "published" | "queued"; time: string }[];
  published: number;
  scheduled: number;
}

export default function CombinedSchedulePage() {
  // ─── Review state ───
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [comment, setComment] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // ─── Schedule state ───
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [selectedScheduledDraft, setSelectedScheduledDraft] = useState<Draft | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [publishing, setPublishing] = useState<string | null>(null);

  // ─── Editorial Calendar state ───
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    Promise.all([
      fetch("/api/drafts").then((r) => r.json()),
      fetch("/api/reviews").then((r) => r.json()),
      fetch("/api/schedule").then((r) => r.json()),
    ]).then(([draftsData, reviewsData, postsData]) => {
      setDrafts(draftsData);
      setReviews(reviewsData);
      setPosts(postsData);
    });
  }, []);

  // ─── Review handlers ───
  const draftsWithReviews = drafts
    .filter((d) => d.status !== "draft")
    .map((d) => ({
      draft: d,
      review: reviews.find((r) => r.draftId === d.id),
    }));

  const getStatusBadge = (status?: ReviewStatus) => {
    if (!status) return "badge bg-gray-500/20 text-gray-400";
    if (status === "pending") return "badge bg-yellow-500/20 text-yellow-400";
    if (status === "needs_edit") return "badge bg-red-500/20 text-red-400";
    return "badge bg-green-500/20 text-green-400";
  };

  const handleApprove = async (draft: Draft, review?: ReviewItem) => {
    if (review) {
      await fetch("/api/reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.id, status: "approved" }),
      });
    } else {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id, status: "approved", aiRiskNotes: [] }),
      });
    }
    await fetch("/api/drafts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draft.id, status: "approved" }),
    });
    const [updatedDrafts, updatedReviews] = await Promise.all([
      fetch("/api/drafts").then((r) => r.json()),
      fetch("/api/reviews").then((r) => r.json()),
    ]);
    setDrafts(updatedDrafts);
    setReviews(updatedReviews);
  };

  const handleRequestEdit = async (draft: Draft, review?: ReviewItem) => {
    if (review) {
      await fetch("/api/reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.id, status: "needs_edit", reviewerComments: comment }),
      });
    } else {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id, status: "needs_edit", aiRiskNotes: [], reviewerComments: comment }),
      });
    }
    await fetch("/api/drafts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draft.id, status: "needs_edit" }),
    });
    const [updatedDrafts, updatedReviews] = await Promise.all([
      fetch("/api/drafts").then((r) => r.json()),
      fetch("/api/reviews").then((r) => r.json()),
    ]);
    setDrafts(updatedDrafts);
    setReviews(updatedReviews);
    setComment("");
    setModalOpen(false);
  };

  const handleOpenDetail = (draft: Draft) => {
    setSelectedDraft(draft);
    setModalOpen(true);
  };

  // ─── Schedule handlers ───
  const approvedDrafts = drafts.filter((d) => d.status === "approved");

  const handleSchedule = async () => {
    if (!selectedScheduledDraft || !scheduleTime) return;
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId: selectedScheduledDraft.id,
        platform: selectedScheduledDraft.platform,
        scheduledTime: new Date(scheduleTime).toISOString(),
      }),
    });
    const post = await res.json();
    setPosts((prev) => [...prev, post]);
    setSelectedScheduledDraft(null);
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

  // ─── Editorial Calendar ───
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const calendarDays: CalendarDay[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayPosts = posts.filter((sp) => {
      const d = new Date(sp.scheduledTime);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
    calendarDays.push({
      day,
      posts: dayPosts.map((sp) => ({
        id: sp.id,
        title: drafts.find((d) => d.id === sp.draftId)?.title || "Untitled",
        status: sp.publishStatus as "published" | "queued",
        time: new Date(sp.scheduledTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      })),
      published: dayPosts.filter((sp) => sp.publishStatus === "published").length,
      scheduled: dayPosts.filter((sp) => sp.publishStatus === "queued").length,
    });
  }

  const isToday = (day: number) => {
    const now = new Date();
    return now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
  };

  return (
    <div className="space-y-10">
      {/* ═══════════ Section 1: Review & Edit ═══════════ */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🔍</span>
          <div>
            <h2 className="text-2xl font-bold">Review & Edit</h2>
            <p className="text-[var(--muted)] text-sm">Review and approve content before publishing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {draftsWithReviews.length === 0 && (
            <div className="card col-span-full flex items-center justify-center min-h-[200px]">
              <p className="text-[var(--muted)]">No drafts pending review</p>
            </div>
          )}
          {draftsWithReviews.map(({ draft, review }) => (
            <div key={draft.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm">{draft.title}</h4>
                <span className={getStatusBadge(review?.status)}>
                  {review ? STATUS_LABELS[review.status] : "Pending Review"}
                </span>
              </div>
              <div className="flex gap-1.5 mb-3">
                <span className="badge bg-purple-500/20 text-purple-400 text-[0.65rem]">{PLATFORM_LABELS[draft.platform]}</span>
                <span className="badge bg-blue-500/20 text-blue-400 text-[0.65rem]">{PILLAR_LABELS[draft.pillar]}</span>
              </div>
              <p className="text-xs text-[var(--muted)] mb-2 line-clamp-2">{draft.hook}</p>

              {review?.aiRiskNotes && review.aiRiskNotes.length > 0 && (
                <div className="mb-3 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  {review.aiRiskNotes.map((note, i) => (
                    <p key={i} className="text-xs text-yellow-400">⚠ {note}</p>
                  ))}
                </div>
              )}

              {review?.reviewerComments && (
                <p className="text-xs text-[var(--accent-end)] mb-2">💬 {review.reviewerComments}</p>
              )}

              <div className="flex gap-2">
                <button onClick={() => handleOpenDetail(draft)} className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)]">View Details</button>
                <button onClick={() => handleRequestEdit(draft, review)} className="text-xs px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30">Request Edit</button>
                <button onClick={() => handleApprove(draft, review)} className="text-xs px-3 py-1.5 rounded-lg gradient-btn">Approve</button>
              </div>
            </div>
          ))}
        </div>

        {modalOpen && selectedDraft && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
            <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{selectedDraft.title}</h3>
                <button onClick={() => setModalOpen(false)} className="text-[var(--muted)] hover:text-[var(--foreground)] text-xl">✕</button>
              </div>
              <div className="flex gap-1.5 mb-4">
                <span className="badge bg-purple-500/20 text-purple-400">{PLATFORM_LABELS[selectedDraft.platform]}</span>
                <span className="badge bg-blue-500/20 text-blue-400">{PILLAR_LABELS[selectedDraft.pillar]}</span>
              </div>
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-[var(--muted)] mb-1">Hook</h4>
                <p className="text-sm">{selectedDraft.hook}</p>
              </div>
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-[var(--muted)] mb-1">Nội dung</h4>
                <div className="text-sm whitespace-pre-wrap bg-[var(--surface)] rounded-lg p-4 max-h-[300px] overflow-y-auto">{selectedDraft.body}</div>
              </div>
              <div className="mb-4">
                <label className="text-sm text-[var(--muted)] mb-1 block">Edit Request Notes</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Enter reason for requesting edit..." className="min-h-[60px]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleRequestEdit(selectedDraft, reviews.find((r) => r.draftId === selectedDraft.id))} className="px-4 py-2 rounded-xl bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 font-medium">Request Edit</button>
                <button onClick={() => { handleApprove(selectedDraft, reviews.find((r) => r.draftId === selectedDraft.id)); setModalOpen(false); }} className="gradient-btn">Approve</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <hr className="border-[var(--card-border)]" />

      {/* ═══════════ Section 2: Schedule & Publish ═══════════ */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📅</span>
          <div>
            <h2 className="text-2xl font-bold">Schedule & Publish</h2>
            <p className="text-[var(--muted)] text-sm">Manage your posting schedule and track post status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold mb-3">Schedule Post</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-[var(--muted)] mb-1 block">Select Approved Draft</label>
                  <select
                    value={selectedScheduledDraft?.id || ""}
                    onChange={(e) => {
                      const d = approvedDrafts.find((d) => d.id === e.target.value);
                      setSelectedScheduledDraft(d || null);
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
                  <input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                </div>
                <div className="p-2 rounded-lg bg-[var(--surface)] text-xs text-[var(--accent-end)]">
                  💡 Best posting time: {bestTimeHint()}
                </div>
                <button onClick={handleSchedule} disabled={!selectedScheduledDraft || !scheduleTime} className="gradient-btn w-full">Schedule Post</button>
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
                            <span className={getStatusStyle(post.publishStatus)}>{PUBLISH_STATUS_LABELS[post.publishStatus]}</span>
                          </div>
                          <p className="text-xs text-[var(--muted)] mt-1">📅 {new Date(post.scheduledTime).toLocaleString("en-US")}</p>
                        </div>
                        <div className="flex gap-1">
                          {post.publishStatus === "queued" && (
                            <button onClick={() => handlePublishNow(post)} disabled={publishing === post.id} className="text-xs gradient-btn px-3 py-1.5">
                              {publishing === post.id ? "..." : "Publish Now"}
                            </button>
                          )}
                          {post.publishStatus === "failed" && (
                            <button onClick={() => handlePublishNow(post)} disabled={publishing === post.id} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">Retry</button>
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
      </section>

      <hr className="border-[var(--card-border)]" />

      {/* ═══════════ Section 3: Editorial Calendar ═══════════ */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📊</span>
          <div>
            <h2 className="text-2xl font-bold">Editorial Calendar</h2>
            <p className="text-[var(--muted)] text-sm">Track your posting frequency and consistency</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(new Date(year, month - 1))}
              className="text-[var(--muted)] hover:text-[var(--foreground)] px-2 text-lg"
            >
              ←
            </button>
            <span className="font-semibold capitalize">{monthLabel}</span>
            <button
              onClick={() => setCurrentMonth(new Date(year, month + 1))}
              className="text-[var(--muted)] hover:text-[var(--foreground)] px-2 text-lg"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-xs">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-[var(--muted)] font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {calendarDays.map((dayData) => {
              const today = isToday(dayData.day);
              const hasPublished = dayData.published > 0;
              const hasScheduled = dayData.scheduled > 0;
              let cellStyle = "bg-[var(--surface)]";
              if (hasPublished) {
                cellStyle = "bg-[var(--accent-start)]/30 border-2 border-[var(--accent-start)]";
              } else if (hasScheduled) {
                cellStyle = "bg-blue-500/10 border-2 border-dashed border-blue-400";
              }
              if (today) {
                cellStyle += " ring-2 ring-[var(--accent-end)]";
              }
              return (
                <div
                  key={dayData.day}
                  className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-start pt-1.5 text-xs transition ${cellStyle}`}
                  title={dayData.posts.map((p) => `${p.title} (${p.status})`).join("\n")}
                >
                  <span className={`text-[0.65rem] ${today ? "text-[var(--accent-end)] font-bold" : ""}`}>
                    {dayData.day}
                  </span>
                  {hasPublished && <span className="w-2 h-2 rounded-full bg-[var(--accent-end)] mt-0.5" />}
                  {hasScheduled && !hasPublished && <span className="w-2 h-2 rounded-full bg-blue-400 mt-0.5" />}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 mt-5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[var(--accent-start)]/30 border border-[var(--accent-start)]" />
              <span className="text-[var(--muted)]">Published</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-blue-500/10 border border-dashed border-blue-400" />
              <span className="text-[var(--muted)]">Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[var(--surface)]" />
              <span className="text-[var(--muted)]">No post</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
