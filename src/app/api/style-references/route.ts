import { NextRequest, NextResponse } from "next/server";
import {
  addStyleSample,
  deleteStyleSample,
  updateStyleSamplePlatform,
  getUnifiedStyleReferences,
  getUnifiedStyleReferencesForPlatform,
} from "@/lib/data";
import { detectPlatformFromSource, isStyleSamplePlatform } from "@/lib/platform";
import type { Platform } from "@/lib/types";

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform") as Platform | null;
  if (platform && (platform === "threads" || platform === "website")) {
    return NextResponse.json(await getUnifiedStyleReferencesForPlatform(platform));
  }
  return NextResponse.json(await getUnifiedStyleReferences());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "add-sample") {
    const platform = isStyleSamplePlatform(body.platform)
      ? body.platform
      : detectPlatformFromSource(body.sourceType, body.sourceUrl) ?? "website";
    const sample = await addStyleSample({
      sourceType: body.sourceType,
      sourceUrl: body.sourceUrl || null,
      extractedText: body.extractedText,
      title: body.title || null,
      platform,
    });
    return NextResponse.json(sample);
  }

  if (body.action === "delete-sample") {
    const deleted = await deleteStyleSample(body.sampleId);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "update-sample") {
    if (!body.sampleId || !isStyleSamplePlatform(body.platform)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
    const updated = await updateStyleSamplePlatform(body.sampleId, body.platform);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
