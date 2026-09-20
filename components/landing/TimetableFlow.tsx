"use client";

import { ShowcaseFrame } from "@/components/landing/ShowcaseFrame";
import { TimetableScene } from "@/components/landing/scenes/TimetableScene";
import { useInView } from "@/lib/useInView";

/**
 * The onboarding step, shown rather than described: a timetable screenshot
 * being read and the notebooks it produced. Mounted on scroll for the same
 * reason the feature sections are — so its steps play when they are watched.
 */
export function TimetableFlow() {
  const { ref, inView } = useInView<HTMLDivElement>("0px 0px -20% 0px");

  return (
    <div ref={ref}>
      <ShowcaseFrame subject="Setting up" monogram="G" tint="from-brand-400 to-brand-600" tab="Timetable">
        {inView ? <TimetableScene /> : null}
      </ShowcaseFrame>
    </div>
  );
}
