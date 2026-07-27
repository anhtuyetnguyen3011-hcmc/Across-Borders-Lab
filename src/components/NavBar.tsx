"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/ideas", label: "Ideas", icon: "💡" },
  { href: "/planning", label: "Planning", icon: "📋" },
  { href: "/writing", label: "AI Writing", icon: "✍️" },
  { href: "/style-references", label: "Style Reference", icon: "🎨" },
  { href: "/review", label: "Review & Edit", icon: "🔍" },
  { href: "/schedule", label: "Schedule & Status", icon: "📅" },
  { href: "/analytics", label: "Analytics", icon: "📊" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--card-border)]">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] bg-clip-text text-transparent">
              Across Border Lab
            </h1>
            <p className="text-xs text-[var(--muted)]">Your E2E Content Creation Tool</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  isActive ? "tab-active" : "tab-inactive"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
