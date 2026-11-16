import { m } from 'framer-motion';
import { ArrowUpRight, Mail } from 'lucide-react';
import { contact, hero, site, type ContactIcon } from '../content';
import { revealItem, Section } from '../components/Section';
import { brandIcons } from '../lib/brandIcons';

/** Mail uses lucide; the socials use their official marks (lucide v1 ships no brand logos). */
function ContactGlyph({ name, className }: { name: ContactIcon; className?: string }) {
  if (name === 'mail') return <Mail className={className} aria-hidden />;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden focusable="false">
      <path d={brandIcons[name].path} />
    </svg>
  );
}

export function Contact() {
  return (
    <Section id="contact" kicker={contact.kicker} title={contact.title} intro={contact.intro}>
      <div className="grid gap-4 md:grid-cols-2">
        {contact.links.map((l) => {
          const ext = l.href.startsWith('http');
          return (
            <m.a
              key={l.label}
              variants={revealItem}
              href={l.href}
              target={ext ? '_blank' : undefined}
              rel={ext ? 'noreferrer' : undefined}
              aria-label={ext ? `${l.label}: ${l.display} (opens in a new tab)` : undefined}
              className={`${l.icon === 'mail' ? 'md:col-span-2 ' : ''}group flex min-w-0 cursor-pointer items-center justify-between gap-4 rounded-3xl border border-white/[0.08] bg-card p-6 transition-colors duration-200 hover:border-primary/40 md:p-8`}
            >
              <span className="flex min-w-0 items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <ContactGlyph name={l.icon} className={l.icon === 'mail' ? 'size-5' : 'size-[18px]'} />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{l.label}</span>
                  <span className="block font-display [overflow-wrap:anywhere] md:truncate text-lg font-medium md:text-xl">{l.display}</span>
                </span>
              </span>
              <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
            </m.a>
          );
        })}
      </div>
      <footer className="mt-24 flex flex-col justify-between gap-2 border-t border-white/[0.08] pt-8 text-sm text-muted-foreground md:flex-row">
        <span>
          © {new Date().getFullYear()} {site.name} · {site.domain}
        </span>
        <span>Made with a {hero.place} full of things I love.</span>
      </footer>
    </Section>
  );
}
