import crypto from "crypto";

export const ONEINDIA_SOURCE_URL =
  "https://www.oneindia.com/power-cut-bengaluru-292.html";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&rsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchOneIndiaPageText(): Promise<{
  text: string;
  hash: string;
}> {
  const res = await fetch(ONEINDIA_SOURCE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; PowerCutBot/0.1; +https://example.com/powercut-bot)",
    },
  });
  if (!res.ok) {
    throw new Error(`OneIndia fetch failed: HTTP ${res.status}`);
  }
  const html = await res.text();
  const text = stripHtml(html);
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  return { text, hash };
}
