import { NextRequest, NextResponse } from "next/server";
import {
  getUnifiedStyleReferences,
  getUnifiedStyleReferencesForPlatform,
  getStyleProfile,
  saveStyleProfile,
} from "@/lib/data";
import { analyzeStyleProfile } from "@/lib/ai";
import type { StyleProfileScope } from "@/lib/types";

export async function GET(req: NextRequest) {
  const platform = (req.nextUrl.searchParams.get("platform") || "all") as StyleProfileScope;
  const [profile, refs] = await Promise.all([
    getStyleProfile(platform),
    getUnifiedStyleReferences(),
  ]);
  return NextResponse.json({ profile, sourceCount: refs.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "analyze") {
    const platform = (body.platform || "all") as StyleProfileScope;
    const refs = platform === "all"
      ? await getUnifiedStyleReferences()
      : await getUnifiedStyleReferencesForPlatform(platform);

    if (refs.length === 0) {
      return NextResponse.json({ profile: null, sourceCount: 0, platform });
    }
    try {
      const traits = await analyzeStyleProfile(refs);
      const profile = await saveStyleProfile({
        traits,
        sourceSampleIds: refs.map((r) => r.id),
        sampleCount: refs.length,
      }, platform);
      return NextResponse.json({ profile, sourceCount: refs.length, platform });
    } catch (error) {
      console.error("Style profile analysis failed:", error);
      const previous = await getStyleProfile(platform);
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Style profile analysis failed",
          profile: previous,
          sourceCount: refs.length,
          platform,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
