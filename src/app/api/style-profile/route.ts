import { NextRequest, NextResponse } from "next/server";
import {
  getUnifiedStyleReferences,
  getUnifiedStyleReferencesForPlatform,
  getStyleProfile,
  saveStyleProfile,
} from "@/lib/data";
import { analyzeStyleProfile } from "@/lib/ai";
import type { StyleProfileScope } from "@/lib/types";

const PLATFORM_LABELS: Record<string, string> = {
  threads: "Threads",
  website: "Website",
  all: "All",
};

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
      const platformLabel = PLATFORM_LABELS[platform] || platform;
      return NextResponse.json({
        profile: null,
        sourceCount: 0,
        platform,
        reason: "no_samples",
        message: `No samples yet for ${platformLabel} — add some above to generate a profile.`,
      });
    }

    try {
      console.log(`[StyleProfile] Step 1: Starting analysis for platform="${platform}" with ${refs.length} samples`);
      console.log(`[StyleProfile] Step 2: refs sample[0]=`, refs[0] ? { id: refs[0].id, source: refs[0].source, bodyLen: refs[0].body.length, platform: refs[0].platform } : "EMPTY");
      const traits = await analyzeStyleProfile(refs);
      console.log(`[StyleProfile] Step 3: analyzeStyleProfile returned, traits keys=`, Object.keys(traits));
      const profile = await saveStyleProfile({
        traits,
        sourceSampleIds: refs.map((r) => r.id),
        sampleCount: refs.length,
      }, platform);
      console.log(`[StyleProfile] Step 4: saveStyleProfile returned, profile id=`, profile.id);
      return NextResponse.json({ profile, sourceCount: refs.length, platform });
    } catch (error) {
      console.error(`[StyleProfile] Analysis FAILED for platform="${platform}", ${refs.length} samples:`);
      console.error(`[StyleProfile] Error name:`, error?.constructor?.name);
      console.error(`[StyleProfile] Error message:`, error instanceof Error ? error.message : String(error));
      console.error(`[StyleProfile] Error stack:`, error instanceof Error ? error.stack : "no stack");
      let previous = null;
      try {
        previous = await getStyleProfile(platform);
      } catch (e2) {
        console.error(`[StyleProfile] Also failed to read previous profile:`, e2 instanceof Error ? e2.message : String(e2));
      }
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Style profile analysis failed",
          reason: "analysis_failed",
          message: "Profile analysis failed — try again. If this persists, check the server logs for details.",
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
