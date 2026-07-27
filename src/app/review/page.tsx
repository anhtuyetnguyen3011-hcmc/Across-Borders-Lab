"use client";

import { useState, useEffect } from "react";
import { Draft, ReviewItem, ReviewStatus, STATUS_LABELS, PLATFORM_LABELS, PILLAR_LABELS } from "@/lib/types";

export default function ReviewPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [comment, setComment] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/drafts").then((r) => r.json()).then(setDrafts);
    fetch("/api/reviews").then((r) => r.json()).then(setReviews);
  }, []);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Review & Edit</h2>
        <p className="text-[var(--muted)] text-sm">Review and approve content before publishing</p>
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
              <button onClick={() => handleOpenDetail(draft)} className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)]">
                View Details
              </button>
              <button onClick={() => handleRequestEdit(draft, review)} className="text-xs px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30">
                Request Edit
              </button>
              <button onClick={() => handleApprove(draft, review)} className="text-xs px-3 py-1.5 rounded-lg gradient-btn">
                Approve
              </button>
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
              <button onClick={() => handleRequestEdit(selectedDraft, reviews.find((r) => r.draftId === selectedDraft.id))} className="px-4 py-2 rounded-xl bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 font-medium">
                Request Edit
              </button>
              <button onClick={() => { handleApprove(selectedDraft, reviews.find((r) => r.draftId === selectedDraft.id)); setModalOpen(false); }} className="gradient-btn">
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
