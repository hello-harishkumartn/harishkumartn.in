import { ArrowUpRight, Play } from 'lucide-react';
import { useState } from 'react';
import { BrandIcon } from './BrandIcon';
import { PLATFORM_NAMES, type FeedPost } from './feed';

const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Frame size per platform. Instagram and LinkedIn embeds are tall cards; YouTube is 16:9, Shorts 9:16. */
function frameClass(post: FeedPost): string {
  if (post.platform === 'youtube') return post.url.includes('/shorts/') ? 'mx-auto aspect-[9/16] max-h-[560px]' : 'aspect-video';
  if (post.platform === 'instagram') return 'h-[540px]';
  return 'h-[480px]';
}

/**
 * One post. Previews are click-to-load: nothing from Instagram, LinkedIn or YouTube is requested
 * until the visitor asks for it (YouTube's thumbnail comes from i.ytimg.com, its image CDN).
 */
export function PostCard({ post }: { post: FeedPost }) {
  const [open, setOpen] = useState(false);
  const name = PLATFORM_NAMES[post.platform];
  const label = post.title ?? `${name} post`;

  let preview = null;
  if (open && post.embedUrl) {
    const src = post.platform === 'youtube' ? `${post.embedUrl}?autoplay=1&rel=0` : post.embedUrl;
    preview = (
      <iframe
        src={src}
        title={label}
        className={`w-full rounded-2xl border-0 bg-white ${frameClass(post)}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  } else if (post.platform === 'youtube' && post.embedUrl) {
    preview = (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group/play relative block aspect-video w-full cursor-pointer overflow-hidden rounded-2xl bg-black"
      >
        {post.mediaUrl && <img src={post.mediaUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover opacity-90 transition-opacity duration-200 group-hover/play:opacity-100" />}
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 group-hover/play:scale-105">
            <Play className="size-6 translate-x-0.5 fill-current" aria-hidden />
          </span>
        </span>
        <span className="sr-only">Play {label}</span>
      </button>
    );
  } else if (post.embedUrl) {
    preview = (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm transition-colors duration-200 hover:border-primary/40 hover:text-primary"
      >
        Show post<span className="sr-only">: {label}, loads content from {name}</span>
      </button>
    );
  }

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-3xl border border-white/[0.08] bg-card p-5 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <BrandIcon name={post.platform} className="size-4 text-primary" />
          {name}
        </span>
        <time dateTime={post.publishedAt} className="font-mono text-[11px] text-muted-foreground">
          {date.format(new Date(post.publishedAt))}
        </time>
      </header>
      {post.title && <h3 className="text-pretty font-display text-lg font-semibold leading-snug">{post.title}</h3>}
      {post.text && <p className="line-clamp-5 whitespace-pre-line text-pretty text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{post.text}</p>}
      {preview}
      <a
        href={post.url}
        target="_blank"
        rel="noreferrer"
        className="mt-auto inline-flex min-h-11 w-fit cursor-pointer items-center gap-1 text-sm text-primary hover:underline"
      >
        View on {name} <ArrowUpRight className="size-3.5" aria-hidden />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </article>
  );
}

/** A placeholder card while the feed loads. */
export function PostCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4 rounded-3xl border border-white/[0.06] bg-card p-5 md:p-6">
      <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-full animate-pulse rounded bg-white/10" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
      <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
    </div>
  );
}
