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
  isShort: boolean;
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
  if (node.videoRenderer || node.gridVideoRenderer || node.shortsLockupViewModel) {
    out.push(node);
  }
  for (const k of Object.keys(node)) findVideoRenderers(node[k], out);
}

async function fetchTab(path: string): Promise<{ html: string }> {
  const res = await fetch(`https://www.youtube.com/${CHANNEL_HANDLE}/${path}?hl=en&persist_hl=1`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+000; SOCS=CAI",
    },
  });
  return { html: await res.text() };
}

function extractData(html: string): any | null {
  const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function isShortRenderer(wrapper: any, r: any): boolean {
  if (wrapper.shortsLockupViewModel) return true;
  const blob = JSON.stringify(r);
  if (blob.includes("/shorts/") || blob.includes("reelWatchEndpoint")) return true;
  const overlays = r.thumbnailOverlays ?? [];
  if (
    overlays.some(
      (o: any) =>
        o?.thumbnailOverlayTimeStatusRenderer?.style === "SHORTS" ||
        o?.thumbnailOverlayTimeStatusRenderer?.icon?.iconType === "SHORTS"
    )
  )
    return true;
  const badges = r.badges ?? [];
  if (
    badges.some((b: any) => {
      const label = b?.metadataBadgeRenderer?.label ?? "";
      const style = b?.metadataBadgeRenderer?.style ?? "";
      return /short/i.test(label) || /SHORTS/.test(style);
    })
  )
    return true;
  const lengthText =
    r.lengthText?.simpleText ?? r.lengthText?.accessibility?.accessibilityData?.label ?? "";
  if (lengthText) {
    const parts = lengthText.split(":").map((x: string) => parseInt(x, 10));
    if (parts.length === 2 && !parts.some(isNaN)) {
      const secs = parts[0] * 60 + parts[1];
      if (secs > 0 && secs < 65) return true;
    }
  }
  return false;
}

function buildFromShortsLockup(s: any): Video | null {
  const onTap =
    s.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId ??
    s.entityId?.match?.(/([\w-]{11})/)?.[1];
  if (!onTap) return null;
  const title =
    s.overlayMetadata?.primaryText?.content ??
    s.accessibilityText ??
    "";
  const thumb =
    s.thumbnail?.sources?.[s.thumbnail.sources.length - 1]?.url ||
    `https://i.ytimg.com/vi/${onTap}/hqdefault.jpg`;
  const viewsText = s.overlayMetadata?.secondaryText?.content ?? "0";
  return {
    id: onTap,
    title,
    description: "",
    thumbnail: thumb,
    published: "",
    views: parseViews(viewsText),
    rating: "",
    isShort: true,
  };
}

export const getChannelVideos = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ videos: Video[]; channelTitle: string }> => {
    const [videosTab, shortsTab] = await Promise.all([fetchTab("videos"), fetchTab("shorts")]);

    let channelTitle = "غاويين انمى";
    const tm = videosTab.html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    if (tm) channelTitle = tm[1];

    const seen = new Set<string>();
    const videos: Video[] = [];

    // --- Regular videos tab ---
    const vData = extractData(videosTab.html);
    if (vData) {
      const wrappers: any[] = [];
      findVideoRenderers(vData, wrappers);
      for (const w of wrappers) {
        const r = w.videoRenderer || w.gridVideoRenderer;
        if (!r) continue;
        const id = r.videoId;
        if (!id || seen.has(id)) continue;
        if (isShortRenderer(w, r)) continue;
        const watchUrl = r.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url ?? "";
        if (watchUrl && !watchUrl.startsWith("/watch")) continue;
        const lengthText =
          r.lengthText?.simpleText ?? r.lengthText?.accessibility?.accessibilityData?.label ?? "";
        if (!lengthText) continue;
        const shortViews = r.shortViewCountText?.simpleText ?? "";
        if (/watching/i.test(shortViews)) continue;

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
          isShort: false,
        });
      }
    }

    // --- Shorts tab ---
    const sData = extractData(shortsTab.html);
    if (sData) {
      const wrappers: any[] = [];
      findVideoRenderers(sData, wrappers);
      for (const w of wrappers) {
        if (w.shortsLockupViewModel) {
          const v = buildFromShortsLockup(w.shortsLockupViewModel);
          if (v && !seen.has(v.id)) {
            seen.add(v.id);
            videos.push(v);
          }
          continue;
        }
        const r = w.videoRenderer || w.gridVideoRenderer;
        if (!r?.videoId || seen.has(r.videoId)) continue;
        seen.add(r.videoId);
        const title = r.title?.runs?.[0]?.text ?? r.title?.simpleText ?? "";
        const thumbs = r.thumbnail?.thumbnails ?? [];
        videos.push({
          id: r.videoId,
          title,
          description: "",
          thumbnail:
            thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`,
          published: r.publishedTimeText?.simpleText ?? "",
          views: parseViews(r.viewCountText?.simpleText ?? r.shortViewCountText?.simpleText ?? "0"),
          rating: "",
          isShort: true,
        });
      }
    }

    return { videos, channelTitle };
  }
);
