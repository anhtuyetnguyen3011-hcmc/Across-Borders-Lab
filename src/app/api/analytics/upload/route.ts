import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/db";
import { Platform, Pillar } from "@/lib/types";

interface ExcelRow {
  post_reference: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  date: string;
}

interface UploadResult {
  success: boolean;
  uploaded: number;
  unmatched: { row: ExcelRow; reason: string }[];
  duplicates: number;
  errors: string[];
}

async function findMatchingDraft(reference: string): Promise<{ draftId: string; platform: Platform; pillar: Pillar } | null> {
  const normalizedRef = reference.toLowerCase().trim();

  const draft = await prisma.draft.findFirst({
    where: {
      OR: [
        { title: { equals: normalizedRef, mode: "insensitive" } },
        { id: normalizedRef },
      ],
    },
  });

  if (draft) {
    return { draftId: draft.id, platform: draft.platform as Platform, pillar: draft.pillar as Pillar };
  }

  const schedPost = await prisma.scheduledPost.findFirst({
    where: {
      OR: [
        { draftId: normalizedRef },
        { id: normalizedRef },
      ],
    },
  });

  if (schedPost) {
    const draftForSched = await prisma.draft.findUnique({ where: { id: schedPost.draftId } });
    return {
      draftId: schedPost.draftId,
      platform: schedPost.platform as Platform,
      pillar: (draftForSched?.pillar || "education") as Pillar,
    };
  }

  return null;
}

function calculateEngagementRate(views: number, likes: number, comments: number): number {
  if (views === 0) return 0;
  return Number((((likes + comments) / views) * 100).toFixed(1));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

    const result: UploadResult = {
      success: true,
      uploaded: 0,
      unmatched: [],
      duplicates: 0,
      errors: [],
    };

    for (const row of rows) {
      if (!row.post_reference || !row.platform || !row.views) {
        result.errors.push(`Invalid data: ${JSON.stringify(row)}`);
        continue;
      }

      const platformLower = row.platform.toLowerCase();
      if (platformLower !== "threads" && platformLower !== "website") {
        result.unmatched.push({ row, reason: `Invalid platform: ${row.platform}` });
        continue;
      }

      const match = await findMatchingDraft(row.post_reference);
      if (!match) {
        result.unmatched.push({ row, reason: `Post not found: ${row.post_reference}` });
        continue;
      }

      const captureDate = row.date ? new Date(row.date) : new Date();
      const dateStr = captureDate.toISOString().split("T")[0];

      const existingMetric = await prisma.performanceMetric.findFirst({
        where: {
          draftId: match.draftId,
          capturedAt: {
            gte: new Date(dateStr + "T00:00:00.000Z"),
            lt: new Date(dateStr + "T23:59:59.999Z"),
          },
        },
      });

      if (existingMetric) {
        await prisma.performanceMetric.update({
          where: { id: existingMetric.id },
          data: {
            views: row.views,
            likes: row.likes || 0,
            comments: row.comments || 0,
            engagementRate: calculateEngagementRate(row.views, row.likes || 0, row.comments || 0),
            capturedAt: captureDate,
          },
        });
        result.duplicates++;
      } else {
        const scheduledPost = await prisma.scheduledPost.findFirst({
          where: { draftId: match.draftId },
        });

        await prisma.performanceMetric.create({
          data: {
            scheduledPostId: scheduledPost?.id || `sched-${match.draftId}`,
            draftId: match.draftId,
            platform: platformLower,
            pillar: match.pillar,
            views: row.views,
            likes: row.likes || 0,
            comments: row.comments || 0,
            engagementRate: calculateEngagementRate(row.views, row.likes || 0, row.comments || 0),
            capturedAt: captureDate,
          },
        });
      }

      result.uploaded++;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Excel upload error:", error);
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
  const workbook = XLSX.utils.book_new();
  const headers = ["post_reference", "platform", "views", "likes", "comments", "date"];
  const sampleData = [
    ["5 bài học từ Freelance", "threads", 10000, 800, 150, "2026-07-20"],
    ["Tại Sao Mình Chọn Đà Nẵng", "website", 8000, 500, 100, "2026-07-20"],
  ];

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Template");

  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=analytics-template.xlsx",
    },
  });
}
