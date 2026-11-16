import { brandIcons, type BrandKey } from '../lib/brandIcons';

/** An official platform mark (Simple Icons, CC0) drawn in the current text colour. */
export function BrandIcon({ name, className }: { name: BrandKey; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden focusable="false">
      <path d={brandIcons[name].path} />
    </svg>
  );
}
