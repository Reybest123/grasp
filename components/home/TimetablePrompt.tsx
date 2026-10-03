"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { NewSubject } from "@/lib/subjectsStore";
import { TimetableDialog } from "@/components/onboarding/TimetableDialog";
import { timetableAvailable } from "@/lib/ai";

/**
 * The timetable read, offered once (lib/timetableRead.ts). The account decides
 * whether it is still on offer, and while it is the popup opens on every visit
 * to this page, so a refresh or leaving mid-setup does not lose it. Skipping or
 * a read that finds subjects ends the offer; both go on to the notebooks, and
 * there is no closing it without choosing one or the other.
 */
export function TimetablePrompt({ save }: { save: (subjects: NewSubject[]) => Promise<void> }) {
  const router = useRouter();
  const asked = useSearchParams().get("setup") === "timetable";
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    timetableAvailable().then((ok) => {
      if (cancelled) return;
      if (ok) setAvailable(true);
      // Only a real "no" drops the flag. Unanswered, it stays in the URL, so
      // a refresh asks again rather than losing the offer to a blip.
      else if (ok === false && asked) router.replace("/home", { scroll: false });
    });
    return () => {
      cancelled = true;
    };
  }, [asked, router]);

  return (
    <TimetableDialog
      open={available}
      save={save}
      onDone={() => router.replace("/workspace")}
    />
  );
}
