import { Play } from 'lucide-react';
import { badminton, type Video } from '../content';
import { PlaceholderBadge } from '../components/Placeholder';
import { Card, Section } from '../components/Section';
import { media } from '../lib/media';

export function Badminton() {
  return (
    <Section id="badminton" kicker={badminton.kicker} title={badminton.title} intro={badminton.intro}>
      <div className="grid gap-5 md:grid-cols-3">
        {badminton.videos.map((v, i) => (
          <Card key={i} className="p-3 md:p-3">
            <VideoSlot video={v} />
            <div className="px-3 pb-3 pt-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{v.title}</h3>
                <PlaceholderBadge show={!!v.placeholder} />
              </div>
              <p className="mt-2 text-base text-muted-foreground">{v.caption}</p>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function VideoSlot({ video }: { video: Video }) {
  const frame = 'relative aspect-video overflow-hidden rounded-2xl bg-black';
  if (video.youtubeId) {
    return (
      <div className={frame}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          title={video.title}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }
  if (video.mp4) {
    return (
      <div className={frame}>
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={media(video.mp4)}
          poster={video.poster ? media(video.poster) : undefined}
          controls
          preload="metadata"
          playsInline
        />
      </div>
    );
  }
  return (
    <div
      className={`${frame} grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#3b2414,#0f0c0a_70%)]`}
      aria-label="Video placeholder"
    >
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <span className="grid size-12 place-items-center rounded-full border border-white/15 bg-white/5 transition-transform duration-300 group-hover:scale-110">
          <Play className="size-5 translate-x-px text-foreground" aria-hidden />
        </span>
        Video coming soon
      </div>
    </div>
  );
}
