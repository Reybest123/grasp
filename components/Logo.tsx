import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-bold ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
        {/* a hand "grasping" a spark of understanding */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3l1.6 3.9L17.5 8l-3.9 1.6L12 13.5 10.4 9.6 6.5 8l3.9-1.1L12 3z"
            fill="white"
          />
          <circle cx="18" cy="17" r="2.2" fill="#ffb454" />
        </svg>
      </span>
      <span className="text-lg tracking-tight text-ink">Grasp</span>
    </Link>
  );
}
