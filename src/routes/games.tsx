import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2, ArrowRight, Sparkles } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";

export const Route = createFileRoute("/games")({
  component: GamesPage,
  head: () => ({
    meta: [
      { title: "ألعاب — غاويين انمى" },
      {
        name: "description",
        content:
          "العب ألعاب أنمي بسيطة وممتعة: إكس أو، الثعبان، التفاحة 2048 بستايل سايبربانك.",
      },
      { property: "og:title", content: "ألعاب أنمي للتسلية — غاويين انمى" },
      {
        property: "og:description",
        content: "مجموعة ألعاب صغيرة بستايل أنمي سايبربانك.",
      },
    ],
  }),
});

const games = [
  {
    id: "tic-tac-toe",
    title: "إكس أو",
    desc: "اللعبة الكلاسيكية ضد صديق أو الكمبيوتر",
    emoji: "❌⭕",
    to: "/games/tic-tac-toe" as const,
  },
  {
    id: "snake",
    title: "ثعبان الجري",
    desc: "اقفز فوق الفخاخ واجمع التفاح في الجري اللانهائي",
    emoji: "🐍",
    to: "/games/snake" as const,
  },
  {
    id: "apple",
    title: "التفاحة 2048",
    desc: "ادمج التفاحات للوصول للرقم 2048",
    emoji: "🍎",
    to: "/games/apple" as const,
  },
];

function GamesPage() {
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
              <p className="text-xs text-muted-foreground">صالة الألعاب</p>
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
          <div className="h-px flex-1 bg-gradient-to-l from-primary/60 to-transparent" />
          <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
            <Gamepad2 className="h-4 w-4" /> ◆ الألعاب
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-primary/60 to-transparent" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => (
            <Link
              key={g.id}
              to={g.to}
              className="cyber-border group block overflow-hidden rounded-xl p-6 text-center transition hover:scale-[1.02]"
            >
              <div className="mb-3 text-6xl">{g.emoji}</div>
              <h3 className="mb-2 text-xl font-bold text-gradient-neon">{g.title}</h3>
              <p className="text-sm text-muted-foreground">{g.desc}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary">
                العب الآن ←
              </div>
            </Link>
          ))}
        </div>

        <AdBanner />
      </section>
    </div>
  );
}
