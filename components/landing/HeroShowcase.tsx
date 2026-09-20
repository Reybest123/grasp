"use client";

import { useEffect, useState } from "react";
import { SceneView } from "@/components/landing/SceneView";
import { ShowcaseFrame } from "@/components/landing/ShowcaseFrame";
import { SCENES } from "@/components/landing/scenes/registry";

/** How long each scene holds before the next one takes over. The slowest scene
 *  finishes its last step at about 1.3s, so this leaves roughly a second and a
 *  half to read it before the next one arrives. Shorten the scene delays too if
 *  this goes much lower, or a scene will be replaced mid-build. */
const DWELL_MS = 2800;

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
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // The cycle never pauses — not on hover, not on focus (at the user's
  // request). Clicking a pill still jumps straight to that scene, and because
  // this effect depends on `index`, doing so restarts the clock rather than
  // leaving the picked scene to be replaced a moment later.
  //
  // Reduced motion is the one thing that stops it, and it stops it outright
  // rather than slowing it down: a panel that changes under you on a timer is
  // exactly the movement the preference is asking not to see. The pills still
  // work, so every scene stays reachable by choice instead of by waiting.
  useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % SCENES.length), DWELL_MS);
    return () => window.clearTimeout(id);
  }, [index, reduced]);

  const scene = SCENES[index];

  return (
    <div className="rise relative [animation-delay:120ms]">
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

              {active && !reduced && (
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
