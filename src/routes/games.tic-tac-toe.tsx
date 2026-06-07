import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";
import { Leaderboard } from "@/components/Leaderboard";

export const Route = createFileRoute("/games/tic-tac-toe")({
  component: TicTacToe,
  head: () => ({
    meta: [
      { title: "إكس أو — غاويين انمى" },
      { name: "description", content: "العب إكس أو بستايل أنمي سايبربانك." },
    ],
  }),
});

type Cell = "X" | "O" | null;

function checkWinner(b: Cell[]): Cell | "draw" | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b1, c] of lines) {
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  }
  return b.every(Boolean) ? "draw" : null;
}

function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [xNext, setXNext] = useState(true);
  const winner = useMemo(() => checkWinner(board), [board]);

  const handleClick = (i: number) => {
    if (board[i] || winner) return;
    const next = [...board];
    next[i] = xNext ? "X" : "O";
    setBoard(next);
    setXNext(!xNext);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setXNext(true);
  };

  const status = winner
    ? winner === "draw"
      ? "تعادل! 🤝"
      : `الفائز: ${winner} 🎉`
    : `دور: ${xNext ? "X" : "O"}`;

  return (
    <div dir="rtl" className="min-h-screen">
      <header className="border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gradient-neon">❌⭕ إكس أو</h1>
          <Link
            to="/games"
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold"
          >
            <ArrowRight className="h-4 w-4" /> الألعاب
          </Link>
        </div>
      </header>

      <section className="container mx-auto max-w-md px-4 py-10">
        <div className="cyber-border mb-6 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-primary">{status}</p>
        </div>

        <div className="grid aspect-square grid-cols-3 gap-3">
          {board.map((c, i) => (
            <button
              key={i}
              onClick={() => handleClick(i)}
              className="cyber-border flex items-center justify-center rounded-xl text-5xl font-black transition hover:scale-105"
              style={{
                color: c === "X" ? "oklch(0.75 0.18 295)" : "oklch(0.78 0.16 200)",
                textShadow: c ? "var(--glow-primary)" : "none",
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <button
          onClick={reset}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition hover:brightness-110"
          style={{ boxShadow: "var(--glow-primary)" }}
        >
          <RotateCcw className="h-4 w-4" /> لعبة جديدة
        </button>

        <AdBanner />
      </section>
    </div>
  );
}
