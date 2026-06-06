import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowRight, Play, RotateCcw, Heart } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";
import snakeAsset from "@/assets/snake-cute.png.asset.json";

export const Route = createFileRoute("/games/snake")({
  component: SnakeRunner,
  head: () => ({
    meta: [
      { title: "ثعبان الجري — غاويين انمى" },
      { name: "description", content: "اقفز فوق الفخاخ واجمع التفاح في لعبة ثعبان الجري بستايل أنمي كيوت." },
    ],
  }),
});

const W = 900;
const H = 360;
const GROUND_Y = 290;
const GRAVITY = 1900;
const JUMP_V = -720;
const SNAKE_X = 110;
const SNAKE_W = 120;
const SNAKE_H = 90;

type Obstacle = { x: number; type: "trap" | "apple" | "coin" };

function SnakeRunner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgRef = useRef<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);

  const stateRef = useRef({
    y: GROUND_Y - SNAKE_H,
    vy: 0,
    onGround: true,
    speed: 300,
    distance: 0,
    coins: 0,
    lives: 3,
    invuln: 0,
    obstacles: [] as Obstacle[],
    spawnTimer: 1.2,
    bgX: 0,
    cloudX: 0,
    bobT: 0,
    last: 0,
    raf: 0,
  });

  useEffect(() => {
    const img = new Image();
    img.src = snakeAsset.url;
    img.crossOrigin = "anonymous";
    bgRef.current = img;
    const stored = typeof window !== "undefined" ? Number(localStorage.getItem("snake-runner-best") || 0) : 0;
    setBest(stored);
    const done = () => {
      setLoading(false);
      setRunning(true);
    };
    img.onload = done;
    img.onerror = done;
    const t = setTimeout(done, 800);
    return () => clearTimeout(t);
  }, []);

  const reset = useCallback(() => {
    stateRef.current = {
      y: GROUND_Y - SNAKE_H,
      vy: 0,
      onGround: true,
      speed: 300,
      distance: 0,
      coins: 0,
      lives: 3,
      invuln: 0,
      obstacles: [],
      spawnTimer: 1.0,
      bgX: 0,
      cloudX: 0,
      bobT: 0,
      last: 0,
      raf: 0,
    };
    setScore(0);
    setCoins(0);
    setLives(3);
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
        if (!running || gameOver) reset();
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

    const drawCloud = (x: number, y: number, scale: number) => {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(x, y, 14 * scale, 0, Math.PI * 2);
      ctx.arc(x + 16 * scale, y - 6 * scale, 18 * scale, 0, Math.PI * 2);
      ctx.arc(x + 34 * scale, y, 14 * scale, 0, Math.PI * 2);
      ctx.arc(x + 18 * scale, y + 6 * scale, 16 * scale, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawTree = (x: number, y: number) => {
      ctx.fillStyle = "#8b5a3c";
      ctx.fillRect(x - 4, y - 10, 8, 20);
      ctx.fillStyle = "#a8d89a";
      ctx.beginPath();
      ctx.arc(x, y - 24, 22, 0, Math.PI * 2);
      ctx.arc(x - 14, y - 16, 16, 0, Math.PI * 2);
      ctx.arc(x + 14, y - 16, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff8a8";
      ctx.beginPath();
      ctx.arc(x - 8, y - 28, 3, 0, Math.PI * 2);
      ctx.arc(x + 6, y - 18, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawCastle = (x: number, y: number) => {
      ctx.fillStyle = "#e8dff5";
      ctx.fillRect(x, y - 60, 70, 60);
      ctx.fillStyle = "#d4c5e8";
      ctx.fillRect(x - 10, y - 80, 20, 80);
      ctx.fillRect(x + 60, y - 80, 20, 80);
      ctx.fillStyle = "#f7b6d2";
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 80);
      ctx.lineTo(x, y - 100);
      ctx.lineTo(x + 10, y - 80);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 60, y - 80);
      ctx.lineTo(x + 70, y - 100);
      ctx.lineTo(x + 80, y - 80);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#a78bfa";
      ctx.fillRect(x + 28, y - 35, 14, 35);
    };

    const drawSnake = (x: number, y: number, t: number) => {
      const bob = Math.sin(t * 6) * 3;
      const ox = x;
      const oy = y + bob;
      // body (wavy pastel segments)
      const colors = ["#ffd4e5", "#ffe8c4", "#fff4b8", "#c8f0d4", "#c4e4ff", "#d8c8ff"];
      for (let i = 5; i >= 0; i -= 1) {
        const segX = ox + 50 + i * 12;
        const segY = oy + 50 + Math.sin(t * 6 + i * 0.6) * 6;
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(segX, segY, 18 - i * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(150,110,140,0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // bow on tail
      ctx.fillStyle = "#ffb6d9";
      ctx.beginPath();
      ctx.moveTo(ox + 120, oy + 50);
      ctx.lineTo(ox + 132, oy + 42);
      ctx.lineTo(ox + 132, oy + 58);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ox + 120, oy + 50);
      ctx.lineTo(ox + 108, oy + 42);
      ctx.lineTo(ox + 108, oy + 58);
      ctx.closePath();
      ctx.fill();

      // head
      ctx.fillStyle = "#b8e6c9";
      ctx.beginPath();
      ctx.arc(ox + 30, oy + 42, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(120,90,110,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // antlers
      ctx.strokeStyle = "#d4a8c8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ox + 20, oy + 18);
      ctx.lineTo(ox + 14, oy + 4);
      ctx.moveTo(ox + 40, oy + 18);
      ctx.lineTo(ox + 46, oy + 4);
      ctx.stroke();

      // cheeks
      ctx.fillStyle = "rgba(255,180,200,0.7)";
      ctx.beginPath();
      ctx.arc(ox + 18, oy + 48, 4, 0, Math.PI * 2);
      ctx.arc(ox + 42, oy + 48, 4, 0, Math.PI * 2);
      ctx.fill();

      // eyes
      ctx.fillStyle = "#3d2840";
      ctx.beginPath();
      ctx.arc(ox + 24, oy + 40, 4, 0, Math.PI * 2);
      ctx.arc(ox + 38, oy + 40, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ox + 25, oy + 39, 1.5, 0, Math.PI * 2);
      ctx.arc(ox + 39, oy + 39, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // smile
      ctx.strokeStyle = "#3d2840";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ox + 31, oy + 52, 4, 0, Math.PI);
      ctx.stroke();

      // scarf
      ctx.fillStyle = "#b8d4f0";
      ctx.beginPath();
      ctx.moveTo(ox + 50, oy + 58);
      ctx.lineTo(ox + 68, oy + 52);
      ctx.lineTo(ox + 66, oy + 72);
      ctx.lineTo(ox + 48, oy + 70);
      ctx.closePath();
      ctx.fill();
    };

    const loop = (t: number) => {
      const s = stateRef.current;
      if (!s.last) s.last = t;
      const dt = Math.min(0.05, (t - s.last) / 1000);
      s.last = t;
      s.bobT += dt;
      if (s.invuln > 0) s.invuln -= dt;

      s.vy += GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.y >= GROUND_Y - SNAKE_H) {
        s.y = GROUND_Y - SNAKE_H;
        s.vy = 0;
        s.onGround = true;
      }

      s.distance += s.speed * dt;
      s.speed = Math.min(580, 300 + s.distance * 0.04);
      s.bgX = (s.bgX - s.speed * 0.3 * dt) % W;
      s.cloudX = (s.cloudX - s.speed * 0.08 * dt) % W;

      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        const r = Math.random();
        const type: Obstacle["type"] = r < 0.35 ? "apple" : r < 0.6 ? "coin" : "trap";
        s.obstacles.push({ x: W + 30, type });
        s.spawnTimer = 0.65 + Math.random() * 0.8;
      }

      const snakeRect = { x: SNAKE_X + 20, y: s.y + 20, w: SNAKE_W - 40, h: SNAKE_H - 28 };
      const remaining: Obstacle[] = [];
      let died = false;
      for (const o of s.obstacles) {
        o.x -= s.speed * dt;
        const ow = o.type === "trap" ? 36 : 28;
        const oh = o.type === "trap" ? 32 : 28;
        const oy = o.type === "apple" ? GROUND_Y - 70 : o.type === "coin" ? GROUND_Y - 90 : GROUND_Y - oh;
        const hit =
          snakeRect.x < o.x + ow &&
          snakeRect.x + snakeRect.w > o.x &&
          snakeRect.y < oy + oh &&
          snakeRect.y + snakeRect.h > oy;
        if (hit) {
          if (o.type === "apple") {
            s.coins += 1;
            setCoins(s.coins);
            continue;
          }
          if (o.type === "coin") {
            s.coins += 3;
            setCoins(s.coins);
            continue;
          }
          if (s.invuln <= 0) {
            s.lives -= 1;
            s.invuln = 1.2;
            setLives(s.lives);
            if (s.lives <= 0) died = true;
          }
        }
        if (o.x + ow > -10) remaining.push(o);
      }
      s.obstacles = remaining;

      // sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#bce4ff");
      sky.addColorStop(0.6, "#e8d4f5");
      sky.addColorStop(1, "#ffe0ec");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // clouds
      for (let i = 0; i < 5; i += 1) {
        const cx = ((i * 220 + s.cloudX) % (W + 220)) - 110;
        drawCloud(cx, 50 + (i % 2) * 30, 1 + (i % 2) * 0.3);
      }

      // distant castle
      const castleX = ((s.bgX * 0.4) % (W + 200)) + 120;
      drawCastle(castleX, GROUND_Y);

      // far hills
      ctx.fillStyle = "#c8e6ff";
      for (let i = 0; i < 6; i += 1) {
        const x = ((i * 200 + s.bgX * 0.4) % (W + 200)) - 100;
        ctx.beginPath();
        ctx.arc(x, GROUND_Y + 10, 90, Math.PI, 0);
        ctx.fill();
      }
      // mid hills
      ctx.fillStyle = "#b8e8c4";
      for (let i = 0; i < 5; i += 1) {
        const x = ((i * 260 + s.bgX * 0.7) % (W + 260)) - 130;
        ctx.beginPath();
        ctx.arc(x, GROUND_Y + 5, 110, Math.PI, 0);
        ctx.fill();
      }

      // ground
      ctx.fillStyle = "#a8e890";
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.fillStyle = "#7fd06a";
      for (let i = 0; i < 18; i += 1) {
        const x = ((i * 60 + s.bgX) % (W + 60)) - 30;
        ctx.fillRect(x, GROUND_Y + 8, 20, 4);
      }
      // dirt line
      ctx.fillStyle = "#c4946a";
      ctx.fillRect(0, GROUND_Y + 40, W, 4);

      // trees
      for (let i = 0; i < 4; i += 1) {
        const x = ((i * 280 + s.bgX * 0.9) % (W + 280)) - 140;
        drawTree(x, GROUND_Y + 5);
      }

      // flowers
      for (let i = 0; i < 8; i += 1) {
        const x = ((i * 130 + s.bgX) % (W + 130)) - 65;
        ctx.fillStyle = i % 2 ? "#ffb6d9" : "#fff8a8";
        ctx.beginPath();
        ctx.arc(x, GROUND_Y + 30, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(x, GROUND_Y + 30, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // obstacles
      for (const o of s.obstacles) {
        if (o.type === "apple") {
          // pink apple
          ctx.fillStyle = "#ff8fb8";
          ctx.beginPath();
          ctx.arc(o.x + 14, GROUND_Y - 56, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#a8e890";
          ctx.fillRect(o.x + 13, GROUND_Y - 74, 4, 8);
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.beginPath();
          ctx.arc(o.x + 10, GROUND_Y - 60, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.type === "coin") {
          // gold coin
          ctx.fillStyle = "#ffd700";
          ctx.beginPath();
          ctx.arc(o.x + 14, GROUND_Y - 76, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#e8a800";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = "#e8a800";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("★", o.x + 14, GROUND_Y - 71);
        } else {
          // cute purple thorn trap
          ctx.fillStyle = "#a78bfa";
          ctx.beginPath();
          ctx.moveTo(o.x, GROUND_Y);
          ctx.lineTo(o.x + 9, GROUND_Y - 30);
          ctx.lineTo(o.x + 18, GROUND_Y);
          ctx.lineTo(o.x + 27, GROUND_Y - 30);
          ctx.lineTo(o.x + 36, GROUND_Y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#7c5fd6";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // snake with flicker when invulnerable
      const blink = s.invuln > 0 && Math.floor(s.invuln * 12) % 2 === 0;
      if (!blink) {
        ctx.save();
        ctx.translate(SNAKE_X * 2 + SNAKE_W, 0);
        ctx.scale(-1, 1);
        drawSnake(SNAKE_X, s.y, s.bobT);
        ctx.restore();
      }

      const newScore = Math.floor(s.distance) + s.coins * 10;
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
        <div className="cyber-border mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`h-5 w-5 ${i < lives ? "fill-pink-400 text-pink-400" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          <span className="flex items-center gap-1 font-bold">
            <span className="text-yellow-400">●</span> x{coins}
          </span>
          <span className="font-bold">النقاط: <span className="text-primary">{score}</span></span>
          <span className="text-sm text-muted-foreground">الأفضل: {best}</span>
        </div>

        <div
          className="cyber-border relative w-full overflow-hidden rounded-2xl"
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
          🍎 تفاحة = +1 · ⭐ عملة = +3 · 💜 شوك = خسارة قلب
        </p>

        <AdBanner />
      </section>
    </div>
  );
}
