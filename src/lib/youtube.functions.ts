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
  // "1.2M views" / "12K views" / "1,234 views" / "1.2 ألف مشاهدة"
  const m = text.match(/([\d.,]+)\s*([KMB]?)/i);
  if (!m) return "0";
  const num = parseFloat(m[1].replace(/,/g, ""));
  const suffix = m[2].toUpperCase();
  const mult = suffix === "B" ? 1e9 : suffix === "M" ? 1e6 : suffix === "K" ? 1e3 : 1;
  return Math.round(num * mult).toString();
}

export const getChannelVideos = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ videos: Video[]; channelTitle: string }> => {
    const res = await fetch(
      `https://www.youtube.com/${CHANNEL_HANDLE}/videos`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );
    const html = await res.text();

    let channelTitle = "غاويين انمى";
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    if (titleMatch) channelTitle = titleMatch[1];

    const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
    if (!m) return { videos: [], channelTitle };

    let data: any;
    try {
      data = JSON.parse(m[1]);
    } catch {
      return { videos: [], channelTitle };
    }

    const tabs =
      data?.contents?.twoColumnBrowseResultsRenderer?.tabs ?? [];
    const videosTab = tabs.find(
      (t: any) => t?.tabRenderer?.title === "Videos" || t?.tabRenderer?.selected
    );
    const items =
      videosTab?.tabRenderer?.content?.richGridRenderer?.contents ?? [];

    const videos: Video[] = [];
    for (const item of items) {
      const r = item?.richItemRenderer?.content?.videoRenderer;
      if (!r) continue;
      const id = r.videoId;
      if (!id) continue;
      const title =
        r.title?.runs?.[0]?.text ?? r.title?.simpleText ?? "";
      const thumbs = r.thumbnail?.thumbnails ?? [];
      const thumbnail =
        thumbs[thumbs.length - 1]?.url ||
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      const viewsText =
        r.viewCountText?.simpleText ??
        r.shortViewCountText?.simpleText ??
        "0";
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
