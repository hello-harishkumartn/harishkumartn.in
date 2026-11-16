import { contact } from '../content';
import type { BrandKey } from '../lib/brandIcons';
import { BrandIcon } from './BrandIcon';

/** The four profiles from the Contact section, as compact chips. Shown on the page and when the feed is down. */
export function ProfileLinks() {
  const profiles = contact.links.filter((l): l is typeof l & { icon: BrandKey } => l.icon !== 'mail');
  return (
    <ul className="flex flex-wrap gap-2.5">
      {profiles.map((l) => (
        <li key={l.icon}>
          <a
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm transition-colors duration-200 hover:border-primary/40 hover:text-primary"
          >
            <BrandIcon name={l.icon} className="size-4 text-primary" />
            {l.label}
            <span className="sr-only"> profile (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
