// Consistent inline SVG icon set (Lucide-style, 1.75 stroke).
// Replaces all emoji per the design system's no-emoji-icons rule.

type IconProps = { className?: string };

const base = (className?: string) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
});

export function NoteIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M14 4v5h5" />
      <path d="M8 13h7M8 17h5" />
    </svg>
  );
}

export function QuizIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M9.1 9a3 3 0 1 1 4 2.8c-.9.4-1.6 1.2-1.6 2.2v.3" />
      <path d="M12 18h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function BankIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 19V6a1 1 0 0 1 1-1h9l6 6v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M14 5v5h5" />
    </svg>
  );
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 15l.7 1.9L21.6 17.6 19.7 18.3 19 20.2 18.3 18.3 16.4 17.6 18.3 16.9 19 15z" />
    </svg>
  );
}

export function MicIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function BackIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function FileIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function ExamIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3 8l9-4 9 4-9 4-9-4z" />
      <path d="M7 10.2V15c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4.8" />
      <path d="M21 8v5" />
    </svg>
  );
}

export function EditIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="M14.5 6.5l3 3" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 4l9 16H3l9-16z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function BoldIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={2.25}>
      <path d="M7 5h6.5a3.5 3.5 0 0 1 0 7H7z" />
      <path d="M7 12h7.5a3.5 3.5 0 0 1 0 7H7z" />
    </svg>
  );
}

export function ItalicIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={2}>
      <path d="M18 5h-7M13 19H6M15 5L9 19" />
    </svg>
  );
}

export function UnderlineIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={2}>
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <path d="M5 20h14" />
    </svg>
  );
}

export function ChecklistIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3.5 6.5l2 2 3.5-3.5" />
      <path d="M3.5 17.5l2 2 3.5-3.5" />
      <path d="M13 7h8M13 18h8" />
    </svg>
  );
}

/** Letter "A" — rendered at different sizes for the text-size control. */
export function LetterIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={2}>
      <path d="M4 20L12 4l8 16" />
      <path d="M7.5 14.5h9" />
    </svg>
  );
}

export function BulletListIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Radical sign — the equation editor's mark. */
export function EquationIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3 12.5l2 0 2.4 6.5L12 4.5h9" />
    </svg>
  );
}

export function ImageIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5-9 9" />
    </svg>
  );
}
