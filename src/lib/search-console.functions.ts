import { createServerFn } from "@tanstack/react-start";

const SITE_URL = "https://ghawyyyn-anime-hub.lovable.app/";
const SITEMAP_URL = "https://ghawyyyn-anime-hub.lovable.app/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

interface GscResponse<T> {
  data?: T;
  error?: string;
}

async function gscFetch<T>(path: string, method: string, body?: object): Promise<T> {
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  const connectionApiKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;

  if (!lovableApiKey || !connectionApiKey) {
    throw new Error("Google Search Console connection is not configured");
  }

  const response = await fetch(`${GATEWAY}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": connectionApiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Search Console request failed [${response.status}]: ${text}`);
  }

  return response.json() as Promise<T>;
}

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return {
    endDate: end.toISOString().split("T")[0],
    startDate: start.toISOString().split("T")[0],
  };
}

export interface SearchConsoleStats {
  sitemap: {
    submittedUrls: number;
    isPending: boolean;
    lastDownloaded?: string;
    warnings?: number;
    errors?: number;
  };
  homepageInspection: {
    verdict: "INDEXING_ALLOWED" | "INDEXING_NOT_ALLOWED" | "NEED_RATER_INPUT" | string;
    coverageState?: string;
    lastCrawlTime?: string;
    pageFetchState?: string;
    googleCanonical?: string;
  };
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

export const getSearchConsoleStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<SearchConsoleStats> => {
    const { startDate, endDate } = getDateRange(28);

    const [sitemapStatus, inspection, totals, queries, pages] = await Promise.all([
      gscFetch<{
        entries?: number;
        isPending?: boolean;
        lastDownloaded?: string;
        warnings?: number;
        errors?: number;
      }>(
        `/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`,
        "GET",
      ).catch(() => ({ entries: 0, isPending: false, warnings: 0, errors: 0 })),

      gscFetch<{
        inspectionResult?: {
          indexStatusResult?: {
            verdict?: string;
            coverageState?: string;
            lastCrawlTime?: string;
            pageFetchState?: string;
            googleCanonical?: string;
          };
        };
      }>(
        `/v1/urlInspection/index:inspect`,
        "POST",
        {
          inspectionUrl: SITE_URL,
          siteUrl: SITE_URL,
        },
      ).catch(() => ({ inspectionResult: undefined })),

      gscFetch<{ rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> }>(
        `/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
        "POST",
        {
          startDate,
          endDate,
          dimensions: [],
        },
      ).catch(() => ({ rows: [] })),

      gscFetch<{ rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> }>(
        `/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
        "POST",
        {
          startDate,
          endDate,
          dimensions: ["query"],
          rowLimit: 10,
        },
      ).catch(() => ({ rows: [] })),

      gscFetch<{ rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> }>(
        `/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
        "POST",
        {
          startDate,
          endDate,
          dimensions: ["page"],
          rowLimit: 10,
        },
      ).catch(() => ({ rows: [] })),
    ]);

    const totalRow = totals.rows?.[0];

    return {
      sitemap: {
        submittedUrls: sitemapStatus.entries ?? 0,
        isPending: sitemapStatus.isPending ?? false,
        lastDownloaded: sitemapStatus.lastDownloaded,
        warnings: sitemapStatus.warnings ?? 0,
        errors: sitemapStatus.errors ?? 0,
      },
      homepageInspection: {
        verdict: inspection.inspectionResult?.indexStatusResult?.verdict ?? "UNKNOWN",
        coverageState: inspection.inspectionResult?.indexStatusResult?.coverageState,
        lastCrawlTime: inspection.inspectionResult?.indexStatusResult?.lastCrawlTime,
        pageFetchState: inspection.inspectionResult?.indexStatusResult?.pageFetchState,
        googleCanonical: inspection.inspectionResult?.indexStatusResult?.googleCanonical,
      },
      totals: {
        clicks: totalRow?.clicks ?? 0,
        impressions: totalRow?.impressions ?? 0,
        ctr: totalRow?.ctr ?? 0,
        position: totalRow?.position ?? 0,
      },
      topQueries:
        queries.rows?.map((row) => ({
          query: row.keys[0] ?? "",
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        })) ?? [],
      topPages:
        pages.rows?.map((row) => ({
          page: row.keys[0] ?? "",
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        })) ?? [],
    };
  },
);
