import type { StyleSamplePlatform } from "./types";

export function detectPlatformFromSource(
  sourceType: "link" | "file",
  sourceUrl?: string | null
): StyleSamplePlatform | null {
  if (sourceType === "file") return null;
  if (!sourceUrl) return "website";
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase();
    if (
      host === "threads.net" || host === "www.threads.net" || host.endsWith(".threads.net") ||
      host === "threads.com" || host === "www.threads.com" || host.endsWith(".threads.com")
    ) {
      return "threads";
    }
    return "website";
  } catch {
    return "website";
  }
}

export function isNotionUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "notion.site" ||
      host.endsWith(".notion.site") ||
      host === "notion.so" ||
      host.endsWith(".notion.so")
    );
  } catch {
    return false;
  }
}

export function isStyleSamplePlatform(value: unknown): value is StyleSamplePlatform {
  return value === "threads" || value === "website";
}
