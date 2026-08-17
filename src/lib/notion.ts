import { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

let notionClient: Client | null = null;

function getClient(): Client {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    throw new Error(
      "NOTION_API_KEY is not set. Create a Notion internal integration at https://www.notion.so/my-integrations and add the key to your environment variables."
    );
  }
  if (!notionClient) {
    notionClient = new Client({ auth: token });
  }
  return notionClient;
}

export function isNotionUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "notion.site" || host.endsWith(".notion.site") || host === "notion.so" || host.endsWith(".notion.so");
  } catch {
    return false;
  }
}

function extractPageIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "";
    const pageId = lastSegment.replace(/-/g, "");
    if (/^[0-9a-f]{32}$/i.test(pageId)) {
      return pageId;
    }
    return null;
  } catch {
    return null;
  }
}

function richTextToPlainText(richText: RichTextItemResponse[]): string {
  return richText.map((rt) => rt.plain_text).join("");
}

function extractTextFromBlock(block: BlockObjectResponse): string {
  const { type } = block;
  const blockData = (block as Record<string, unknown>)[type] as Record<string, unknown> | undefined;
  if (!blockData) return "";

  const richText = blockData.rich_text as RichTextItemResponse[] | undefined;
  if (!richText || !Array.isArray(richText)) return "";

  const text = richTextToPlainText(richText);
  if (!text) return "";

  switch (type) {
    case "paragraph":
      return text;
    case "heading_1":
    case "heading_2":
    case "heading_3":
      return `\n## ${text}`;
    case "bulleted_list_item":
      return `- ${text}`;
    case "numbered_list_item":
      return `1. ${text}`;
    case "quote":
      return `> ${text}`;
    case "callout":
      return text;
    case "toggle":
      return text;
    default:
      return "";
  }
}

async function walkBlockTree(blockId: string): Promise<string> {
  const client = getClient();
  const parts: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

      for (const block of response.results) {
        const text = extractTextFromBlock(block as BlockObjectResponse);
        if (text) parts.push(text);

      if ("has_children" in block && block.has_children) {
        const childText = await walkBlockTree(block.id);
        if (childText) parts.push(childText);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return parts.join("\n");
}

export interface NotionExtractionResult {
  title: string;
  text: string;
}

export async function extractFromNotionPage(url: string): Promise<NotionExtractionResult> {
  const client = getClient();
  const pageId = extractPageIdFromUrl(url);

  if (!pageId) {
    throw new Error(
      "Could not extract a Notion page ID from the URL. Make sure the URL is a valid Notion page link (e.g. https://yourworkspace.notion.so/Page-Title-abc123...)."
    );
  }

  try {
    const page = await client.pages.retrieve({ page_id: pageId });
    let title = "Notion Page";

    if ("properties" in page) {
      const properties = page.properties as Record<string, unknown>;
      for (const [, prop] of Object.entries(properties)) {
        const p = prop as Record<string, unknown>;
        if (p.type === "title" && Array.isArray(p.title)) {
          const titleText = richTextToPlainText(p.title as RichTextItemResponse[]);
          if (titleText) {
            title = titleText;
            break;
          }
        }
      }
    }

    const bodyText = await walkBlockTree(pageId);
    const cleaned = bodyText
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (cleaned.length < 50) {
      throw new Error(
        "The Notion page appears to be empty or contains only non-text content (images, embeds, etc.). " +
        "Try adding more text blocks to the page, or use the manual file export as a backup."
      );
    }

    return { title, text: cleaned };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("Could not find block with ID") || message.includes("page could not be found")) {
      throw new Error(
        "This Notion page is not shared with the integration. Please open the page in Notion, " +
        "click \"...\" > \"Connect to\" > select your integration, then try again."
      );
    }

    if (message.includes("Unauthorized") || message.includes("401")) {
      throw new Error(
        "The Notion API token is invalid or expired. Please check your NOTION_API_KEY environment variable."
      );
    }

    if (message.includes("restricted")) {
      throw new Error(
        "The Notion integration does not have access to this page. Please share the page with " +
        "the integration in Not UI by clicking \"...\" > \"Connect to\" > select your integration."
      );
    }

    throw new Error(
      `Notion API error: ${message}. As a fallback, you can export the page from Notion as a file and upload it manually.`
    );
  }
}
