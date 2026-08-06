import { NextRequest, NextResponse } from "next/server";
import { getAISuggestions } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { topic } = body;

  if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
    return NextResponse.json({ error: "Topic must be at least 3 characters" }, { status: 400 });
  }

  try {
    const angles = await getAISuggestions(topic.trim());
    return NextResponse.json({ angles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
