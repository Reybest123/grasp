import type { ReactNode } from "react";
import { AlertIcon } from "@/components/icons";

/**
 * The amber panel the Record tab shows when a stopped recording produced no
 * notes: nothing heard, not enough to write up, or audio too unclear.
 */
export function RecordOutcome({
  title,
  children,
  className = "",
}: {
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid min-h-[240px] place-items-center rounded-2xl bg-amber-50 p-5 text-center ${className}`}
    >
      <div>
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-700">
          <AlertIcon className="h-5 w-5" />
        </span>
        <p className="mt-4 font-semibold text-amber-900">{title}</p>
        {children && <p className="mx-auto mt-1 max-w-sm text-sm text-amber-800">{children}</p>}
      </div>
    </div>
  );
}
