import { useEffect, useRef, useState } from "react";

function format(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

type Props = {
  value: string | number;
  durationMs?: number;
  className?: string;
};

/**
 * Smoothly tweens between view counts so updates from background re-syncs
 * don't jump abruptly. Uses requestAnimationFrame with easeOutCubic.
 */
export function AnimatedViews({ value, durationMs = 900, className }: Props) {
  const target = typeof value === "number" ? value : parseInt(String(value || "0"), 10) || 0;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = fromRef.current;
    const to = target;
    if (from === to) return;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = display;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return <span className={className}>{format(display)}</span>;
}
