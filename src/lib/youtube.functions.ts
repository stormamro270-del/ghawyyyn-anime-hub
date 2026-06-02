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
    node.lockupViewModel
  ) {
    out.push(node);
  }
  for (const k of Object.keys(node)) walk(node[k], out);
}

async function fetchTab(path: string, hl: string): Promise<{ html: string }> {
  const acceptLang = hl === "ar" ? "ar,en;q=0.8" : "en-US,en;q=0.9";
  const res = await fetch(
    `https://www.youtube.com/${CHANNEL_HANDLE}/${path}?hl=${hl}&persist_hl=1&gl=EG`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": acceptLang,
        Cookie: `PREF=hl=${hl}&gl=EG; CONSENT=YES+cb.20210328-17-p0.en+FX+000; SOCS=CAI`,
      },
    }
  );
  return { html: await res.text() };
}

type YoutubeConfig = {
  apiKey: string;
  clientVersion: string;
  visitorData?: string;
};

function extractYoutubeConfig(html: string): YoutubeConfig | null {
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1];
  const visitorData = html.match(/"VISITOR_DATA":"([^"]+)"/)?.[1];
  if (!apiKey || !clientVersion) return null;
  return { apiKey, clientVersion, visitorData };
}

async function fetchContinuation(token: string, config: YoutubeConfig, hl: string): Promise<any | null> {
  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/browse?key=${config.apiKey}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": hl === "ar" ? "ar,en;q=0.8" : "en-US,en;q=0.9",
        "Content-Type": "application/json",
        Origin: "https://www.youtube.com",
        Referer: `https://www.youtube.com/${CHANNEL_HANDLE}/videos`,
        Cookie: `PREF=hl=${hl}&gl=EG; CONSENT=YES+cb.20210328-17-p0.en+FX+000; SOCS=CAI`,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: config.clientVersion,
            hl,
            gl: "EG",
            visitorData: config.visitorData,
          },
        },
        continuation: token,
      }),
    }
  );
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractData(html: string): any | null {
  const m = html.match(/(?:var\s+)?ytInitialData\s*=\s*(\{[\s\S]*?\});<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function findContinuationToken(node: any): string | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const x of node) {
      const token = findContinuationToken(x);
      if (token) return token;
    }
    return null;
  }
  const token = node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
  if (token) return token;
  for (const k of Object.keys(node)) {
    const found = findContinuationToken(node[k]);
    if (found) return found;
  }
  return null;
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

function addRegularVideos(data: any, videos: Video[], seen: Set<string>) {
  const wrappers: any[] = [];
  walk(data, wrappers);
  for (const w of wrappers) {
    if (w.lockupViewModel) {
      const built = buildFromLockup(w.lockupViewModel);
      if (!built) continue;
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

export const getChannelVideos = createServerFn({ method: "GET" })
  .inputValidator((data: { lang?: string } | undefined) => ({
    lang: data?.lang === "en" ? "en" : "ar",
  }))
  .handler(
  async ({ data }): Promise<{ videos: Video[]; channelTitle: string; lang: string }> => {
    const hl = data.lang;
    const videosTab = await fetchTab("videos", hl);

    let channelTitle = "غاويين انمى";
    const tm = videosTab.html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    if (tm) channelTitle = tm[1];

    const seen = new Set<string>();
    const videos: Video[] = [];

    const vData = extractData(videosTab.html);
    if (vData) {
      addRegularVideos(vData, videos, seen);
      const config = extractYoutubeConfig(videosTab.html);
      let token = findContinuationToken(vData);
      for (let page = 0; config && token && page < 12; page += 1) {
        const nextData = await fetchContinuation(token, config, hl);
        if (!nextData) break;
        const before = videos.length;
        addRegularVideos(nextData, videos, seen);
        token = findContinuationToken(nextData);
        if (videos.length === before) break;
      }
    }

    return { videos, channelTitle, lang: hl };
  }
);
