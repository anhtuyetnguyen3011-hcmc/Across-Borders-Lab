"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Idea,
  Draft,
  Platform,
  Pillar,
  PILLAR_LABELS,
  PLATFORM_LABELS,
  DRAFT_STATUS_LABELS,
} from "@/lib/types";

interface TrendAngle {
  title: string;
  reason: string;
  pillar: string;
}

interface UnifiedStyleExample {
  id: string;
  source: "link" | "file";
  title: string;
  body: string;
}

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  link: { label: "Link", color: "bg-blue-500/20 text-blue-400" },
  file: { label: "File", color: "bg-orange-500/20 text-orange-400" },
};

export default function CombinedWritingPage() {
  const router = useRouter();
  const writingRef = useRef<HTMLDivElement>(null);

  // ─── Ideas state ───
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [platform, setPlatform] = useState<Platform>("threads");
  const [pillar, setPillar] = useState<Pillar>("education");
  const [expandedVariants, setExpandedVariants] = useState<string[]>([]);
  const [expanding, setExpanding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trendTopic, setTrendTopic] = useState("");
  const [trendAngles, setTrendAngles] = useState<TrendAngle[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendSearched, setTrendSearched] = useState(false);

  // ─── Style References state ───
  const [styleRefs, setStyleRefs] = useState<UnifiedStyleExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [importMode, setImportMode] = useState<"link" | "file" | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [previewSourceUrl, setPreviewSourceUrl] = useState<string | null>(null);
  const [previewSourceType, setPreviewSourceType] = useState<"link" | "file">("link");

  // ─── AI Writing state ───
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editingHook, setEditingHook] = useState("");
  const [generating, setGenerating] = useState(false);
  const [repurposing, setRepurposing] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ─── Cross-section: draft-from-idea flow ───
  const [selectedIdeaForDraft, setSelectedIdeaForDraft] = useState<Idea | null>(null);
  const [hooks, setHooks] = useState<string[]>([]);
  const [selectedHook, setSelectedHook] = useState("");
  const [generatingHooks, setGeneratingHooks] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/ideas").then((r) => r.json()),
      fetch("/api/drafts").then((r) => r.json()),
      fetch("/api/style-references").then((r) => r.json()),
    ]).then(([ideasData, draftsData, refs]) => {
      setIdeas(ideasData);
      setDrafts(draftsData);
      setStyleRefs(refs);
      setLoading(false);
    });
  }, []);

  // ─── Ideas handlers ───
  const handleAdd = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source: "manual", pillar, platform, referenceLink: link || undefined }),
    });
    const idea = await res.json();
    setIdeas((prev) => [idea, ...prev]);
    setText("");
    setLink("");
    setSubmitting(false);
  };

  const handleExpand = async () => {
    if (!text.trim()) return;
    setExpanding(true);
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "expand", text, pillar, platform }),
    });
    const { variants } = await res.json();
    setExpandedVariants(variants);
    setExpanding(false);
  };

  const handleAddVariant = async (variant: string) => {
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: variant, source: "manual", pillar, platform }),
    });
    const idea = await res.json();
    setIdeas((prev) => [idea, ...prev]);
  };

  const handleDeleteIdea = async (id: string) => {
    await fetch(`/api/ideas?id=${id}`, { method: "DELETE" });
    setIdeas((prev) => prev.filter((i) => i.id !== id));
  };

  const handleTrendSubmit = async () => {
    if (trendTopic.trim().length < 3) return;
    setTrendLoading(true);
    setTrendSearched(true);
    const res = await fetch("/api/trends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: trendTopic.trim() }),
    });
    const data = await res.json();
    setTrendAngles(data.angles || []);
    setTrendLoading(false);
  };

  const handleTurnIntoIdea = (angle: TrendAngle) => {
    setText(angle.title);
    const pillarMap: Record<string, Pillar> = {
      Education: "education",
      Career: "career",
      Lifestyle: "lifestyle",
    };
    if (pillarMap[angle.pillar]) {
      setPillar(pillarMap[angle.pillar]);
    }
  };

  const handleWriteFromIdea = (idea: Idea) => {
    setSelectedIdeaForDraft(idea);
    setSelectedHook("");
    setHooks([]);
    writingRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ─── Draft-from-idea handlers ───
  const handleGenerateHooks = async () => {
    if (!selectedIdeaForDraft) return;
    setGeneratingHooks(true);
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "hooks",
        title: selectedIdeaForDraft.text,
        pillar: selectedIdeaForDraft.pillar,
        platform: selectedIdeaForDraft.platform,
      }),
    });
    const data = await res.json();
    setHooks(data.hooks);
    setGeneratingHooks(false);
  };

  const handleCreateDraftFromIdea = async () => {
    if (!selectedIdeaForDraft || !selectedHook) return;
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ideaId: selectedIdeaForDraft.id,
        platform: selectedIdeaForDraft.platform,
        pillar: selectedIdeaForDraft.pillar,
        title: selectedIdeaForDraft.text.slice(0, 60),
        hook: selectedHook,
        body: "",
        outline: selectedIdeaForDraft.platform === "threads" ? "Thread numbered list" : "Long-form article with sections",
      }),
    });
    const draft = await res.json();
    setDrafts((prev) => [draft, ...prev]);
    setSelectedIdeaForDraft(null);
    setSelectedHook("");
    setHooks([]);
  };

  // ─── Style Reference handlers ───
  const handleImportLink = async () => {
    if (!linkUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    const formData = new FormData();
    formData.append("type", "link");
    formData.append("url", linkUrl.trim());
    const res = await fetch("/api/style-samples", { method: "POST", body: formData });
    const data = await res.json();
    if (data.success) {
      setPreviewText(data.extractedText);
      setPreviewTitle(data.title);
      setPreviewSourceUrl(data.sourceUrl);
      setPreviewSourceType("link");
    } else {
      setImportError(data.error || "Unable to fetch content from link");
    }
    setImporting(false);
  };

  const handleImportFile = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportError(null);
    const formData = new FormData();
    formData.append("type", "file");
    formData.append("file", importFile);
    const res = await fetch("/api/style-samples", { method: "POST", body: formData });
    const data = await res.json();
    if (data.success) {
      setPreviewText(data.extractedText);
      setPreviewTitle(data.title);
      setPreviewSourceUrl(null);
      setPreviewSourceType("file");
    } else {
      setImportError(data.error || "Unable to read file");
    }
    setImporting(false);
  };

  const handleSaveSample = async () => {
    if (!previewText) return;
    await fetch("/api/style-references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-sample",
        sourceType: previewSourceType,
        sourceUrl: previewSourceUrl,
        extractedText: previewText,
        title: previewTitle,
      }),
    });
    const refs = await fetch("/api/style-references").then((r) => r.json());
    setStyleRefs(refs);
    setPreviewText(null);
    setPreviewTitle(null);
    setPreviewSourceUrl(null);
    setImportMode(null);
    setLinkUrl("");
    setImportFile(null);
  };

  const handleDeleteSample = async (sampleId: string) => {
    await fetch("/api/style-references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-sample", sampleId }),
    });
    const refs = await fetch("/api/style-references").then((r) => r.json());
    setStyleRefs(refs);
  };

  const handleRemoveRef = async (ref: UnifiedStyleExample) => {
    await handleDeleteSample(ref.id);
  };

  // ─── AI Writing handlers ───
  const handleGenerate = async () => {
    if (!selectedDraft) return;
    setGenerating(true);
    setAiError(null);
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
    if (!res.ok) {
      setAiError(data.error || "AI generation failed");
      setGenerating(false);
      return;
    }
    setEditingBody(data.body);
    setEditingHook(data.hook);
    setGenerating(false);
  };

  const handleRepurpose = async (draft: Draft, toPlatform: Platform) => {
    setRepurposing(draft.id);
    setAiError(null);
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
    if (!res.ok) {
      setAiError(data.error || "AI repurposing failed");
      setRepurposing(null);
      return;
    }
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
    if (!newRes.ok) {
      const err = await newRes.json();
      setAiError(err.error || "Failed to save repurposed draft");
      setRepurposing(null);
      return;
    }
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

  const handleSubmitForReview = async () => {
    if (!selectedDraft) return;
    const res = await fetch("/api/drafts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedDraft.id,
        status: "needs_review",
      }),
    });
    if (!res.ok) return;
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === selectedDraft.id ? { ...d, status: "needs_review" as const } : d
      )
    );
    setSelectedDraft((prev) => (prev ? { ...prev, status: "needs_review" as const } : null));
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId: selectedDraft.id }),
    });
    router.push("/schedule");
  };

  const handleSelectDraft = (draft: Draft) => {
    setSelectedDraft(draft);
    setEditingBody(draft.body);
    setEditingHook(draft.hook);
    setShowVersions(false);
  };

  const priorityColor = (p: string) =>
    p === "high" ? "bg-red-500/20 text-red-400" : p === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400";

  return (
    <div className="space-y-10">
      {/* ═══════════ Section 1: Ideas ═══════════ */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">💡</span>
          <div>
            <h2 className="text-2xl font-bold">Ideas</h2>
            <p className="text-[var(--muted)] text-sm">Start from an idea, develop with AI</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h3 className="font-semibold mb-3">Add New Idea</h3>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your idea..."
                className="min-h-[80px] mb-3"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Reference link (optional)"
                />
                <div className="flex gap-2">
                  <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className="flex-1">
                    <option value="threads">Threads</option>
                    <option value="website">Website</option>
                  </select>
                  <select value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)} className="flex-1">
                    {Object.entries(PILLAR_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={submitting || !text.trim()}
                  className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    text.trim() && !submitting
                      ? "bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-[var(--surface)] text-[var(--muted)] opacity-50 cursor-not-allowed"
                  }`}
                >
                  {submitting ? "Adding..." : "Add Idea"}
                </button>
                <button onClick={handleExpand} disabled={expanding || !text.trim()} className="px-4 py-2 rounded-xl border border-[var(--accent-start)] text-[var(--accent-end)] font-medium hover:bg-[var(--accent-start)]/10 transition disabled:opacity-50">
                  {expanding ? "Generating..." : "✨ Expand with AI"}
                </button>
              </div>
            </div>

            {expandedVariants.length > 0 && (
              <div className="card border-[var(--accent-start)]/50">
                <h3 className="font-semibold mb-3 text-[var(--accent-end)]">AI Perspectives</h3>
                <div className="space-y-2">
                  {expandedVariants.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)]">
                      <span className="flex-1 text-sm">{v}</span>
                      <button onClick={() => handleAddVariant(v)} className="text-xs gradient-btn px-3 py-1">+ Add</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">Idea List ({ideas.length})</h3>
              <div className="space-y-3">
                {ideas.map((idea) => (
                  <div key={idea.id} className="card flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm mb-2">{idea.text}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`badge ${priorityColor(idea.priority)}`}>
                          {idea.priorityScore} · {idea.priority === "high" ? "High" : idea.priority === "medium" ? "Med" : "Low"}
                        </span>
                        <span className="badge bg-purple-500/20 text-purple-400">{PLATFORM_LABELS[idea.platform]}</span>
                        <span className="badge bg-blue-500/20 text-blue-400">{PILLAR_LABELS[idea.pillar]}</span>
                        <span className="badge bg-gray-500/20 text-gray-400">{idea.source}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleWriteFromIdea(idea)} className="text-xs gradient-btn px-3 py-1.5">✍️ Write</button>
                      <button onClick={() => handleDeleteIdea(idea.id)} className="text-[var(--muted)] hover:text-[var(--danger)] text-sm p-1">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <h3 className="font-semibold mb-3">🔥 Trends</h3>
              <div className="mb-3">
                <input
                  value={trendTopic}
                  onChange={(e) => setTrendTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleTrendSubmit(); }}
                  placeholder="Enter a topic you care about..."
                  className="mb-2"
                />
                <button onClick={handleTrendSubmit} disabled={trendLoading || trendTopic.trim().length < 3} className="gradient-btn w-full text-sm">
                  {trendLoading ? "Analyzing..." : "Get AI Suggestions"}
                </button>
              </div>
              {trendLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-[var(--accent-start)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-[var(--muted)]">Generating trending angles...</span>
                  </div>
                </div>
              )}
              {!trendLoading && trendSearched && trendAngles.length > 0 && (
                <div className="space-y-2">
                  {trendAngles.map((angle, i) => (
                    <div key={i} className="p-3 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="badge bg-purple-500/20 text-purple-400 text-[0.6rem]">{angle.pillar}</span>
                        <span className="text-[0.6rem] text-[var(--accent-end)] italic">AI Suggestion</span>
                      </div>
                      <p className="text-sm font-medium mb-1">{angle.title}</p>
                      <p className="text-xs text-[var(--muted)] mb-2">{angle.reason}</p>
                      <button onClick={() => handleTurnIntoIdea(angle)} className="text-xs gradient-btn px-3 py-1">Turn into idea</button>
                    </div>
                  ))}
                </div>
              )}
              {!trendLoading && trendSearched && trendAngles.length === 0 && (
                <p className="text-xs text-[var(--muted)] text-center py-4">No angles found. Try a different topic.</p>
              )}
              {!trendSearched && (
                <p className="text-xs text-[var(--muted)] text-center py-4">Enter a topic to get AI-suggested trending angles</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <hr className="border-[var(--card-border)]" />

      {/* ═══════════ Section 2: Style Reference ═══════════ */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🎨</span>
          <div>
            <h2 className="text-2xl font-bold">Style Reference</h2>
            <p className="text-[var(--muted)] text-sm">
              Add samples from links or files so AI can learn your writing style.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="card flex items-center justify-center min-h-[200px]">
            <p className="text-[var(--muted)]">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card border-[var(--accent-start)]/30">
              <h3 className="font-semibold mb-3">Add Sample from Link or File</h3>
              {!importMode ? (
                <div className="flex gap-3">
                  <button onClick={() => setImportMode("link")} className="flex-1 p-4 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent-start)] text-left transition">
                    <p className="font-medium text-sm">🔗 From link</p>
                    <p className="text-xs text-[var(--muted)] mt-1">Paste a Threads or website URL</p>
                  </button>
                  <button onClick={() => setImportMode("file")} className="flex-1 p-4 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent-start)] text-left transition">
                    <p className="font-medium text-sm">📄 From file</p>
                    <p className="text-xs text-[var(--muted)] mt-1">Upload a .docx or .pdf file</p>
                  </button>
                </div>
              ) : previewText ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{previewTitle || "Preview"}</p>
                    <button onClick={() => { setPreviewText(null); setImportMode(null); }} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">✕ Close</button>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--surface)] text-xs text-[var(--muted)] max-h-40 overflow-y-auto whitespace-pre-wrap">{previewText}</div>
                  <button onClick={handleSaveSample} className="gradient-btn text-sm">Save as Style Reference</button>
                </div>
              ) : importMode === "link" ? (
                <div className="space-y-3">
                  <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://twitter.com/... or https://example.com/..." />
                  {importError && <p className="text-xs text-red-400">{importError}</p>}
                  <div className="flex gap-2">
                    <button onClick={handleImportLink} disabled={importing || !linkUrl.trim()} className="gradient-btn text-sm">
                      {importing ? "Fetching content..." : "Fetch Content"}
                    </button>
                    <button onClick={() => { setImportMode(null); setImportError(null); }} className="px-4 py-2 rounded-xl border border-[var(--card-border)] text-[var(--muted)] text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="gradient-btn text-sm whitespace-nowrap cursor-pointer">
                      Choose .docx / .pdf file
                      <input type="file" accept=".docx,.pdf" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                    {importFile && <span className="text-xs text-[var(--muted)]">{importFile.name}</span>}
                  </div>
                  {importError && <p className="text-xs text-red-400">{importError}</p>}
                  <div className="flex gap-2">
                    <button onClick={handleImportFile} disabled={importing || !importFile} className="gradient-btn text-sm">
                      {importing ? "Reading file..." : "Read Content"}
                    </button>
                    <button onClick={() => { setImportMode(null); setImportFile(null); setImportError(null); }} className="px-4 py-2 rounded-xl border border-[var(--card-border)] text-[var(--muted)] text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Selected Style References ({styleRefs.length})</h3>
                <span className="text-xs text-[var(--muted)]">AI uses samples when generating new content</span>
              </div>
              {styleRefs.length === 0 ? (
                <p className="text-[var(--muted)] text-sm">No style references yet. Import a link or file above.</p>
              ) : (
                <div className="space-y-3">
                  {styleRefs.map((ref) => {
                    const badge = SOURCE_BADGES[ref.source] || SOURCE_BADGES.link;
                    return (
                      <div key={ref.id} className="p-3 rounded-lg bg-[var(--surface)] flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ref.title}</p>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            <span className={`badge text-[0.65rem] ${badge.color}`}>{badge.label}</span>
                          </div>
                          <p className="text-xs text-[var(--muted)] mt-1 line-clamp-1">{ref.body.slice(0, 100)}...</p>
                        </div>
                        <button onClick={() => handleRemoveRef(ref)} className="ml-4 text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0">Remove</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>


          </div>
        )}
      </section>

      <hr className="border-[var(--card-border)]" />

      {/* ═══════════ Section 3: AI Writing ═══════════ */}
      <section ref={writingRef}>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">✍️</span>
          <div>
            <h2 className="text-2xl font-bold">AI Writing</h2>
            <p className="text-[var(--muted)] text-sm">Generate and edit content with AI assistance</p>
          </div>
        </div>

        {/* Idea-to-draft: shown when an idea is selected via ✍️ Write */}
        {selectedIdeaForDraft && (
          <div className="card border-[var(--accent-start)]/30 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Create Draft from Idea</h3>
              <button onClick={() => { setSelectedIdeaForDraft(null); setSelectedHook(""); setHooks([]); }} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">✕ Cancel</button>
            </div>
            <div className="flex gap-1.5 mb-3">
              <span className="badge bg-purple-500/20 text-purple-400">{PLATFORM_LABELS[selectedIdeaForDraft.platform]}</span>
              <span className="badge bg-blue-500/20 text-blue-400">{PILLAR_LABELS[selectedIdeaForDraft.pillar]}</span>
            </div>
            <p className="text-sm mb-3 text-[var(--muted)]">{selectedIdeaForDraft.text}</p>
            {hooks.length === 0 ? (
              <button onClick={handleGenerateHooks} disabled={generatingHooks} className="gradient-btn">
                {generatingHooks ? "Generating hooks..." : "✨ Suggest Hooks with AI"}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-[var(--muted)]">Select an opening hook:</p>
                {hooks.map((h, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg cursor-pointer text-sm transition ${
                      selectedHook === h ? "bg-[var(--accent-start)]/20 border border-[var(--accent-start)]" : "bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
                    }`}
                    onClick={() => setSelectedHook(h)}
                  >
                    {h}
                  </div>
                ))}
                <button onClick={handleCreateDraftFromIdea} disabled={!selectedHook} className="gradient-btn mt-2">
                  Create Draft
                </button>
              </div>
            )}
          </div>
        )}

        {/* Drafts list & editor */}
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
                        <button onClick={() => handleRepurpose(selectedDraft, "website")} disabled={repurposing === selectedDraft.id} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--accent-start)] text-[var(--accent-end)] hover:bg-[var(--accent-start)]/10">
                          {repurposing === selectedDraft.id ? "..." : "→ Website"}
                        </button>
                      ) : (
                        <button onClick={() => handleRepurpose(selectedDraft, "threads")} disabled={repurposing === selectedDraft.id} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--accent-start)] text-[var(--accent-end)] hover:bg-[var(--accent-start)]/10">
                          {repurposing === selectedDraft.id ? "..." : "→ Threads"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="text-sm text-[var(--muted)] mb-1 block">Hook / Opening</label>
                    <textarea value={editingHook} onChange={(e) => setEditingHook(e.target.value)} className="min-h-[60px]" />
                  </div>

                  <div className="mb-3">
                    <label className="text-sm text-[var(--muted)] mb-1 block">Content</label>
                    <textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} className="min-h-[300px] font-mono text-sm" />
                  </div>

                  {aiError && (
                    <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                      ⚠️ {aiError}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <button onClick={handleGenerate} disabled={generating} className="gradient-btn">
                      {generating ? "Generating..." : "✨ Generate with AI"}
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition">Save Changes</button>
                    {selectedDraft.status === "draft" && (
                      <button onClick={handleSubmitForReview} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition">
                        Submit for Review
                      </button>
                    )}
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
      </section>
    </div>
  );
}
