export interface FeedItem { title: string; url: string; publishedAt: string | null; summary: string | null; source: string; }

function decode(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}
function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decode(match[1]) : null;
}
function link(block: string) {
  return tag(block, "link") ?? block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ?? null;
}

export function parseFeed(xml: string, source: string): FeedItem[] {
  const blocks = xml.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  return blocks.flatMap((block) => {
    const title = tag(block, "title");
    const url = link(block);
    if (!title || !url) return [];
    return [{ title, url, publishedAt: tag(block, "pubDate") ?? tag(block, "published") ?? tag(block, "updated"), summary: tag(block, "description") ?? tag(block, "summary") ?? tag(block, "content"), source }];
  });
}
