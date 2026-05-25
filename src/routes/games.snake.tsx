import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowRight, Play, RotateCcw } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";

export const Route = createFileRoute("/games/snake")({
  component: SnakeGame,
  head: () => ({
    meta: [
      { title: "الثعبان — غاويين انمى" },
      { name: "description", content: "العب لعبة الثعبان بستايل أنمي سايبربانك." },
    ],
  }),
});

const SIZE = 20;
type Point = { x: number; y: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

const DIRS: Record<Dir, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

function randApple(snake: Point[]): Point {
  while (true) {
    const p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [dir, setDir] = useState<Dir>("RIGHT");
  const [apple, setApple] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);
  const dirRef = useRef(dir);
  dirRef.current = dir;

  const reset = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setDir("RIGHT");
    setApple({ x: 5, y: 5 });
    setScore(0);
    setGameOver(false);
    setRunning(true);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const d = dirRef.current;
      if ((e.key === "ArrowUp" || e.key === "w") && d !== "DOWN") setDir("UP");
      if ((e.key === "ArrowDown" || e.key === "s") && d !== "UP") setDir("DOWN");
      if ((e.key === "ArrowLeft" || e.key === "a") && d !== "RIGHT") setDir("LEFT");
      if ((e.key === "ArrowRight" || e.key === "d") && d !== "LEFT") setDir("RIGHT");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!running || gameOver) return;
    const id = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const move = DIRS[dirRef.current];
        const newHead = { x: head.x + move.x, y: head.y + move.y };

        if (
          newHead.x < 0 || newHead.x >= SIZE ||
          newHead.y < 0 || newHead.y >= SIZE ||
          prev.some((s) => s.x === newHead.x && s.y === newHead.y)
        ) {
          setGameOver(true);
          setRunning(false);
          return prev;
        }

        const ate = newHead.x === apple.x && newHead.y === apple.y;
        const next = ate ? [newHead, ...prev] : [newHead, ...prev.slice(0, -1)];
        if (ate) {
          setScore((s) => s + 10);
          setApple(randApple(next));
        }
        return next;
      });
    }, 130);
    return () => clearInterval(id);
  }, [running, gameOver, apple]);

  const turn = (d: Dir) => {
    const cur = dirRef.current;
    if ((d === "UP" && cur !== "DOWN") || (d === "DOWN" && cur !== "UP") ||
        (d === "LEFT" && cur !== "RIGHT") || (d === "RIGHT" && cur !== "LEFT")) {
      setDir(d);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen">
      <header className="border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gradient-neon">🐍 الثعبان</h1>
          <Link to="/games" className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold">
            <ArrowRight className="h-4 w-4" /> الألعاب
          </Link>
        </div>
      </header>

      <section className="container mx-auto max-w-md px-4 py-6">
        <div className="cyber-border mb-4 flex items-center justify-between rounded-xl p-3">
          <span className="font-bold">النقاط: <span className="text-primary">{score}</span></span>
          {gameOver && <span className="font-bold text-destructive">انتهت اللعبة!</span>}
        </div>

        <div
          className="cyber-border relative aspect-square w-full overflow-hidden rounded-xl"
          style={{ background: "oklch(0.1 0.04 295)" }}
        >
          <div
            className="grid h-full w-full"
            style={{
              gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${SIZE}, 1fr)`,
            }}
          >
            {Array.from({ length: SIZE * SIZE }).map((_, i) => {
              const x = i % SIZE;
              const y = Math.floor(i / SIZE);
              const isSnake = snake.some((s) => s.x === x && s.y === y);
              const isHead = snake[0].x === x && snake[0].y === y;
              const isApple = apple.x === x && apple.y === y;
              return (
                <div
                  key={i}
                  style={{
                    background: isHead
                      ? "var(--gradient-neon)"
                      : isSnake
                      ? "oklch(0.75 0.18 295 / 0.6)"
                      : isApple
                      ? "oklch(0.7 0.22 25)"
                      : "transparent",
                    boxShadow: isHead || isApple ? "0 0 8px currentColor" : "none",
                    borderRadius: isApple ? "50%" : "2px",
                  }}
                />
              );
            })}
          </div>
        </div>

        {!running && (
          <button
            onClick={reset}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground"
            style={{ boxShadow: "var(--glow-primary)" }}
          >
            {gameOver ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {gameOver ? "العب مرة تانية" : "ابدأ اللعبة"}
          </button>
        )}

        {/* أزرار التحكم للموبايل */}
        <div className="mt-6 grid grid-cols-3 gap-2 sm:hidden">
          <div />
          <button onClick={() => turn("UP")} className="cyber-border rounded-xl py-4 text-xl font-bold">↑</button>
          <div />
          <button onClick={() => turn("RIGHT")} className="cyber-border rounded-xl py-4 text-xl font-bold">→</button>
          <button onClick={() => turn("DOWN")} className="cyber-border rounded-xl py-4 text-xl font-bold">↓</button>
          <button onClick={() => turn("LEFT")} className="cyber-border rounded-xl py-4 text-xl font-bold">←</button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          استخدم الأسهم أو WASD على الكيبورد
        </p>

        <AdBanner />
      </section>
    </div>
  );
}
