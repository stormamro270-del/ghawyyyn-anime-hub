import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getChannelVideos, type Video } from "@/lib/youtube.functions";
import {
  Play,
  Eye,
  Star,
  Youtube,
  Sparkles,
  Gamepad2,
  ChevronRight,
  ChevronLeft,
  Languages,
  Search,
  Bookmark,
  BookmarkCheck,
  RefreshCcw,
  BarChart3,
} from "lucide-react";
import { AdBanner } from "@/components/AdBanner";
import { AnimatedViews } from "@/components/AnimatedViews";
import { useWatchLater } from "@/lib/watch-later";
import animeLoadingAsset from "@/assets/anime-loading.png.asset.json";

const PAGE_SIZE = 12;
// Aggressive sync while the tab is visible; back off in the background.
const REFRESH_MS_ACTIVE = 60 * 1000;
const REFRESH_MS_IDLE = 5 * 60 * 1000;

type Search = { lang: "ar" | "en" };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    lang: search.lang === "en" ? "en" : "ar",
  }),
  loaderDeps: ({ search }) => ({ lang: search.lang }),
  loader: ({ deps }) => getChannelVideos({ data: { lang: deps.lang } }),
  pendingComponent: LoadingScreen,
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

function LoadingScreen() {
  return (
    <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{ background: "var(--gradient-neon)", opacity: 0.35 }}
        />
        <img
          src={animeLoadingAsset.url}
          alt="جاري التحميل..."
          width={280}
          height={280}
          className="relative z-10 animate-bounce"
          style={{ animationDuration: "2s" }}
        />
      </div>
      <p className="text-lg font-bold text-primary">جاري تحميل الفيديوهات...</p>
    </div>
  );
}

function formatViews(v: string) {
  const n = parseInt(v || "0", 10);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

type ViewMode = "all" | "saved";
type SortMode = "newest" | "views";

function Index() {
  const initial = Route.useLoaderData();
  const { lang } = Route.useSearch();
  const [data, setData] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<number>(Date.now());

  // Live re-sync view counts (re-scrape channel page in background)
  useEffect(() => {
    setData(initial);
    setLastSync(Date.now());
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let inflight: Promise<void> | null = null;

    const refresh = (): Promise<void> => {
      if (inflight) return inflight;
      inflight = (async () => {
        try {
          setRefreshing(true);
          const fresh = await getChannelVideos({ data: { lang } });
          if (!cancelled && fresh?.videos?.length) {
            setData((prev: typeof initial) => {
              const map = new Map<string, Video>(
                fresh.videos.map((v: Video) => [v.id, v] as const)
              );
              const merged = prev.videos.map((v: Video) => {
                const updated = map.get(v.id);
                if (!updated) return v;
                // Only bump views forward — never let scrape jitter drop the count below the last seen value.
                const prevN = parseInt(v.views || "0", 10);
                const nextN = parseInt(updated.views || "0", 10);
                const views = nextN >= prevN ? updated.views : v.views;
                return {
                  ...v,
                  views,
                  title: updated.title,
                  thumbnail: updated.thumbnail,
                };
              });
              const existing = new Set(prev.videos.map((v: Video) => v.id));
              const newOnes = fresh.videos.filter((v: Video) => !existing.has(v.id));
              return { ...prev, videos: [...newOnes, ...merged] };
            });
            setLastSync(Date.now());
          }
        } catch {
          // ignore
        } finally {
          if (!cancelled) setRefreshing(false);
          inflight = null;
        }
      })();
      return inflight;
    };

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      const delay =
        typeof document !== "undefined" && document.visibilityState === "visible"
          ? REFRESH_MS_ACTIVE
          : REFRESH_MS_IDLE;
      timer = window.setTimeout(async () => {
        await refresh();
        if (!cancelled) schedule();
      }, delay);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
        schedule();
      }
    };
    const onOnline = () => refresh();

    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const { videos, channelTitle } = data;
  const featured = videos.find((v: Video) => !v.isShort) ?? videos[0];
  const baseRest = videos.filter((v: Video) => v.id !== featured?.id);

  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [page, setPage] = useState(1);
  const [loadedThumbs, setLoadedThumbs] = useState<Set<string>>(new Set());
  const { ids: savedIds, toggle: toggleSaved, has: isSaved } = useWatchLater();

  useEffect(() => {
    setPage(1);
  }, [query, view, sort, lang]);

  const rest = useMemo(() => {
    let list = baseRest;
    if (view === "saved") list = list.filter((v: Video) => savedIds.includes(v.id));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((v: Video) => v.title.toLowerCase().includes(q));
    if (sort === "views") {
      list = [...list].sort((a, b) => parseInt(b.views || "0", 10) - parseInt(a.views || "0", 10));
    }
    return list;
  }, [baseRest, view, query, sort, savedIds]);

  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageVideos = rest.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const goTo = (p: number) => {
    setPage(p);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 400, behavior: "smooth" });
    }
  };

  // JSON-LD ItemList for SEO
  const itemListLd = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${channelTitle} — قائمة الفيديوهات`,
        itemListElement: videos.slice(0, 20).map((v: Video, i: number) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          name: v.title,
          image: v.thumbnail,
        })),
      }),
    [videos, channelTitle]
  );

  return (
    <div dir="rtl" className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListLd }} />
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
              to="/analytics"
              className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold transition hover:bg-secondary/70"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">إحصائيات</span>
            </Link>
            <Link
              to="/"
              search={{ lang: lang === "ar" ? "en" : "ar" }}
              className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold transition hover:bg-secondary/70"
              title={lang === "ar" ? "English titles" : "عناوين عربية"}
            >
              <Languages className="h-4 w-4" />
              <span className="hidden sm:inline">{lang === "ar" ? "EN" : "AR"}</span>
            </Link>
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
                  <AnimatedViews value={featured.views} /> مشاهدة
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

      <AdBanner className="container mx-auto px-4" />

      {/* Grid */}
      <section className="container mx-auto px-4 py-10">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-l from-accent/60 to-transparent" />
          <span className="text-sm font-bold uppercase tracking-widest text-accent">
            ◆ مكتبة الفيديوهات
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-accent/60 to-transparent" />
        </div>

        {/* Search + filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في الفيديوهات…"
              className="w-full rounded-lg border border-border bg-secondary/40 px-10 py-2 text-sm outline-none transition focus:border-primary"
            />
          </label>
          <div className="flex items-center gap-1 rounded-lg bg-secondary/40 p-1">
            <button
              type="button"
              onClick={() => setView("all")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${view === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setView("saved")}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${view === "saved" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Bookmark className="h-3.5 w-3.5" />
              المفضلة ({savedIds.length})
            </button>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="newest">الأحدث</option>
            <option value="views">الأكثر مشاهدة</option>
          </select>
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title={`آخر تحديث: ${new Date(lastSync).toLocaleTimeString()}`}
          >
            <RefreshCcw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "جاري المزامنة…" : "مشاهدات حية"}
          </span>
        </div>

        {pageVideos.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {view === "saved" ? "لا توجد فيديوهات محفوظة بعد. اضغط على الإشارة المرجعية لإضافة فيديو." : "لا توجد نتائج مطابقة."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pageVideos.map((v: Video) => {
              const saved = isSaved(v.id);
              return (
                <div key={v.id} className="cyber-border group relative block overflow-hidden rounded-xl">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSaved(v.id);
                    }}
                    aria-label={saved ? "إزالة من المفضلة" : "حفظ للمشاهدة لاحقاً"}
                    className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/70 backdrop-blur transition hover:bg-background"
                  >
                    {saved ? (
                      <BookmarkCheck className="h-4 w-4 text-accent" />
                    ) : (
                      <Bookmark className="h-4 w-4 text-foreground" />
                    )}
                  </button>
                  <Link
                    to="/watch/$videoId"
                    params={{ videoId: v.id }}
                    className="block"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      {!loadedThumbs.has(v.id) && (
                        <div className="absolute inset-0 z-10 grid place-items-center bg-background/80 backdrop-blur-sm">
                          <img
                            src={animeLoadingAsset.url}
                            alt="جاري التحميل..."
                            width={120}
                            height={120}
                            className="animate-bounce"
                            style={{ animationDuration: "2s" }}
                          />
                        </div>
                      )}
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        loading="lazy"
                        onLoad={() =>
                          setLoadedThumbs((prev) => new Set(prev).add(v.id))
                        }
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
                          <AnimatedViews value={v.views} />
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          {v.rating || "—"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <nav
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
            dir="ltr"
            aria-label="ترقيم الصفحات"
          >
            <button
              type="button"
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-lg bg-secondary/60 px-3 py-2 text-sm font-semibold transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
              السابق
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => goTo(p)}
                aria-current={p === currentPage ? "page" : undefined}
                className={
                  p === currentPage
                    ? "min-w-10 rounded-lg px-3 py-2 text-sm font-bold text-primary-foreground"
                    : "min-w-10 rounded-lg bg-secondary/60 px-3 py-2 text-sm font-semibold transition hover:bg-secondary"
                }
                style={
                  p === currentPage
                    ? {
                        background: "var(--gradient-neon)",
                        boxShadow: "var(--glow-primary)",
                      }
                    : undefined
                }
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-lg bg-secondary/60 px-3 py-2 text-sm font-semibold transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </button>
          </nav>
        )}
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {channelTitle} · صُنع بـ 💜 لعشاق الأنمي
        </p>
      </footer>
    </div>
  );
}
