import { ArrowUpRight, Play } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { PLATFORM_NAMES, relativeDate, type FeedPost } from './feed';

const fullDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/** Embed frame size per platform. Instagram and LinkedIn embeds are tall cards; YouTube is 16:9, Shorts 9:16. */
function frameClass(post: FeedPost): string {
  if (post.platform === 'youtube') return post.url.includes('/shorts/') ? 'mx-auto aspect-[9/16] max-h-[560px]' : 'aspect-video';
  if (post.platform === 'instagram') return 'h-[540px]';
  return 'h-[480px]';
}

/** Cover image shape: Instagram is portrait, everything else is 16:9. */
const coverClass = (post: FeedPost) => (post.platform === 'instagram' ? 'aspect-[4/5] max-h-[520px]' : 'aspect-video');

/**
 * One post inside its platform panel (the panel names the platform and sets --brand).
 * Cover images come from the social Worker (copied when the post was shared) or YouTube's image CDN.
 * Embeds stay click-to-load: nothing from Instagram, LinkedIn or YouTube's player loads until a tap.
 */
export function PostCard({ post, index = 0 }: { post: FeedPost; index?: number }) {
  const [open, setOpen] = useState(false);
  const name = PLATFORM_NAMES[post.platform];
  const label = post.title ?? post.caption?.split('\n')[0] ?? `${name} post`;
  const isVideo = post.kind === 'video';

  let media = null;
  if (open && post.embedUrl) {
    const src = post.platform === 'youtube' ? `${post.embedUrl}?autoplay=1&rel=0` : post.embedUrl;
    media = (
      <div className="p-3 pb-0">
        <iframe
          src={src}
          title={label}
          className={`w-full rounded-2xl border-0 bg-white ${frameClass(post)}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  } else if (post.mediaUrl) {
    const cover = (
      <>
        <img
          src={post.mediaUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.03]"
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
        {isVideo && (
          <span aria-hidden className="absolute inset-0 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-white/90 text-black shadow-xl transition-transform duration-300 group-hover/card:scale-110">
              <Play className="size-6 translate-x-0.5 fill-current" />
            </span>
          </span>
        )}
      </>
    );
    const frame = `relative block w-full overflow-hidden bg-black ${coverClass(post)}`;
    media = post.embedUrl ? (
      <button type="button" onClick={() => setOpen(true)} className={`${frame} cursor-pointer`}>
        {cover}
        <span className="sr-only">{isVideo ? 'Play' : 'Open'} {label} here (loads content from {name})</span>
      </button>
    ) : (
      <a href={post.url} target="_blank" rel="noreferrer" className={`${frame} cursor-pointer`}>
        {cover}
        <span className="sr-only">{label} on {name} (opens in a new tab)</span>
      </a>
    );
  }

  // Paragraph breaks become spaces inside the card, so the 4-line clamp shows 4 lines of words, not blank lines.
  const text = post.caption ? post.caption.replace(/\s*\n+\s*/g, ' ') : null;
  return (
    <article
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` } as CSSProperties}
      className="feed-in group/card flex min-w-0 flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-card transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--brand)_45%,transparent)] hover:shadow-[0_24px_60px_-32px_var(--brand)]"
    >
      {media}
      <div className="flex flex-1 flex-col gap-3 p-5 md:p-6">
        <time dateTime={post.publishedAt} title={fullDate.format(new Date(post.publishedAt))} className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {relativeDate(post.publishedAt)}
        </time>
        {post.text && (
          <p className="whitespace-pre-line border-l-2 border-primary pl-3 text-pretty text-base font-medium leading-relaxed text-foreground [overflow-wrap:anywhere]">
            {post.text}
          </p>
        )}
        {post.title && <h3 className="text-pretty font-display text-lg font-semibold leading-snug">{post.title}</h3>}
        {text && <p className="line-clamp-4 text-pretty text-[15px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{text}</p>}
        {!post.mediaUrl && post.embedUrl && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm transition-colors duration-200 hover:border-primary/40 hover:text-primary"
          >
            Show post<span className="sr-only">: {label}, loads content from {name}</span>
          </button>
        )}
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="mt-auto inline-flex min-h-11 w-fit cursor-pointer items-center gap-1 text-sm text-primary hover:underline"
        >
          View on {name} <ArrowUpRight className="size-3.5" aria-hidden />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </article>
  );
}

/** A placeholder card while the feed loads. */
export function PostCardSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-3xl border border-white/[0.06] bg-card">
      <div className="aspect-video animate-pulse bg-white/[0.06]" />
      <div className="flex flex-col gap-3 p-5 md:p-6">
        <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
}
