import { NextRequest, NextResponse } from "next/server";
import { getScheduledPosts, addScheduledPost, updateScheduledPost } from "@/lib/data";
import { publishers } from "@/lib/publisher";

export async function GET() {
  return NextResponse.json(getScheduledPosts());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "publish") {
    const result = await publishers.publish({
      title: body.title,
      body: body.body,
      platform: body.platform,
    });
    return NextResponse.json(result);
  }

  const post = addScheduledPost({
    draftId: body.draftId,
    platform: body.platform,
    scheduledTime: body.scheduledTime,
    publishStatus: "queued",
  });
  return NextResponse.json(post);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const post = updateScheduledPost(body.id, body);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}
