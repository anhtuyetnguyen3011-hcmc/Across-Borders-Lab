import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

async function fetchAndExtractText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ContentWorkspace/1.0)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (text.length < 50) {
    throw new Error("Extracted text is too short - the page may require JavaScript to render");
  }

  return text;
}

function extractTitleFromHtml(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();

  const ogMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
  if (ogMatch) return ogMatch[1].trim();

  return null;
}

async function parseDocx(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  if (result.messages.length > 0) {
    const errors = result.messages.filter((m) => m.type === "error");
    if (errors.length > 0) {
      throw new Error(`DOCX parsing errors: ${errors.map((e) => e.message).join(", ")}`);
    }
  }
  return result.value;
}

async function parsePdf(buffer: ArrayBuffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(Buffer.from(buffer));
  return data.text;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const type = formData.get("type") as string;

    if (type === "link") {
      const url = formData.get("url") as string;
      if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
      }

      try {
        new URL(url);
      } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }

      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ContentWorkspace/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      const html = await response.text();
      const title = extractTitleFromHtml(html);
      const text = await fetchAndExtractText(url);

      return NextResponse.json({
        success: true,
        title,
        extractedText: text,
        sourceUrl: url,
      });
    }

    if (type === "file") {
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ error: "File is required" }, { status: 400 });
      }

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "docx" && ext !== "pdf") {
        return NextResponse.json(
          { error: "Only .docx and .pdf files are supported" },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      let text: string;

      if (ext === "docx") {
        text = await parseDocx(buffer);
      } else {
        text = await parsePdf(buffer);
      }

      if (text.length < 50) {
        return NextResponse.json(
          { error: "File content is too short or text could not be extracted" },
          { status: 400 }
        );
      }

      const title = file.name.replace(/\.(docx|pdf)$/i, "");

      return NextResponse.json({
        success: true,
        title,
        extractedText: text,
        sourceUrl: null,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Style sample import error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to process request",
      },
      { status: 500 }
    );
  }
}
