import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Sparkles, ArrowRight, BarChart3 } from "lucide-react";
import { getSearchConsoleStats } from "@/lib/search-console.functions";
import { SearchConsoleDashboard } from "@/components/SearchConsoleDashboard";

export const Route = createFileRoute("/analytics")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["search-console-stats"],
      queryFn: () => getSearchConsoleStats(),
    });
  },
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "إحصائيات Google — غاويين انمى" },
      {
        name: "description",
        content: "لوحة تحكم Google Search Console: عدد الصفحات المفهرسة وأعلى الكلمات المفتاحية.",
      },
      { property: "og:title", content: "إحصائيات Google — غاويين انمى" },
      {
        property: "og:description",
        content: "عدد الصفحات المفهرسة وأعلى الكلمات المفتاحية من Google Search Console.",
      },
      { property: "og:url", content: "https://ghawyyyn-anime-hub.lovable.app/analytics" },
    ],
    links: [
      { rel: "canonical", href: "https://ghawyyyn-anime-hub.lovable.app/analytics" },
    ],
  }),
});

function AnalyticsPage() {
  const { data: stats } = useSuspenseQuery({
    queryKey: ["search-console-stats"],
    queryFn: () => getSearchConsoleStats(),
  });

  return (
    <div dir="rtl" className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-lg"
              style={{ background: "var(--gradient-neon)" }}
            >
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gradient-neon">غاويين انمى</h1>
              <p className="text-xs text-muted-foreground">إحصائيات Google</p>
            </div>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold transition hover:bg-secondary/70"
          >
            <ArrowRight className="h-4 w-4" />
            الرئيسية
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-10">
        <div className="mb-8 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Google Search Console</h2>
        </div>
        <SearchConsoleDashboard stats={stats} />
      </section>
    </div>
  );
}
