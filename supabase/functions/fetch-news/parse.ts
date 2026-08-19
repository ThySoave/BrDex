export interface NewsItemInput {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
}

const MAX_SUMMARY_LENGTH = 300;

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

function truncate(text: string): string {
  if (text.length <= MAX_SUMMARY_LENGTH) {
    return text;
  }
  return text.slice(0, MAX_SUMMARY_LENGTH - 1) + "…";
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(
    new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i")
  );
  return match ? match[1].trim() : null;
}

function toSummary(raw: string | null): string {
  if (!raw) {
    return "";
  }
  return truncate(stripHtml(decodeEntities(raw)));
}

function toIsoDate(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function parseRssItem(block: string, source: string): NewsItemInput | null {
  const title = extractTag(block, "title");
  const url = extractTag(block, "link");
  const publishedAt = toIsoDate(extractTag(block, "pubDate"));
  if (!title || !url || !publishedAt) {
    return null;
  }
  return {
    title: decodeEntities(title),
    summary: toSummary(extractTag(block, "description")),
    url,
    source,
    publishedAt
  };
}

function parseAtomEntry(block: string, source: string): NewsItemInput | null {
  const title = extractTag(block, "title");
  const linkMatch = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i);
  const publishedAt = toIsoDate(
    extractTag(block, "updated") ?? extractTag(block, "published")
  );
  if (!title || !linkMatch || !publishedAt) {
    return null;
  }
  return {
    title: decodeEntities(title),
    summary: toSummary(extractTag(block, "summary") ?? extractTag(block, "content")),
    url: linkMatch[1],
    source,
    publishedAt
  };
}

export function parseFeed(xml: string, sourceName: string): NewsItemInput[] {
  const rssItems = [...xml.matchAll(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)];
  if (rssItems.length > 0) {
    return rssItems
      .map((match) => parseRssItem(match[0], sourceName))
      .filter((item): item is NewsItemInput => item !== null);
  }

  const atomEntries = [...xml.matchAll(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi)];
  return atomEntries
    .map((match) => parseAtomEntry(match[0], sourceName))
    .filter((item): item is NewsItemInput => item !== null);
}
