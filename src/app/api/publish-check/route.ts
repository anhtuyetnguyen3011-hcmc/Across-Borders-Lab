import { NextResponse } from "next/server";
import { checkAndPublishDuePosts } from "@/lib/publish-scheduler";

export async function POST() {
  try {
    const result = await checkAndPublishDuePosts();
    return NextResponse.json({
      success: true,
      published: result.published,
      failed: result.failed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to trigger publish check",
  });
}
