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

function walk(node: any, out: any[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const x of node) walk(x, out);
    return;
  }
  if (
    node.videoRenderer ||
    node.gridVideoRenderer ||
    node.shortsLockupViewModel ||
    node.lockupViewModel
  ) {
    out.push(node);
  }
  for (const k of Object.keys(node)) walk(node[k], out);
}

async function fetchTab(path: string): Promise<{ html: string }> {
  const res = await fetch(
    `https://www.youtube.com/${CHANNEL_HANDLE}/${path}?hl=en&persist_hl=1`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+000; SOCS=CAI",
      },
    }
  );
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

function parseDuration(txt: string): number {
  const m = txt.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (!m) return 0;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  const c = m[3] ? parseInt(m[3], 10) : null;
  return c != null ? a * 3600 + b * 60 + c : a * 60 + b;
}

function buildFromLockup(lm: any): { video: Video; lengthSecs: number } | null {
  if (lm.contentType && lm.contentType !== "LOCKUP_CONTENT_TYPE_VIDEO") return null;
  const id = lm.contentId;
  if (!id) return null;
  const meta = lm.metadata?.lockupMetadataViewModel;
  const title = meta?.title?.content ?? "";
  const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows ?? [];
  const parts: string[] = [];
  for (const r of rows) {
    for (const p of r.metadataParts ?? []) {
      if (p?.text?.content) parts.push(p.text.content);
    }
  }
  const viewsText = parts.find((t) => /view/i.test(t)) ?? "0";
  const published =
    parts.find((t) => /ago|hour|day|week|month|year|minute|second/i.test(t)) ?? "";
  const sources = lm.contentImage?.thumbnailViewModel?.image?.sources ?? [];
  const thumbnail =
    sources[sources.length - 1]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const overlays = lm.contentImage?.thumbnailViewModel?.overlays ?? [];
  let lengthSecs = 0;
  for (const o of overlays) {
    const badges = o?.thumbnailBottomOverlayViewModel?.badges ?? [];
    for (const b of badges) {
      const txt = b?.thumbnailBadgeViewModel?.text ?? "";
      const s = parseDuration(txt);
      if (s) lengthSecs = s;
    }
  }
  return {
    lengthSecs,
    video: {
      id,
      title,
      description: "",
      thumbnail,
      published,
      views: parseViews(viewsText),
      rating: "",
      isShort: false,
    },
  };
}

function buildFromShortsLockup(s: any): Video | null {
  const id =
    s.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId ??
    s.entityId?.match?.(/([\w-]{11})/)?.[1];
  if (!id) return null;
  const title = s.overlayMetadata?.primaryText?.content ?? s.accessibilityText ?? "";
  const thumb =
    s.thumbnail?.sources?.[s.thumbnail.sources.length - 1]?.url ||
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const viewsText = s.overlayMetadata?.secondaryText?.content ?? "0";
  return {
    id,
    title,
    description: "",
    thumbnail: thumb,
    published: "",
    views: parseViews(viewsText),
    rating: "",
    isShort: true,
  };
}

function buildFromVideoRenderer(r: any): Video | null {
  const id = r.videoId;
  if (!id) return null;
  const title = r.title?.runs?.[0]?.text ?? r.title?.simpleText ?? "";
  const thumbs = r.thumbnail?.thumbnails ?? [];
  const thumbnail =
    thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const viewsText = r.viewCountText?.simpleText ?? r.shortViewCountText?.simpleText ?? "0";
  const published = r.publishedTimeText?.simpleText ?? "";
  const description = r.descriptionSnippet?.runs?.map((x: any) => x.text).join("") ?? "";
  return {
    id,
    title,
    description: description.slice(0, 280),
    thumbnail,
    published,
    views: parseViews(viewsText),
    rating: "",
    isShort: false,
  };
}

export const getChannelVideos = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ videos: Video[]; channelTitle: string }> => {
    const [videosTab, shortsTab] = await Promise.all([
      fetchTab("videos"),
      fetchTab("shorts"),
    ]);

    let channelTitle = "غاويين انمى";
    const tm = videosTab.html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    if (tm) channelTitle = tm[1];

    const seen = new Set<string>();
    const videos: Video[] = [];

    // --- Regular videos tab (lockupViewModel or legacy videoRenderer) ---
    const vData = extractData(videosTab.html);
    if (vData) {
      const wrappers: any[] = [];
      walk(vData, wrappers);
      for (const w of wrappers) {
        if (w.lockupViewModel) {
          const built = buildFromLockup(w.lockupViewModel);
          if (!built) continue;
          // skip shorts by duration (<65s)
          if (built.lengthSecs > 0 && built.lengthSecs < 65) continue;
          if (seen.has(built.video.id)) continue;
          seen.add(built.video.id);
          videos.push(built.video);
          continue;
        }
        const r = w.videoRenderer || w.gridVideoRenderer;
        if (!r) continue;
        const watchUrl = r.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url ?? "";
        if (watchUrl && !watchUrl.startsWith("/watch")) continue;
        const lengthText =
          r.lengthText?.simpleText ?? r.lengthText?.accessibility?.accessibilityData?.label ?? "";
        const secs = parseDuration(lengthText);
        if (secs > 0 && secs < 65) continue;
        const v = buildFromVideoRenderer(r);
        if (!v || seen.has(v.id)) continue;
        seen.add(v.id);
        videos.push(v);
      }
    }

    // --- Shorts tab ---
    const sData = extractData(shortsTab.html);
    if (sData) {
      const wrappers: any[] = [];
      walk(sData, wrappers);
      for (const w of wrappers) {
        if (w.shortsLockupViewModel) {
          const v = buildFromShortsLockup(w.shortsLockupViewModel);
          if (v && !seen.has(v.id)) {
            seen.add(v.id);
            videos.push(v);
          }
          continue;
        }
        if (w.lockupViewModel) {
          const built = buildFromLockup(w.lockupViewModel);
          if (built && !seen.has(built.video.id)) {
            seen.add(built.video.id);
            videos.push({ ...built.video, isShort: true });
          }
          continue;
        }
        const r = w.videoRenderer || w.gridVideoRenderer;
        const v = r ? buildFromVideoRenderer(r) : null;
        if (v && !seen.has(v.id)) {
          seen.add(v.id);
          videos.push({ ...v, isShort: true });
        }
      }
    }

    return { videos, channelTitle };
  }
);
