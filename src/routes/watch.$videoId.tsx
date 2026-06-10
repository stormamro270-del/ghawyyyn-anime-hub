import { createFileRoute, Link } from "@tanstack/react-router";
import { getChannelVideos, type Video } from "@/lib/youtube.functions";
import { ArrowRight, Eye, Star, Youtube } from "lucide-react";

export const Route = createFileRoute("/watch/$videoId")({
  loader: () => getChannelVideos(),
  component: WatchPage,
  head: ({ params }) => ({
    meta: [
      { title: `مشاهدة — غاويين انمى` },
      {
        name: "description",
        content: `شاهد الفيديو ${params.videoId} على غاويين انمى.`,
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

function WatchPage() {
  const { videoId } = Route.useParams();
  const { videos, channelTitle } = Route.useLoaderData();
  const current = videos.find((v: Video) => v.id === videoId) ?? videos[0];
  const related = videos.filter((v: Video) => v.id !== current.id).slice(0, 8);

  const videoLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: current.title,
    description: current.description || current.title,
    thumbnailUrl: [current.thumbnail],
    uploadDate: current.published || new Date().toISOString(),
    contentUrl: `https://www.youtube.com/watch?v=${current.id}`,
    embedUrl: `https://www.youtube.com/embed/${current.id}`,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: { "@type": "WatchAction" },
      userInteractionCount: parseInt(current.views || "0", 10),
    },
    publisher: {
      "@type": "Organization",
      name: channelTitle,
    },
  });

  return (
    <div dir="rtl" className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: videoLd }} />
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent">
            <ArrowRight className="h-4 w-4" />
            رجوع للرئيسية
          </Link>
          <span className="hidden text-gradient-neon font-bold sm:block">{channelTitle}</span>
          <a
            href={`https://www.youtube.com/watch?v=${current.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
          >
            <Youtube className="h-3.5 w-3.5" />
            يوتيوب
          </a>
        </div>
      </header>

      <main className="container mx-auto grid gap-8 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div
            className="cyber-border overflow-hidden rounded-2xl"
            style={{ animation: "glow-pulse 3s ease-in-out infinite" }}
          >
            <div className="aspect-video w-full">
              <iframe
                key={current.id}
                src={`https://www.youtube-nocookie.com/embed/${current.id}?rel=0&modestbranding=1&playsinline=1`}
                title={current.title}
                className="h-full w-full"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>

          <h1 className="mt-6 text-xl font-bold leading-snug md:text-2xl">
            {current.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1">
              <Eye className="h-3.5 w-3.5 text-accent" />
              {formatViews(current.views)} مشاهدة
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              {current.rating || "—"}
            </span>
          </div>

          <div className="cyber-border mt-5 rounded-xl p-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {current.description}
            </p>
          </div>
        </div>

        <aside>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-accent">
            ◆ شاهد أيضاً
          </h2>
          <div className="space-y-3">
            {related.map((v: Video) => (
              <Link
                key={v.id}
                to="/watch/$videoId"
                params={{ videoId: v.id }}
                className="cyber-border group flex gap-3 overflow-hidden rounded-xl p-2"
              >
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  loading="lazy"
                  className="h-20 w-32 flex-shrink-0 rounded-lg object-cover transition-transform group-hover:scale-105"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-xs font-semibold leading-snug group-hover:text-primary">
                    {v.title}
                  </h3>
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {formatViews(v.views)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
