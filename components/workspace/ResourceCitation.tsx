import type { Citation } from "@/lib/resources";
import { BankIcon } from "@/components/icons";

/**
 * "Grasp used your Assessment criteria" — shown wherever a resource actually
 * shaped what the AI produced (§3.4).
 *
 * The AI names the ids it drew on and the route validates them against what it
 * was actually sent (lib/resources.ts), so this can never name a document that
 * was not in the request. It renders nothing when nothing was used, which is
 * the honest answer most of the time — a citation on every reply would stop
 * meaning anything within a day.
 */
export function ResourceCitation({
  cited,
  label = "Grasp used",
  className = "",
}: {
  cited: Citation[] | undefined;
  label?: string;
  className?: string;
}) {
  if (!cited?.length) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl bg-brand-50/70 px-3 py-2 text-xs ${className}`}
    >
      <span className="inline-flex items-center gap-1.5 font-semibold text-brand-700">
        <BankIcon className="h-3.5 w-3.5" />
        {label}
      </span>
      {cited.map((c) => (
        <span
          key={c.id}
          title={c.name}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-medium text-slate-700 ring-1 ring-brand-100"
        >
          {c.kind}
          <span className="min-w-0 truncate font-normal text-slate-400">{c.name}</span>
        </span>
      ))}
    </div>
  );
}
