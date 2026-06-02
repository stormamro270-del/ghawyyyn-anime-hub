import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowRight, Play, RotateCcw } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";
import snakeAsset from "@/assets/snake-runner.png.asset.json";

export const Route = createFileRoute("/games/snake")({
  component: SnakeRunner,
  head: () => ({
    meta: [
      { title: "ثعبان الجري — غاويين انمى" },
      { name: "description", content: "اقفز فوق الفخاخ واجمع التفاح في لعبة ثعبان الجري بستايل أنمي." },
    ],
  }),
});

// World units (logical pixels)
const W = 800;
const H = 280;
const GROUND_Y = 230;
const GRAVITY = 1800;
const JUMP_V = -680;
const SNAKE_X = 90;
const SNAKE_W = 78;
const SNAKE_H = 56;

type Obstacle = {
  x: number;
  type: "trap" | "apple";
};

function SnakeRunner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const stateRef = useRef({
    y: GROUND_Y - SNAKE_H,
    vy: 0,
    onGround: true,
    speed: 280,
    distance: 0,
    apples: 0,
    obstacles: [] as Obstacle[],
    spawnTimer: 1.2,
    bgX: 0,
    last: 0,
    raf: 0,
  });

  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = snakeAsset.url;
    img.crossOrigin = "anonymous";
    imgRef.current = img;
    const stored = typeof window !== "undefined" ? Number(localStorage.getItem("snake-runner-best") || 0) : 0;
    setBest(stored);
  }, []);

  const reset = useCallback(() => {
    stateRef.current = {
      y: GROUND_Y - SNAKE_H,
      vy: 0,
      onGround: true,
      speed: 280,
      distance: 0,
      apples: 0,
      obstacles: [],
      spawnTimer: 1.2,
      bgX: 0,
      last: 0,
      raf: 0,
    };
    setScore(0);
    setGameOver(false);
    setRunning(true);
  }, []);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (!running || gameOver) return;
    if (s.onGround) {
      s.vy = JUMP_V;
      s.onGround = false;
    }
  }, [running, gameOver]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        if (!running && !gameOver) reset();
        else if (gameOver) reset();
        else jump();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [jump, reset, running, gameOver]);

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = (t: number) => {
      const s = stateRef.current;
      if (!s.last) s.last = t;
      const dt = Math.min(0.05, (t - s.last) / 1000);
      s.last = t;

      // physics
      s.vy += GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.y >= GROUND_Y - SNAKE_H) {
        s.y = GROUND_Y - SNAKE_H;
        s.vy = 0;
        s.onGround = true;
      }

      s.distance += s.speed * dt;
      s.speed = Math.min(560, 280 + s.distance * 0.04);
      s.bgX = (s.bgX - s.speed * 0.3 * dt) % W;

      // spawn
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        const isApple = Math.random() < 0.45;
        s.obstacles.push({ x: W + 30, type: isApple ? "apple" : "trap" });
        s.spawnTimer = 0.7 + Math.random() * (isApple ? 0.5 : 1.0);
      }
      // move + collisions
      const snakeRect = { x: SNAKE_X + 10, y: s.y + 10, w: SNAKE_W - 20, h: SNAKE_H - 14 };
      const remaining: Obstacle[] = [];
      let died = false;
      for (const o of s.obstacles) {
        o.x -= s.speed * dt;
        const ow = o.type === "apple" ? 28 : 34;
        const oh = o.type === "apple" ? 28 : 30;
        const oy = o.type === "apple" ? GROUND_Y - 60 : GROUND_Y - oh;
        const collide =
          snakeRect.x < o.x + ow &&
          snakeRect.x + snakeRect.w > o.x &&
          snakeRect.y < oy + oh &&
          snakeRect.y + snakeRect.h > oy;
        if (collide) {
          if (o.type === "apple") {
            s.apples += 1;
            continue;
          } else {
            died = true;
          }
        }
        if (o.x + ow > -10) remaining.push(o);
      }
      s.obstacles = remaining;

      // draw
      // sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#bfe9ff");
      grad.addColorStop(1, "#ffe0f3");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // distant hills
      ctx.fillStyle = "#cdeac0";
      for (let i = 0; i < 5; i += 1) {
        const x = ((i * 220 + s.bgX * 0.5) % (W + 200)) - 100;
        ctx.beginPath();
        ctx.arc(x, GROUND_Y - 10, 90, Math.PI, 0);
        ctx.fill();
      }
      // ground
      ctx.fillStyle = "#a9d977";
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.fillStyle = "#7fb85a";
      for (let i = 0; i < 12; i += 1) {
        const x = ((i * 80 + s.bgX) % (W + 80)) - 40;
        ctx.fillRect(x, GROUND_Y + 6, 30, 4);
      }

      // obstacles
      for (const o of s.obstacles) {
        if (o.type === "apple") {
          ctx.fillStyle = "#ff6b9d";
          ctx.beginPath();
          ctx.arc(o.x + 14, GROUND_Y - 46, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#7bd389";
          ctx.fillRect(o.x + 13, GROUND_Y - 62, 4, 6);
        } else {
          // trap = spikes
          ctx.fillStyle = "#6b3a8a";
          ctx.beginPath();
          ctx.moveTo(o.x, GROUND_Y);
          ctx.lineTo(o.x + 8, GROUND_Y - 30);
          ctx.lineTo(o.x + 16, GROUND_Y);
          ctx.lineTo(o.x + 24, GROUND_Y - 30);
          ctx.lineTo(o.x + 32, GROUND_Y);
          ctx.closePath();
          ctx.fill();
        }
      }

      // snake sprite
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        // crop the snake area roughly from center of source image
        const sx = img.naturalWidth * 0.28;
        const sy = img.naturalHeight * 0.18;
        const sw = img.naturalWidth * 0.5;
        const sh = img.naturalHeight * 0.6;
        ctx.drawImage(img, sx, sy, sw, sh, SNAKE_X, s.y, SNAKE_W, SNAKE_H);
      } else {
        ctx.fillStyle = "#a78bfa";
        ctx.fillRect(SNAKE_X, s.y, SNAKE_W, SNAKE_H);
      }

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`🍎 ${s.apples}`, 12, 26);
      ctx.textAlign = "right";
      ctx.fillText(`${Math.floor(s.distance)}m`, W - 12, 26);

      const newScore = Math.floor(s.distance) + s.apples * 10;
      setScore(newScore);

      if (died) {
        setGameOver(true);
        setRunning(false);
        if (newScore > best) {
          setBest(newScore);
          if (typeof window !== "undefined") localStorage.setItem("snake-runner-best", String(newScore));
        }
        return;
      }
      s.raf = requestAnimationFrame(loop);
    };
    stateRef.current.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stateRef.current.raf);
  }, [running, best]);

  return (
    <div dir="rtl" className="min-h-screen">
      <header className="border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gradient-neon">🐍 ثعبان الجري</h1>
          <Link to="/games" className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold">
            <ArrowRight className="h-4 w-4" /> الألعاب
          </Link>
        </div>
      </header>

      <section className="container mx-auto max-w-3xl px-4 py-6">
        <div className="cyber-border mb-4 flex items-center justify-between rounded-xl p-3">
          <span className="font-bold">النقاط: <span className="text-primary">{score}</span></span>
          <span className="text-sm text-muted-foreground">الأفضل: {best}</span>
          {gameOver && <span className="font-bold text-destructive">انتهت اللعبة!</span>}
        </div>

        <div
          className="cyber-border relative w-full overflow-hidden rounded-xl"
          onClick={() => (running ? jump() : reset())}
          onTouchStart={(e) => {
            e.preventDefault();
            running ? jump() : reset();
          }}
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block w-full"
            style={{ aspectRatio: `${W}/${H}`, height: "auto" }}
          />
          {!running && (
            <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-sm">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground"
                style={{ boxShadow: "var(--glow-primary)" }}
              >
                {gameOver ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {gameOver ? "العب مرة تانية" : "ابدأ اللعبة"}
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          اضغط على المسطرة (Space) أو السهم العلوي للقفز · أو اضغط على الشاشة في الموبايل
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          اجمع 🍎 التفاح واهرب من الفخاخ البنفسجية
        </p>

        <AdBanner />
      </section>
    </div>
  );
}
