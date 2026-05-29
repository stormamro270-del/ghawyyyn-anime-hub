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
function findVideoRenderers(node: any, out: any[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const x of node) findVideoRenderers(x, out);
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
  for (const k of Object.keys(node)) findVideoRenderers(node[k], out);
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
  const published = parts.find((t) => /ago|hour|day|week|month|year/i.test(t)) ?? "";
  const sources = lm.contentImage?.thumbnailViewModel?.image?.sources ?? [];
  const thumbnail =
    sources[sources.length - 1]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  // length badge
  const overlays = lm.contentImage?.thumbnailViewModel?.overlays ?? [];
  let lengthSecs = 0;
  for (const o of overlays) {
    const badges = o?.thumbnailBottomOverlayViewModel?.badges ?? [];
    for (const b of badges) {
      const txt = b?.thumbnailBadgeViewModel?.text ?? "";
      const m = txt.match(/^(\d+):(\d+)(?::(\d+))?$/);
      if (m) {
        const a = parseInt(m[1], 10);
        const b2 = parseInt(m[2], 10);
        const c = m[3] ? parseInt(m[3], 10) : null;
        lengthSecs = c != null ? a * 3600 + b2 * 60 + c : a * 60 + b2;
      }
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
