import { createServerFn } from "@tanstack/react-start";

const CHANNEL_ID = "UCeh9IfCM8R6Vd5C59_asSpQ";

export type Video = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  published: string;
  views: string;
  rating: string;
};

function extract(block: string, tag: string, attr?: string): string {
  if (attr) {
    const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`);
    return block.match(re)?.[1] ?? "";
  }
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  return block.match(re)?.[1] ?? "";
}

export const getChannelVideos = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ videos: Video[]; channelTitle: string }> => {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const xml = await res.text();
    const channelTitle =
      xml.match(/<title>([^<]+)<\/title>/)?.[1] ?? "غاويين انمى";

    const entries = xml.split("<entry>").slice(1);
    const videos: Video[] = entries.map((entry) => {
      const id = extract(entry, "yt:videoId");
      const title = extract(entry, "title");
      const description = extract(entry, "media:description").slice(0, 280);
      const published = extract(entry, "published");
      const thumbnail =
        extract(entry, "media:thumbnail", "url") ||
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      const views = extract(entry, "media:statistics", "views");
      const rating = extract(entry, "media:starRating", "average");
      return { id, title, description, thumbnail, published, views, rating };
    });

    return { videos, channelTitle };
  }
);
