import { NextRequest, NextResponse } from "next/server";
import {
  getUnifiedStyleReferences,
  getStyleProfile,
  saveStyleProfile,
} from "@/lib/data";
import { analyzeStyleProfile } from "@/lib/ai";

export async function GET() {
  const [profile, refs] = await Promise.all([
    getStyleProfile(),
    getUnifiedStyleReferences(),
  ]);
  return NextResponse.json({ profile, sourceCount: refs.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "analyze") {
    const refs = await getUnifiedStyleReferences();
    if (refs.length === 0) {
      return NextResponse.json({ profile: null, sourceCount: 0 });
    }
    try {
      const traits = await analyzeStyleProfile(refs);
      const profile = await saveStyleProfile({
        traits,
        sourceSampleIds: refs.map((r) => r.id),
        sampleCount: refs.length,
      });
      return NextResponse.json({ profile, sourceCount: refs.length });
    } catch (error) {
      console.error("Style profile analysis failed:", error);
      const previous = await getStyleProfile();
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Style profile analysis failed",
          profile: previous,
          sourceCount: refs.length,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
