"use client";

import { useState, useEffect } from "react";
import { Idea, Draft, Platform, Pillar, PILLAR_LABELS, PLATFORM_LABELS } from "@/lib/types";

export default function PlanningPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [platform, setPlatform] = useState<Platform>("threads");
  const [pillar, setPillar] = useState<Pillar>("kinh_nghiem");
  const [hooks, setHooks] = useState<string[]>([]);
  const [selectedHook, setSelectedHook] = useState("");
  const [generatingHooks, setGeneratingHooks] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetch("/api/ideas").then((r) => r.json()).then(setIdeas);
    fetch("/api/drafts").then((r) => r.json()).then(setDrafts);
  }, []);

  const handleSelectIdea = (idea: Idea) => {
    setSelectedIdea(idea);
    setPlatform(idea.platform);
    setPillar(idea.pillar);
  };

  const handleGenerateHooks = async () => {
    if (!selectedIdea) return;
    setGeneratingHooks(true);
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "hooks", title: selectedIdea.text, pillar, platform }),
    });
    const data = await res.json();
    setHooks(data.hooks);
    setGeneratingHooks(false);
  };

  const handleCreateDraft = async () => {
    if (!selectedIdea || !selectedHook) return;
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ideaId: selectedIdea.id,
        platform,
        pillar,
        title: selectedIdea.text.slice(0, 60),
        hook: selectedHook,
        body: "",
        outline: platform === "threads" ? "Thread numbered list" : "Long-form article with sections",
      }),
    });
    const draft = await res.json();
    setDrafts((prev) => [draft, ...prev]);
    setSelectedIdea(null);
    setSelectedHook("");
    setHooks([]);
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const calendarDrafts = drafts.filter((d) => {
    const date = new Date(d.createdAt);
    return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Planning</h2>
        <p className="text-[var(--muted)] text-sm">Turn ideas into drafts and schedule your content</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-3">Create Draft from Idea</h3>
            <div className="mb-3">
              <label className="text-sm text-[var(--muted)] mb-1 block">Select Idea</label>
              <select
                value={selectedIdea?.id || ""}
                onChange={(e) => {
                  const idea = ideas.find((i) => i.id === e.target.value);
                  if (idea) handleSelectIdea(idea);
                }}
              >
                <option value="">-- Select an idea --</option>
                {ideas.map((i) => (
                  <option key={i.id} value={i.id}>{i.text.slice(0, 60)}</option>
                ))}
              </select>
            </div>
            {selectedIdea && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-sm text-[var(--muted)] mb-1 block">Platform</label>
                    <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                      <option value="threads">Threads (short thread)</option>
                      <option value="website">Website (long-form)</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-[var(--muted)] mb-1 block">Pillar</label>
                    <select value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)}>
                      {Object.entries(PILLAR_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button onClick={handleGenerateHooks} disabled={generatingHooks} className="gradient-btn">
                  {generatingHooks ? "Generating hooks..." : "✨ Suggest Hooks with AI"}
                </button>
                {hooks.length > 0 && (
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
                    <button onClick={handleCreateDraft} disabled={!selectedHook} className="gradient-btn mt-2">
                      Create Draft
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Editorial Calendar</h3>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="text-[var(--muted)] hover:text-[var(--foreground)] px-2">
                ←
              </button>
              <span className="font-medium capitalize">{monthLabel}</span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="text-[var(--muted)] hover:text-[var(--foreground)] px-2">
                →
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-[var(--muted)] font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayDrafts = calendarDrafts.filter(
                  (d) => new Date(d.createdAt).getDate() === day
                );
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth();
                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg p-1 text-xs flex flex-col items-center justify-start pt-1.5 ${
                      isToday ? "bg-[var(--accent-start)]/20 border border-[var(--accent-start)]" : "bg-[var(--surface)]"
                    }`}
                  >
                    <span className={`text-[0.65rem] ${isToday ? "text-[var(--accent-end)] font-bold" : ""}`}>{day}</span>
                    {dayDrafts.length > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-end)] mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 className="font-semibold mb-3">Current Drafts</h3>
            <div className="space-y-2">
              {drafts.length === 0 && (
                <p className="text-sm text-[var(--muted)]">No drafts yet</p>
              )}
              {drafts.map((draft) => (
                <div key={draft.id} className="p-3 rounded-lg bg-[var(--surface)]">
                  <p className="text-sm font-medium mb-1">{draft.title}</p>
                  <div className="flex gap-1.5">
                    <span className="badge bg-purple-500/20 text-purple-400 text-[0.65rem]">{PLATFORM_LABELS[draft.platform]}</span>
                    <span className="badge bg-blue-500/20 text-blue-400 text-[0.65rem]">{PILLAR_LABELS[draft.pillar]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
