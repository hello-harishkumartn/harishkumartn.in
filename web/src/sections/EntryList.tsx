import type { Entry } from '../content';
import { PlaceholderBadge } from '../components/Placeholder';
import { Card } from '../components/Section';

/** Shared card grid for Ideas and Markets learnings. */
export function EntryList({ entries }: { entries: Entry[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {entries.map((e, i) => (
        <Card key={e.title} className={e.placeholder ? 'border-dashed' : undefined}>
          <div className="flex items-start justify-between gap-3">
            <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
            <PlaceholderBadge show={!!e.placeholder} />
          </div>
          <h3 className="mt-6 font-display text-xl font-semibold leading-snug tracking-tight">
            {e.link ? (
              <a href={e.link} className="cursor-pointer hover:text-primary">
                {e.title}
              </a>
            ) : (
              e.title
            )}
          </h3>
          {e.date && <time className="mt-1 block text-sm text-muted-foreground">{e.date}</time>}
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{e.body}</p>
          {e.tags && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {e.tags.map((t) => (
                <li key={t} className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[11px] text-foreground/70">
                  #{t}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
