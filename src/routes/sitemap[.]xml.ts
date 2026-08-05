import { createFileRoute } from "@tanstack/react-router";
import { getChannelVideos } from "@/lib/youtube.functions";

const BASE_URL = "https://ghawyyyn-anime-hub.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/games", changefreq: "monthly", priority: "0.6" },
          { path: "/games/tic-tac-toe", changefreq: "monthly", priority: "0.5" },
          { path: "/games/snake", changefreq: "monthly", priority: "0.5" },
          { path: "/games/apple", changefreq: "monthly", priority: "0.5" },
          { path: "/analytics", changefreq: "weekly", priority: "0.5" },
        ];

        try {
          const { videos } = await getChannelVideos({ data: { lang: "ar" } });
          for (const v of videos) {
            entries.push({
              path: `/watch/${v.id}`,
              changefreq: "weekly",
              priority: "0.8",
            });
          }
        } catch {
          // If video fetch fails, serve sitemap with static pages only
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n")
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
