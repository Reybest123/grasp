"use client";

// An SVG progress ring that fills itself once, on mount.
//
// Shared by the quiz results screen and the dashboard's stat tiles. The arc and
// whatever the caller draws inside it are driven by the same
// `requestAnimationFrame` clock, handed to `children` as `t` (0 to 1), so a
// counting number cannot drift away from the arc around it — which is exactly
// what a CSS transition on the arc plus a separate count-up for the number
// does. `prefers-reduced-motion` jumps straight to the finished value.

import { useEffect, useState, type ReactNode } from "react";

const DURATION = 900;

export function StatRing({
  value,
  size,
  stroke,
  tone,
  track = "text-slate-100",
  className = "",
  children,
}: {
  /** 0 to 1; clamped, so a score over full marks cannot wrap the arc */
  value: number;
  size: number;
  stroke: number;
  /** text-colour class for the filled arc */
  tone: string;
  /** text-colour class for the groove behind it */
  track?: string;
  className?: string;
  /** the middle of the ring, drawn from the same clock as the arc */
  children?: (t: number) => ReactNode;
}) {
  const [t, setT] = useState(0);

  // Mount-only by design. Every caller renders this once its data has landed,
  // and re-running the sweep whenever the value changed would make a figure
  // that updates on a clock tick twitch back to zero and climb again.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      setT(1 - Math.pow(1 - p, 3)); // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pct = Math.max(0, Math.min(1, value));
  // The stroke straddles the path, and a round cap overhangs it by half again,
  // so the radius leaves the full stroke plus a 2px margin inside the box.
  const r = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={track}
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct * t)}
          className={tone}
          stroke="currentColor"
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children(t)}</div>}
    </div>
  );
}
