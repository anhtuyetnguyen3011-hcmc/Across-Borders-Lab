"use client";

import { useState, useEffect } from "react";
import { PLATFORM_LABELS, PILLAR_LABELS, DRAFT_STATUS_LABELS } from "@/lib/types";

interface UnifiedStyleExample {
  id: string;
  source: "link" | "file" | "draft";
  title: string;
  body: string;
  platform?: string;
  pillar?: string;
}

interface Draft {
  id: string;
  title: string;
  hook: string;
  platform: string;
  pillar: string;
  status: string;
  isStyleReference: boolean;
}

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-green-500/20 text-green-400" },
  link: { label: "Link", color: "bg-blue-500/20 text-blue-400" },
  file: { label: "File", color: "bg-orange-500/20 text-orange-400" },
};

export default function StyleReferencesPage() {
  const [allDrafts, setAllDrafts] = useState<Draft[]>([]);
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

  useEffect(() => {
    Promise.all([
      fetch("/api/drafts").then((r) => r.json()),
      fetch("/api/style-references").then((r) => r.json()),
    ]).then(([drafts, refs]) => {
      setAllDrafts(drafts);
      setStyleRefs(refs);
      setLoading(false);
    });
  }, []);

  const handleToggleDraft = async (draftId: string, isStyleReference: boolean) => {
    await fetch("/api/style-references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", draftId, isStyleReference }),
    });
    const refs = await fetch("/api/style-references").then((r) => r.json());
    setStyleRefs(refs);
  };

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
    if (ref.source === "draft") {
      await handleToggleDraft(ref.id, false);
    } else {
      await handleDeleteSample(ref.id);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Style Reference</h2>
          <p className="text-[var(--muted)] text-sm">Manage writing samples so AI can learn your style</p>
        </div>
        <div className="card flex items-center justify-center min-h-[200px]">
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Style Reference</h2>
        <p className="text-[var(--muted)] text-sm">
          Add samples from links, files, or mark existing drafts so AI can learn your writing style.
          {styleRefs.length === 0 && " The system will automatically pick the 5 highest-performing posts if you haven't selected any."}
        </p>
      </div>

      <div className="card border-[var(--accent-start)]/30">
        <h3 className="font-semibold mb-3">Add Sample from Link or File</h3>
        {!importMode ? (
          <div className="flex gap-3">
            <button
              onClick={() => setImportMode("link")}
              className="flex-1 p-4 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent-start)] text-left transition"
            >
              <p className="font-medium text-sm">🔗 From link</p>
              <p className="text-xs text-[var(--muted)] mt-1">Paste a Threads or website URL</p>
            </button>
            <button
              onClick={() => setImportMode("file")}
              className="flex-1 p-4 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent-start)] text-left transition"
            >
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
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://twitter.com/... or https://example.com/..."
            />
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
                <input
                  type="file"
                  accept=".docx,.pdf"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
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
          <span className="text-xs text-[var(--muted)]">AI uses up to 5 samples when generating new content</span>
        </div>
        {styleRefs.length === 0 ? (
          <p className="text-[var(--muted)] text-sm">No manual references. Using default (5 highest-performing posts).</p>
        ) : (
          <div className="space-y-3">
            {styleRefs.map((ref) => {
              const badge = SOURCE_BADGES[ref.source] || SOURCE_BADGES.draft;
              return (
                <div key={ref.id} className="p-3 rounded-lg bg-[var(--surface)] flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ref.title}</p>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <span className={`badge text-[0.65rem] ${badge.color}`}>{badge.label}</span>
                      {ref.platform && <span className="badge bg-purple-500/20 text-purple-400 text-[0.65rem]">{PLATFORM_LABELS[ref.platform as keyof typeof PLATFORM_LABELS]}</span>}
                      {ref.pillar && <span className="badge bg-blue-500/20 text-blue-400 text-[0.65rem]">{PILLAR_LABELS[ref.pillar as keyof typeof PILLAR_LABELS]}</span>}
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1 line-clamp-1">{ref.body.slice(0, 100)}...</p>
                  </div>
                  <button
                    onClick={() => handleRemoveRef(ref)}
                    className="ml-4 text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">All Drafts</h3>
        <div className="space-y-3">
          {allDrafts.map((draft) => {
            const isRef = styleRefs.some((r) => r.id === draft.id && r.source === "draft");
            return (
              <div key={draft.id} className={`p-3 rounded-lg bg-[var(--surface)] flex items-center justify-between ${isRef ? "border border-green-500/30" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{draft.title}</p>
                    {isRef && <span className="badge bg-green-500/20 text-green-400 text-[0.65rem]">Reference</span>}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <span className="badge bg-purple-500/20 text-purple-400 text-[0.65rem]">{PLATFORM_LABELS[draft.platform as keyof typeof PLATFORM_LABELS]}</span>
                    <span className="badge bg-blue-500/20 text-blue-400 text-[0.65rem]">{PILLAR_LABELS[draft.pillar as keyof typeof PILLAR_LABELS]}</span>
                    <span className="badge bg-gray-500/20 text-gray-400 text-[0.65rem]">{DRAFT_STATUS_LABELS[draft.status as keyof typeof DRAFT_STATUS_LABELS]}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1 line-clamp-1">{draft.hook}</p>
                </div>
                <button
                  onClick={() => handleToggleDraft(draft.id, !isRef)}
                  className={`ml-4 text-xs px-3 py-1.5 rounded-lg border shrink-0 ${
                    isRef
                      ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                      : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                  }`}
                >
                  {isRef ? "Remove" : "Add as Reference"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
