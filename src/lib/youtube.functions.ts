import { createServerFn } from "@tanstack/react-start";

const CHANNEL_HANDLE = "@GhawyynAnime";

export type Video = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  published: string;
  views: string;
  rating: string;
};

function parseViews(text: string): string {
  const m = text.match(/([\d.,]+)\s*([KMB]?)/i);
  if (!m) return "0";
  const num = parseFloat(m[1].replace(/,/g, ""));
  const s = m[2].toUpperCase();
  const mult = s === "B" ? 1e9 : s === "M" ? 1e6 : s === "K" ? 1e3 : 1;
  return Math.round(num * mult).toString();
}

function findVideoRenderers(node: any, out: any[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const x of node) findVideoRenderers(x, out);
    return;
  }
  if (node.videoRenderer || node.gridVideoRenderer) {
    out.push(node.videoRenderer || node.gridVideoRenderer);
  }
  for (const k of Object.keys(node)) findVideoRenderers(node[k], out);
}

export const getChannelVideos = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ videos: Video[]; channelTitle: string }> => {
    const res = await fetch(
      `https://www.youtube.com/${CHANNEL_HANDLE}/videos?hl=en&persist_hl=1`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+000; SOCS=CAI",
        },
      }
    );
    const html = await res.text();

    let channelTitle = "غاويين انمى";
    const tm = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    if (tm) channelTitle = tm[1];

    const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
    if (!m) return { videos: [], channelTitle };

    let data: any;
    try {
      data = JSON.parse(m[1]);
    } catch {
      return { videos: [], channelTitle };
    }

    const renderers: any[] = [];
    findVideoRenderers(data, renderers);

    const seen = new Set<string>();
    const videos: Video[] = [];
    for (const r of renderers) {
      const id = r.videoId;
      if (!id || seen.has(id)) continue;

      // Skip Shorts: they have lengthText < 60s or thumbnailOverlayTimeStatusRenderer.style === "SHORTS"
      const overlays = r.thumbnailOverlays ?? [];
      const isShortOverlay = overlays.some(
        (o: any) =>
          o?.thumbnailOverlayTimeStatusRenderer?.style === "SHORTS" ||
          o?.thumbnailOverlayTimeStatusRenderer?.icon?.iconType === "SHORTS"
      );
      if (isShortOverlay) continue;

      const lengthText =
        r.lengthText?.simpleText ?? r.lengthText?.accessibility?.accessibilityData?.label ?? "";
      // Parse "0:45" => 45s
      const parts = lengthText.split(":").map((x: string) => parseInt(x, 10));
      if (parts.length === 2 && !parts.some(isNaN)) {
        const secs = parts[0] * 60 + parts[1];
        if (secs > 0 && secs < 65) continue;
      }
      if (!lengthText) continue; // unknown duration => likely short/live

      seen.add(id);
      const title = r.title?.runs?.[0]?.text ?? r.title?.simpleText ?? "";
      const thumbs = r.thumbnail?.thumbnails ?? [];
      const thumbnail =
        thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      const viewsText =
        r.viewCountText?.simpleText ?? r.shortViewCountText?.simpleText ?? "0";
      const published = r.publishedTimeText?.simpleText ?? "";
      const description =
        r.descriptionSnippet?.runs?.map((x: any) => x.text).join("") ?? "";

      videos.push({
        id,
        title,
        description: description.slice(0, 280),
        thumbnail,
        published,
        views: parseViews(viewsText),
        rating: "",
      });
    }

    return { videos, channelTitle };
  }
);
