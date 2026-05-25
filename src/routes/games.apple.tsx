import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";

export const Route = createFileRoute("/games/apple")({
  component: AppleGame,
  head: () => ({
    meta: [
      { title: "التفاحة 2048 — غاويين انمى" },
      { name: "description", content: "ادمج التفاحات للوصول للرقم 2048 بستايل أنمي." },
    ],
  }),
});

const SIZE = 4;
type Grid = number[][];

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandom(g: Grid): Grid {
  const empty: [number, number][] = [];
  g.forEach((row, i) => row.forEach((v, j) => v === 0 && empty.push([i, j])));
  if (!empty.length) return g;
  const [i, j] = empty[Math.floor(Math.random() * empty.length)];
  const next = g.map((r) => [...r]);
  next[i][j] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slide(row: number[]): { row: number[]; gained: number } {
  const filtered = row.filter((v) => v !== 0);
  let gained = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      gained += filtered[i];
      filtered.splice(i + 1, 1);
    }
  }
  while (filtered.length < SIZE) filtered.push(0);
  return { row: filtered, gained };
}

function rotateCW(g: Grid): Grid {
  const n = g.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => g[n - 1 - j][i])
  );
}

function move(g: Grid, dir: "L" | "R" | "U" | "D"): { grid: Grid; gained: number; changed: boolean } {
  let work = g.map((r) => [...r]);
  const rotations = { L: 0, U: 1, R: 2, D: 3 }[dir];
  for (let i = 0; i < rotations; i++) work = rotateCW(work);
  let gained = 0;
  const newGrid = work.map((row) => {
    const { row: r, gained: gg } = slide(row);
    gained += gg;
    return r;
  });
  for (let i = 0; i < (4 - rotations) % 4; i++) work = rotateCW(newGrid);
  let final = newGrid;
  for (let i = 0; i < (4 - rotations) % 4; i++) final = rotateCW(final);
  const changed = JSON.stringify(final) !== JSON.stringify(g);
  return { grid: final, gained, changed };
}

const colors: Record<number, string> = {
  0: "oklch(0.18 0.04 295)",
  2: "oklch(0.7 0.1 25)",
  4: "oklch(0.7 0.15 25)",
  8: "oklch(0.7 0.2 25)",
  16: "oklch(0.7 0.22 15)",
  32: "oklch(0.65 0.24 5)",
  64: "oklch(0.6 0.26 350)",
  128: "oklch(0.7 0.2 295)",
  256: "oklch(0.7 0.22 295)",
  512: "oklch(0.7 0.24 280)",
  1024: "oklch(0.75 0.22 260)",
  2048: "oklch(0.8 0.2 200)",
};

function AppleGame() {
  const [grid, setGrid] = useState<Grid>(() => addRandom(addRandom(emptyGrid())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const reset = useCallback(() => {
    setGrid(addRandom(addRandom(emptyGrid())));
    setScore(0);
  }, []);

  const handleMove = useCallback((dir: "L" | "R" | "U" | "D") => {
    setGrid((prev) => {
      const { grid: next, gained, changed } = move(prev, dir);
      if (!changed) return prev;
      setScore((s) => {
        const ns = s + gained;
        setBest((b) => Math.max(b, ns));
        return ns;
      });
      return addRandom(next);
    });
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleMove("L");
      if (e.key === "ArrowRight") handleMove("R");
      if (e.key === "ArrowUp") handleMove("U");
      if (e.key === "ArrowDown") handleMove("D");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleMove]);

  // Touch swipe
  useEffect(() => {
    let sx = 0, sy = 0;
    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? "R" : "L");
      else handleMove(dy > 0 ? "D" : "U");
    };
    const el = document.getElementById("apple-board");
    el?.addEventListener("touchstart", onStart);
    el?.addEventListener("touchend", onEnd);
    return () => {
      el?.removeEventListener("touchstart", onStart);
      el?.removeEventListener("touchend", onEnd);
    };
  }, [handleMove]);

  return (
    <div dir="rtl" className="min-h-screen">
      <header className="border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gradient-neon">🍎 التفاحة 2048</h1>
          <Link to="/games" className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold">
            <ArrowRight className="h-4 w-4" /> الألعاب
          </Link>
        </div>
      </header>

      <section className="container mx-auto max-w-md px-4 py-6">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="cyber-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">النقاط</p>
            <p className="text-xl font-bold text-primary">{score}</p>
          </div>
          <div className="cyber-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">الأفضل</p>
            <p className="text-xl font-bold text-accent">{best}</p>
          </div>
        </div>

        <div
          id="apple-board"
          className="cyber-border grid aspect-square gap-2 rounded-xl p-2"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, touchAction: "none" }}
        >
          {grid.flat().map((v, i) => (
            <div
              key={i}
              className="flex items-center justify-center rounded-lg text-2xl font-black transition-all"
              style={{
                background: colors[v] ?? "oklch(0.8 0.2 295)",
                color: v >= 8 ? "white" : v ? "oklch(0.95 0.02 295)" : "transparent",
                boxShadow: v >= 64 ? "0 0 12px currentColor" : "none",
              }}
            >
              {v === 0 ? "" : v === 2 ? "🍎" : v}
            </div>
          ))}
        </div>

        <button
          onClick={reset}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground"
          style={{ boxShadow: "var(--glow-primary)" }}
        >
          <RotateCcw className="h-4 w-4" /> لعبة جديدة
        </button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          اسحب بإصبعك أو استخدم الأسهم
        </p>

        <AdBanner />
      </section>
    </div>
  );
}
