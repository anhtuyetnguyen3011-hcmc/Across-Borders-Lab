"use client";

import { useState, useEffect } from "react";
import { Draft, Platform, PILLAR_LABELS, PLATFORM_LABELS, DRAFT_STATUS_LABELS } from "@/lib/types";

export default function WritingPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editingHook, setEditingHook] = useState("");
  const [generating, setGenerating] = useState(false);
  const [repurposing, setRepurposing] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    fetch("/api/drafts").then((r) => r.json()).then(setDrafts);
  }, []);

  const handleGenerate = async () => {
    if (!selectedDraft) return;
    setGenerating(true);
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        idea: selectedDraft.title,
        platform: selectedDraft.platform,
        pillar: selectedDraft.pillar,
        hook: editingHook || selectedDraft.hook,
      }),
    });
    const data = await res.json();
    setEditingBody(data.body);
    setEditingHook(data.hook);
    setGenerating(false);
  };

  const handleRepurpose = async (draft: Draft, toPlatform: Platform) => {
    setRepurposing(draft.id);
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "repurpose",
        body: draft.body,
        fromPlatform: draft.platform,
        toPlatform,
      }),
    });
    const data = await res.json();
    const newRes = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ideaId: draft.ideaId,
        platform: toPlatform,
        pillar: draft.pillar,
        title: data.title,
        hook: data.hook,
        body: data.body,
        outline: data.body.slice(0, 100),
      }),
    });
    const newDraft = await newRes.json();
    setDrafts((prev) => [newDraft, ...prev]);
    setRepurposing(null);
  };

  const handleSave = async () => {
    if (!selectedDraft) return;
    const res = await fetch("/api/drafts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedDraft.id,
        body: editingBody,
        hook: editingHook,
      }),
    });
    const updated = await res.json();
    setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setSelectedDraft(updated);
  };

  const handleSelectDraft = (draft: Draft) => {
    setSelectedDraft(draft);
    setEditingBody(draft.body);
    setEditingHook(draft.hook);
    setShowVersions(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">AI Writing</h2>
        <p className="text-[var(--muted)] text-sm">Generate and edit content with AI assistance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-[var(--muted)] uppercase tracking-wider">Drafts</h3>
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className={`card cursor-pointer ${selectedDraft?.id === draft.id ? "border-[var(--accent-start)]" : ""}`}
              onClick={() => handleSelectDraft(draft)}
            >
              <p className="text-sm font-medium mb-1">{draft.title}</p>
              <div className="flex gap-1.5 flex-wrap">
                <span className="badge bg-purple-500/20 text-purple-400 text-[0.65rem]">{PLATFORM_LABELS[draft.platform]}</span>
                <span className="badge bg-blue-500/20 text-blue-400 text-[0.65rem]">{PILLAR_LABELS[draft.pillar]}</span>
                <span className="badge bg-gray-500/20 text-gray-400 text-[0.65rem]">v{draft.version}</span>
              </div>
              {draft.originalityRisk > 20 && (
                <div className="mt-1.5 text-xs text-[var(--warning)]">⚠️ AI detection risk: {draft.originalityRisk}%</div>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedDraft ? (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{selectedDraft.title}</h3>
                    <div className="flex gap-1.5 mt-1">
                      <span className="badge bg-purple-500/20 text-purple-400">{PLATFORM_LABELS[selectedDraft.platform]}</span>
                      <span className="badge bg-blue-500/20 text-blue-400">{PILLAR_LABELS[selectedDraft.pillar]}</span>
                      <span className="badge bg-gray-500/20 text-gray-400">{DRAFT_STATUS_LABELS[selectedDraft.status]}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedDraft.platform === "threads" ? (
                      <button
                        onClick={() => handleRepurpose(selectedDraft, "website")}
                        disabled={repurposing === selectedDraft.id}
                        className="text-xs px-3 py-1.5 rounded-lg border border-[var(--accent-start)] text-[var(--accent-end)] hover:bg-[var(--accent-start)]/10"
                      >
                        {repurposing === selectedDraft.id ? "..." : "→ Website"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRepurpose(selectedDraft, "threads")}
                        disabled={repurposing === selectedDraft.id}
                        className="text-xs px-3 py-1.5 rounded-lg border border-[var(--accent-start)] text-[var(--accent-end)] hover:bg-[var(--accent-start)]/10"
                      >
                        {repurposing === selectedDraft.id ? "..." : "→ Threads"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="text-sm text-[var(--muted)] mb-1 block">Hook / Opening</label>
                  <textarea
                    value={editingHook}
                    onChange={(e) => setEditingHook(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>

                <div className="mb-3">
                  <label className="text-sm text-[var(--muted)] mb-1 block">Content</label>
                  <textarea
                    value={editingBody}
                    onChange={(e) => setEditingBody(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button onClick={handleGenerate} disabled={generating} className="gradient-btn">
                    {generating ? "Generating..." : "✨ Generate with AI"}
                  </button>
                  <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition">
                    Save Changes
                  </button>
                  <button onClick={() => setShowVersions(!showVersions)} className="px-4 py-2 rounded-xl border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] transition">
                    History v{selectedDraft.version}
                  </button>
                </div>
              </div>

              {showVersions && selectedDraft.versionHistory.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold mb-3">Version History</h3>
                  <div className="space-y-3">
                    {selectedDraft.versionHistory.map((v, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[var(--surface)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[var(--accent-end)] font-medium">Version {v.version}</span>
                          <span className="text-xs text-[var(--muted)]">{new Date(v.createdAt).toLocaleString("en-US")}</span>
                        </div>
                        <p className="text-xs text-[var(--muted)] line-clamp-2">{v.hook}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card flex items-center justify-center min-h-[400px]">
              <p className="text-[var(--muted)]">Select a draft to start writing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
