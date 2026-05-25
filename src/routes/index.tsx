import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getChannelVideos, type Video } from "@/lib/youtube.functions";
import { Play, Eye, Star, Youtube, Sparkles, Gamepad2, ChevronRight, ChevronLeft } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";

const PAGE_SIZE = 12;

export const Route = createFileRoute("/")({
  loader: () => getChannelVideos(),
  component: Index,
  head: () => ({
    meta: [
      { title: "غاويين انمى — ملخصات أنمي ومانهوا" },
      {
        name: "description",
        content:
          "شاهد أحدث ملخصات الأنمي والمانهوا من قناة غاويين انمى. تصميم سايبربانك بنفسجي وتشغيل مباشر للفيديوهات.",
      },
      { property: "og:title", content: "غاويين انمى — ملخصات أنمي ومانهوا" },
      {
        property: "og:description",
        content: "أحدث حلقات وملخصات الأنمي على قناة غاويين انمى.",
      },
    ],
  }),
});

function formatViews(v: string) {
  const n = parseInt(v || "0", 10);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function Index() {
  const { videos, channelTitle } = Route.useLoaderData();
  const [featured, ...rest] = videos;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageVideos = rest.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const goTo = (p: number) => {
    setPage(p);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 400, behavior: "smooth" });
    }
  };

  return (
    <div dir="rtl" className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-lg"
              style={{ background: "var(--gradient-neon)" }}
            >
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gradient-neon">
                {channelTitle}
              </h1>
              <p className="text-xs text-muted-foreground">
                Anime · Manhwa · Summaries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/games"
              className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold transition hover:bg-secondary/70"
            >
              <Gamepad2 className="h-4 w-4" />
              <span className="hidden sm:inline">ألعاب</span>
            </Link>
            <a
              href="https://www.youtube.com/@GhawyynAnime?sub_confirmation=1"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground transition hover:brightness-110"
              style={{ boxShadow: "0 0 20px oklch(0.62 0.24 25 / 0.4)" }}
            >
              <Youtube className="h-4 w-4" />
              <span className="hidden sm:inline">اشترك</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero / Featured */}
      {featured && (
        <section className="container mx-auto px-4 py-10">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-l from-primary/60 to-transparent" />
            <span className="text-sm font-bold uppercase tracking-widest text-primary">
              ◆ أحدث حلقة
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div
              className="cyber-border overflow-hidden rounded-2xl"
              style={{ animation: "glow-pulse 3s ease-in-out infinite" }}
            >
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${featured.id}`}
                  title={featured.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="mb-4 text-2xl font-bold leading-tight md:text-3xl">
                {featured.title}
              </h2>
              <div className="mb-4 flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1">
                  <Eye className="h-3.5 w-3.5 text-accent" />
                  {formatViews(featured.views)} مشاهدة
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  {featured.rating || "—"}
                </span>
              </div>
              <p className="text-muted-foreground line-clamp-4">
                {featured.description}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Grid */}
      <AdBanner className="container mx-auto px-4" />

      {/* Grid */}
      <section className="container mx-auto px-4 py-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-l from-accent/60 to-transparent" />
          <span className="text-sm font-bold uppercase tracking-widest text-accent">
            ◆ مكتبة الفيديوهات
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-accent/60 to-transparent" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pageVideos.map((v: Video) => (
            <Link
              key={v.id}
              to="/watch/$videoId"
              params={{ videoId: v.id }}
              className="cyber-border group block overflow-hidden rounded-xl"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />
                <div
                  className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: "oklch(0.13 0.06 295 / 0.6)" }}
                >
                  <div
                    className="grid h-16 w-16 place-items-center rounded-full"
                    style={{
                      background: "var(--gradient-neon)",
                      boxShadow: "var(--glow-primary)",
                    }}
                  >
                    <Play className="h-7 w-7 fill-primary-foreground text-primary-foreground" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                  {v.title}
                </h3>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatViews(v.views)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-accent text-accent" />
                    {v.rating || "—"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {channelTitle} · صُنع بـ 💜 لعشاق الأنمي
        </p>
      </footer>
    </div>
  );
}
