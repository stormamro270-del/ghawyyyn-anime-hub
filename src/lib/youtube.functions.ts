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

async function resolveChannelId(): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/${CHANNEL_HANDLE}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const html = await res.text();
    const m =
      html.match(/"channelId":"(UC[\w-]{20,})"/) ||
      html.match(/<meta itemprop="identifier" content="(UC[\w-]{20,})"/) ||
      html.match(/channel\/(UC[\w-]{20,})/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export const getChannelVideos = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ videos: Video[]; channelTitle: string }> => {
    const channelId = await resolveChannelId();
    if (!channelId) return { videos: [], channelTitle: "غاويين انمى" };

    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );
    const xml = await res.text();

    const channelTitleMatch = xml.match(/<title>([^<]+)<\/title>/);
    const channelTitle = channelTitleMatch ? channelTitleMatch[1] : "غاويين انمى";

    const videos: Video[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let entry: RegExpExecArray | null;
    while ((entry = entryRegex.exec(xml)) !== null) {
      const block = entry[1];
      const id = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      if (!id) continue;
      const title = block.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
      const published = block.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
      const description =
        block.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] ?? "";
      const views =
        block.match(/views="(\d+)"/)?.[1] ?? "0";
      const rating =
        block.match(/average="([\d.]+)"/)?.[1] ?? "";

      videos.push({
        id,
        title,
        description: description.slice(0, 280),
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        published: published.slice(0, 10),
        views,
        rating: rating ? Number(rating).toFixed(1) : "",
      });
    }

    return { videos, channelTitle };
  }
);
