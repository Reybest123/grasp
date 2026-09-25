"use client";

import { SceneView } from "@/components/landing/SceneView";
import { ShowcaseFrame } from "@/components/landing/ShowcaseFrame";
import type { Scene } from "@/components/landing/scenes/registry";
import { useInView } from "@/lib/useInView";

/**
 * One feature, with the floor to itself: the same scene the hero cycles past in
 * five seconds, here with the room to be read.
 *
 * The scene is mounted only once the section is scrolled to, which is what
 * makes its staggered steps play as an animation rather than having finished
 * silently somewhere below the fold. The frame is a fixed height, so the empty
 * moment before that costs no layout shift.
 */
export function FeatureSpotlight({ scene, flip }: { scene: Scene; flip: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>("0px 0px -20% 0px");

  return (
    <div
      ref={ref}
      className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
    >
      <div className={flip ? "lg:order-last" : ""}>
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-700">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
            {scene.icon}
          </span>
          {scene.label}
        </p>

        <h3 className="mt-4 max-w-md text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[2.2rem]">
          {scene.title}
        </h3>

        <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-slate-600">{scene.body}</p>
      </div>

      <ShowcaseFrame
        subject={scene.subject}
        monogram={scene.monogram}
        tint={scene.tint}
        tab={scene.tab}
      >
        {inView ? <SceneView id={scene.id} /> : null}
      </ShowcaseFrame>
    </div>
  );
}
