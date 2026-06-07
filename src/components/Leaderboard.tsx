import { useEffect, useState, useCallback } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Entry = { id: string; player_name: string; score: number; created_at: string };

const NAME_KEY = "ghawyyyn-player-name";

export function Leaderboard({
  game,
  score,
  canSubmit,
}: {
  game: string;
  score: number;
  canSubmit: boolean;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setName(localStorage.getItem(NAME_KEY) || "");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase
      .from("leaderboard")
      .select("id, player_name, score, created_at")
      .eq("game", game)
      .order("score", { ascending: false })
      .limit(10);
    if (e) setError(e.message);
    else setEntries((data as Entry[]) ?? []);
    setLoading(false);
  }, [game]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset submit state when a new score comes in
  useEffect(() => {
    setSubmitted(false);
  }, [score]);

  const submit = async () => {
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) {
      setError("اكتب اسمك أولاً");
      return;
    }
    if (score <= 0) return;
    setSubmitting(true);
    setError(null);
    if (typeof window !== "undefined") localStorage.setItem(NAME_KEY, trimmed);
    const { error: e } = await supabase
      .from("leaderboard")
      .insert({ game, player_name: trimmed, score: Math.min(score, 10_000_000) });
    setSubmitting(false);
    if (e) {
      setError(e.message);
      return;
    }
    setSubmitted(true);
    load();
  };

  return (
    <div className="cyber-border mt-6 rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gradient-neon">
          <Trophy className="h-5 w-5 text-yellow-400" /> أعلى النقاط
        </h2>
        <span className="text-xs text-muted-foreground">آخر 10 لاعبين</span>
      </div>

      {canSubmit && score > 0 && !submitted && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl bg-secondary/40 p-3 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك"
            maxLength={24}
            className="flex-1 rounded-lg bg-background/70 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-primary"
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            سجّل نقاطك ({score})
          </button>
        </div>
      )}
      {submitted && (
        <p className="mb-3 rounded-lg bg-primary/15 px-3 py-2 text-center text-sm text-primary">
          تم تسجيل نقاطك! 🎉
        </p>
      )}
      {error && <p className="mb-3 text-center text-xs text-destructive">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          كن أول من يسجل نقاطه في هذه اللعبة!
        </p>
      ) : (
        <ol className="space-y-1.5">
          {entries.map((e, i) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                    i === 0
                      ? "bg-yellow-400 text-black"
                      : i === 1
                        ? "bg-gray-300 text-black"
                        : i === 2
                          ? "bg-amber-600 text-white"
                          : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="font-semibold">{e.player_name}</span>
              </span>
              <span className="font-bold text-primary">{e.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
