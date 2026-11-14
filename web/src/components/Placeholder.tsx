/** Visible marker for any content still flagged `placeholder: true` in content.ts. */
export function PlaceholderBadge({ show = true }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border border-dashed border-amber-300/40 bg-amber-300/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-200"
      title="Placeholder: replace in src/content.ts"
    >
      Placeholder
    </span>
  );
}

interface ArtProps {
  palette: [string, string];
  label?: string;
  seed?: number;
  variant?: 'landscape' | 'portrait';
}

/** Generated SVG art used instead of stock photos until real media is added. */
export function PlaceholderArt({ palette, label, seed = 0, variant = 'landscape' }: ArtProps) {
  const [a, b] = palette;
  const id = `g${seed}${variant}`;
  const r = (n: number) => ((Math.sin(seed * 9.13 + n * 3.7) + 1) / 2) * 60;
  return (
    <svg
      className="placeholder-art"
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label ?? 'Placeholder image'}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#${id})`} />
      {variant === 'landscape' ? (
        <>
          <circle cx={290 - r(1)} cy={70 + r(2) / 3} r="28" fill="#fff" opacity="0.55" />
          <path
            d={`M0 ${200 - r(3) / 2} L${90 + r(4)} ${110 + r(5) / 2} L${190 + r(6)} ${190 - r(7) / 3} L${290 + r(8) / 2} ${120 + r(1) / 2} L400 ${185 - r(2) / 3} L400 260 L0 260Z`}
            fill="#fff"
            opacity="0.25"
          />
          <path
            d={`M0 ${230 - r(5) / 3} L${120 + r(2)} ${170 + r(3) / 3} L${260 + r(4) / 2} ${225 - r(6) / 4} L400 ${180 + r(7) / 3} L400 260 L0 260Z`}
            fill="#fff"
            opacity="0.35"
          />
        </>
      ) : (
        <>
          <circle cx="200" cy="105" r="48" fill="#fff" opacity="0.45" />
          <path d="M110 260 C120 185 280 185 290 260Z" fill="#fff" opacity="0.45" />
        </>
      )}
    </svg>
  );
}
