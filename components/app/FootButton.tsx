"use client";

import type { Item } from "@/components/app/Sidebar";

export function FootButton({
  item,
  active,
  danger = false,
  onClick,
}: {
  item: Item;
  active: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={item.label}
      title={item.label}
      className={`grid h-10 w-10 place-items-center rounded-xl transition ${
        active
          ? "bg-brand-50 text-brand-700"
          : danger
            ? "text-slate-500 hover:bg-red-50 hover:text-red-600"
            : "text-slate-500 hover:bg-slate-100 hover:text-ink"
      }`}
    >
      {item.icon("h-5 w-5")}
    </button>
  );
}
