// A placeholder block shown while a page waits for its data. A span, so it can
// stand in for text inside a heading or paragraph as well as for a whole card.

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`block animate-pulse rounded-lg bg-slate-200/70 motion-reduce:animate-none ${className}`}
    />
  );
}
