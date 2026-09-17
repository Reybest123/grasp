"use client";

// Grasp's dropdown, in place of the browser's <select>, whose native list looked
// nothing like the rest of the app. Pick-only: there is no text box, so a value
// can only ever be one of the options (class days and times, the parts of a
// date, a subject).
//
// The list is portalled to <body> and placed against the button, for the same
// reason as MoreMenu and the old date picker: the editor sheet and the dialogs
// are transformed, which would become the containing block for `position:
// fixed`, and scrolling panels would clip an absolutely positioned list.
//
// Keyboard follows the combobox pattern: focus stays on the button, arrows move
// the highlight (and open the list), Home/End jump, Enter or Space picks, a
// letter or digit jumps to the next option starting with it, Escape closes.
// Escape is stopped here so it does not also close the sheet or dialog.

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";

export type SelectOption = { value: string; label: string };

const GAP = 4;
const EDGE = 8;
const MAX_HEIGHT = 256;

export function Select({
  value,
  options,
  onChange,
  label,
  placeholder = "Select",
  scrollTo,
  className = "",
  minListWidth = 0,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** accessible name, since the button's text is only the current value */
  label: string;
  placeholder?: string;
  /** the option to bring into view when nothing is chosen yet (e.g. 9:00am) */
  scrollTo?: string;
  /** width and layout of the button */
  className?: string;
  /** lets the list run wider than a narrow button */
  minListWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  function openList() {
    setPos(null);
    const start =
      selectedIndex >= 0
        ? selectedIndex
        : Math.max(0, options.findIndex((o) => o.value === scrollTo));
    setActive(start);
    setOpen(true);
  }

  function close(refocus = false) {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }

  function pick(i: number) {
    const o = options[i];
    if (o) onChange(o.value);
    close(true);
  }

  // Place against the button, flipping above when it would run off the bottom,
  // then bring the chosen option into the middle of the list.
  useLayoutEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    const list = listRef.current;
    if (!button || !list) return;
    const r = button.getBoundingClientRect();
    const width = Math.max(r.width, minListWidth);
    const h = list.offsetHeight;
    let top = r.bottom + GAP;
    if (top + h > window.innerHeight - EDGE && r.top - GAP - h > EDGE) top = r.top - GAP - h;
    const left = Math.max(EDGE, Math.min(r.left, window.innerWidth - width - EDGE));
    setPos({ top, left, width });
    const el = list.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (el) list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2;
    // Only on opening: after that, the highlight scrolls itself into view below.
  }, [open, minListWidth]);

  useEffect(() => {
    if (!open) return;
    // By hand rather than scrollIntoView, which can scroll the page as well.
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!list || !el) return;
    if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop - 4;
    else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight + 4;
  }, [active, open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (listRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScroll(e: Event) {
      // Scrolling the list itself is how you reach the options.
      if (listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    const onResize = () => setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(last, a + 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        return;
      case "Home":
        e.preventDefault();
        setActive(0);
        return;
      case "End":
        e.preventDefault();
        setActive(last);
        return;
      case "PageDown":
        e.preventDefault();
        setActive((a) => Math.min(last, a + 8));
        return;
      case "PageUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 8));
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        pick(active);
        return;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        close(true);
        return;
      case "Tab":
        setOpen(false);
        return;
    }
    if (e.key.length === 1 && /\S/.test(e.key)) {
      const ch = e.key.toLowerCase();
      for (let step = 1; step <= options.length; step++) {
        const i = (active + step) % options.length;
        if (options[i].label.toLowerCase().startsWith(ch)) {
          setActive(i);
          break;
        }
      }
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={`flex items-center justify-between gap-1.5 rounded-lg border bg-white py-2 pl-3 pr-2 text-left text-sm outline-none transition hover:border-slate-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-100 ${
          open ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-300"
        } ${className}`}
      >
        <span className={`truncate ${selected ? "text-ink" : "text-slate-500"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            // Clicks inside must not take focus off the button, or the keyboard
            // handling above would stop receiving keys.
            onMouseDown={(e) => e.preventDefault()}
            style={{
              position: "fixed",
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              width: pos?.width,
              maxHeight: MAX_HEIGHT,
              // Hidden for the frame before it has been measured, or it would
              // be seen at the wrong place first and jump.
              opacity: pos ? 1 : 0,
            }}
            className="z-[80] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1 shadow-lift [animation:popIn_120ms_ease-out]"
          >
            {options.map((o, i) => {
              const isSelected = i === selectedIndex;
              return (
                <div
                  key={o.value}
                  id={`${id}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => pick(i)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "font-semibold text-brand-700"
                      : "text-slate-700"
                  } ${i === active ? (isSelected ? "bg-brand-100/70" : "bg-slate-100") : isSelected ? "bg-brand-50" : ""}`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && <CheckIcon className="h-4 w-4 shrink-0 text-brand-600" />}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
