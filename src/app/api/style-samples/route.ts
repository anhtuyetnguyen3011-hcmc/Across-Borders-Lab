import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { detectPlatformFromSource, isNotionUrl, isThreadsUrl } from "@/lib/platform";
import { extractFromNotionPage } from "@/lib/notion";

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

  if (/javascript\s+(?:must|needs?|is required)\s+(?:be\s+)?(?:enabled|turned on|allowed)|enable\s+javascript/i.test(html)) {
    throw new Error(
      "This page requires JavaScript to render its content and cannot be imported via URL. " +
      "For Notion pages: configure NOTION_API_KEY and share the page with your Notion integration, " +
      "or export the page as a file (.docx or .pdf) and upload it manually."
    );
  }

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

async function extractFromThreadsPost(url: string): Promise<{ title: string; text: string }> {
  const oembedUrl = `https://graph.threads.net/oembed?url=${encodeURIComponent(url)}`;
  console.log(`[StyleSamples] Threads oEmbed request: ${oembedUrl}`);

  const response = await fetch(oembedUrl, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(`[StyleSamples] Threads oEmbed failed (HTTP ${response.status}): ${errorBody.slice(0, 300)}`);
    throw new Error(
      `Unable to retrieve Threads post (HTTP ${response.status}). ` +
      `The post may be private, deleted, or the URL may be invalid. ` +
      `Details: ${errorBody.slice(0, 200)}`
    );
  }

  const data = await response.json();
  console.log(`[StyleSamples] Threads oEmbed response keys: ${Object.keys(data).join(", ")}`);

  if (!data.html) {
    console.error(`[StyleSamples] Threads oEmbed returned no html field. Full response: ${JSON.stringify(data).slice(0, 500)}`);
    throw new Error("Threads oEmbed response did not contain post content. The post may be private or deleted.");
  }

  const text = data.html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  console.log(`[StyleSamples] Threads oEmbed stripped text length: ${text.length}, preview: ${text.slice(0, 200)}`);

  if (text.length < 10) {
    throw new Error(
      "Không lấy được nội dung từ bài viết này. " +
      "Bài viết có thể ở chế độ riêng tư hoặc nội dung không thể trích xuất tự động. " +
      "Vui lòng dán nội dung bài viết thủ công."
    );
  }

  const title = data.author_name
    ? `Bài viết Threads của ${data.author_name}`
    : `Bài viết Threads`;

  return { title, text };
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

      if (isNotionUrl(url)) {
        if (!process.env.NOTION_API_KEY) {
          return NextResponse.json({
            success: false,
            error:
              "Notion API is not configured. To import Notion pages directly, create an internal integration at https://www.notion.so/my-integrations and add NOTION_API_KEY to your environment. " +
              "As a workaround, you can export the page from Notion as a file (.docx or .pdf) and upload it manually.",
          }, { status: 400 });
        }

        try {
          const result = await extractFromNotionPage(url);
          return NextResponse.json({
            success: true,
            title: result.title,
            extractedText: result.text,
            sourceUrl: url,
            platform: detectPlatformFromSource("link", url),
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to extract content from Notion page",
          }, { status: 500 });
        }
      }

      if (isThreadsUrl(url)) {
        try {
          const result = await extractFromThreadsPost(url);
          return NextResponse.json({
            success: true,
            title: result.title,
            extractedText: result.text,
            sourceUrl: url,
            platform: "threads" as const,
          });
        } catch (oembedError) {
          console.warn(`[StyleSamples] Threads oEmbed failed, trying direct fetch fallback: ${oembedError instanceof Error ? oembedError.message : oembedError}`);
          try {
            const text = await fetchAndExtractText(url);
            return NextResponse.json({
              success: true,
              title: `Bài viết Threads`,
              extractedText: text,
              sourceUrl: url,
              platform: "threads" as const,
            });
          } catch {
            console.error(`[StyleSamples] Threads direct fetch also failed for: ${url}`);
            return NextResponse.json({
              success: false,
              error:
                "Không thể trích xuất nội dung từ bài viết Threads này. " +
                "Bài viết có thể ở chế độ riêng tư, đã bị xóa, hoặc Threads yêu cầu JavaScript để hiển thị nội dung. " +
                "Vui lòng mở bài viết trong trình duyệt, sao chép nội dung và dán thủ công.",
            }, { status: 502 });
          }
        }
      }

      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ContentWorkspace/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      console.log(`[StyleSamples] Direct fetch status: ${response.status} for ${url}`);
      const html = await response.text();
      const title = extractTitleFromHtml(html);
      const text = await fetchAndExtractText(url);
      console.log(`[StyleSamples] Extracted text length: ${text.length}, title: ${title}`);

      return NextResponse.json({
        success: true,
        title,
        extractedText: text,
        sourceUrl: url,
        platform: detectPlatformFromSource("link", url),
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
        platform: null,
        needsPlatform: true,
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
