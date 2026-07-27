import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getDrafts, getScheduledPosts, getPerformanceMetrics } from "@/lib/data";
import { Platform } from "@/lib/types";

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

function findMatchingDraft(reference: string) {
  const drafts = getDrafts();
  const normalizedRef = reference.toLowerCase().trim();
  
  const draft = drafts.find(
    (d) =>
      d.title.toLowerCase().trim() === normalizedRef ||
      d.id === normalizedRef
  );
  
  if (draft) {
    return { draftId: draft.id, platform: draft.platform as Platform, pillar: draft.pillar };
  }
  
  const scheduled = getScheduledPosts();
  const schedPost = scheduled.find(
    (s) => s.draftId === normalizedRef || s.id === normalizedRef
  );
  
  if (schedPost) {
    const draftForSched = drafts.find((d) => d.id === schedPost.draftId);
    return {
      draftId: schedPost.draftId,
      platform: schedPost.platform,
      pillar: draftForSched?.pillar || "kinh_nghiem",
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

    const existingMetrics = getPerformanceMetrics();

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

      const match = findMatchingDraft(row.post_reference);
      if (!match) {
        result.unmatched.push({ row, reason: `Post not found: ${row.post_reference}` });
        continue;
      }

      const captureDate = row.date ? new Date(row.date) : new Date();
      const dateStr = captureDate.toISOString().split("T")[0];
      
      const existingMetric = existingMetrics.find(
        (m) =>
          m.draftId === match.draftId &&
          m.capturedAt.split("T")[0] === dateStr
      );

      if (existingMetric) {
        const metricIndex = existingMetrics.findIndex((m) => m.id === existingMetric.id);
        if (metricIndex !== -1) {
          const updated = {
            ...existingMetric,
            views: row.views,
            likes: row.likes || 0,
            comments: row.comments || 0,
            engagementRate: calculateEngagementRate(row.views, row.likes || 0, row.comments || 0),
            capturedAt: captureDate.toISOString(),
          };
          existingMetrics[metricIndex] = updated;
        }
        result.duplicates++;
      } else {
        const scheduledPost = getScheduledPosts().find((s) => s.draftId === match.draftId);
        
        existingMetrics.push({
          id: `metric-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          scheduledPostId: scheduledPost?.id || `sched-${match.draftId}`,
          draftId: match.draftId,
          platform: platformLower as Platform,
          pillar: match.pillar,
          views: row.views,
          likes: row.likes || 0,
          comments: row.comments || 0,
          engagementRate: calculateEngagementRate(row.views, row.likes || 0, row.comments || 0),
          capturedAt: captureDate.toISOString(),
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
