"use client";

import { useEffect, useState } from "react";
import { SceneView } from "@/components/landing/SceneView";
import { ShowcaseFrame } from "@/components/landing/ShowcaseFrame";
import { SCENES } from "@/components/landing/scenes/registry";

/** How long each scene holds before the next one takes over. Long enough for
 *  the slowest scene's last step (the Record scene's closing line, at 1.6s) to
 *  land and then be read. */
const DWELL_MS = 5200;

/**
 * The hero's right-hand side: one notebook, cycling through the four things
 * Grasp does to it.
 *
 * The scene is keyed on its id, so switching remounts it and its CSS animations
 * replay from the start — the same mechanism PageTransition uses to re-run a
 * route fade. Nothing has to reset an animation by hand.
 */
export function HeroShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Reduced motion stops the carousel outright rather than speeding it up: a
  // panel that changes under you on a timer is exactly the movement the
  // preference is asking not to see. The pills still work, so every scene is
  // still reachable — by choice instead of by waiting.
  useEffect(() => {
    if (paused || reduced) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % SCENES.length), DWELL_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, reduced]);

  const scene = SCENES[index];

  return (
    <div
      className="rise relative [animation-delay:120ms]"
      // Pausing on hover and on keyboard focus, because reading the scene and
      // having it swap out from under you is the one way this pattern annoys.
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <ShowcaseFrame
        subject={scene.subject}
        monogram={scene.monogram}
        tint={scene.tint}
        tab={scene.tab}
      >
        {/* Announced politely: the panel changes on its own, and a screen
            reader user gets the new scene's name rather than silence. */}
        <div key={scene.id} className="h-full" aria-live="polite">
          <SceneView id={scene.id} />
        </div>
      </ShowcaseFrame>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {SCENES.map((s, i) => {
          const active = i === index;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-current={active ? "true" : undefined}
              className={`group relative overflow-hidden rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-ink"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className={active ? "text-brand-600" : "text-slate-400"}>{s.icon}</span>
                {s.label}
              </span>

              {active && !reduced && !paused && (
                <span
                  aria-hidden="true"
                  // Keyed on the index so the bar restarts with each scene
                  // rather than continuing from wherever the last one stopped.
                  key={index}
                  className="pill-progress absolute inset-x-0 bottom-0 h-0.5 bg-brand-500"
                  style={{ animationDuration: `${DWELL_MS}ms` }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
