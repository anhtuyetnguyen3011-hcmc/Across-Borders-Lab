"use client";

import { useState, useEffect } from "react";
import { Idea, Platform, Pillar, PILLAR_LABELS, PLATFORM_LABELS } from "@/lib/types";

interface TrendAngle {
  title: string;
  reason: string;
  pillar: string;
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [platform, setPlatform] = useState<Platform>("threads");
  const [pillar, setPillar] = useState<Pillar>("kinh_nghiem");
  const [expandedVariants, setExpandedVariants] = useState<string[]>([]);
  const [expanding, setExpanding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [trendTopic, setTrendTopic] = useState("");
  const [trendAngles, setTrendAngles] = useState<TrendAngle[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendSearched, setTrendSearched] = useState(false);

  useEffect(() => {
    fetch("/api/ideas").then((r) => r.json()).then(setIdeas);
  }, []);

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

  const handleDelete = async (id: string) => {
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
      Experience: "kinh_nghiem",
      Perspective: "goc_nhin",
      Knowledge: "kien_thuc",
      Lifestyle: "loi_song",
    };
    if (pillarMap[angle.pillar]) {
      setPillar(pillarMap[angle.pillar]);
    }
  };

  const priorityColor = (p: string) =>
    p === "high" ? "bg-red-500/20 text-red-400" : p === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Ideas</h2>
        <p className="text-[var(--muted)] text-sm">Start from an idea, develop with AI</p>
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
                    <button onClick={() => handleAddVariant(v)} className="text-xs gradient-btn px-3 py-1">
                      + Add
                    </button>
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
                  <button onClick={() => handleDelete(idea.id)} className="text-[var(--muted)] hover:text-[var(--danger)] text-sm p-1">
                    ✕
                  </button>
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
              <button
                onClick={handleTrendSubmit}
                disabled={trendLoading || trendTopic.trim().length < 3}
                className="gradient-btn w-full text-sm"
              >
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
                    <button
                      onClick={() => handleTurnIntoIdea(angle)}
                      className="text-xs gradient-btn px-3 py-1"
                    >
                      Turn into idea
                    </button>
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
    </div>
  );
}
