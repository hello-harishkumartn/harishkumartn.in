/** Synthetic YouTube channel feeds shaped like the real one (fetched 2026-11-16). */
export const CHANNEL = 'UC1LVB92eIBvXml8xUFmm0HQ';

export interface FakeVideo {
  id: string;
  title: string;
  published: string;
  description?: string;
  shorts?: boolean;
}

export function youtubeFeed(videos: FakeVideo[], channel = CHANNEL.slice(2)): string {
  const entries = videos.map(
    (v) => `
 <entry>
  <id>yt:video:${v.id}</id>
  <yt:videoId>${v.id}</yt:videoId>
  <yt:channelId>${channel}</yt:channelId>
  <title>${v.title}</title>
  <link rel="alternate" href="https://www.youtube.com/${v.shorts ? `shorts/${v.id}` : `watch?v=${v.id}`}"/>
  <author>
   <name>Harish Kumar T N</name>
   <uri>https://www.youtube.com/channel/${CHANNEL}</uri>
  </author>
  <published>${v.published}</published>
  <updated>${v.published}</updated>
  <media:group>
   <media:title>${v.title}</media:title>
   <media:content url="https://www.youtube.com/v/${v.id}?version=3" type="application/x-shockwave-flash" width="640" height="390"/>
   <media:thumbnail url="https://i1.ytimg.com/vi/${v.id}/hqdefault.jpg" width="480" height="360"/>
   <media:description>${v.description ?? ''}</media:description>
   <media:community>
    <media:starRating count="3" average="5.00" min="1" max="5"/>
    <media:statistics views="42"/>
   </media:community>
  </media:group>
 </entry>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}"/>
 <id>yt:channel:${channel}</id>
 <yt:channelId>${channel}</yt:channelId>
 <title>Harish Kumar T N</title>
 <link rel="alternate" href="https://www.youtube.com/channel/${CHANNEL}"/>
 <author>
  <name>Harish Kumar T N</name>
  <uri>https://www.youtube.com/channel/${CHANNEL}</uri>
 </author>
 <published>2026-10-30T11:36:07+00:00</published>${entries.join('')}
</feed>
`;
}

/** A fetch stand-in that answers every request with the given body and status, and records the URLs. */
export function fakeFetch(body: string | (() => string), status = 200) {
  const calls: string[] = [];
  const fn = (async (input: RequestInfo | URL) => {
    calls.push(String(input instanceof Request ? input.url : input));
    return new Response(typeof body === 'function' ? body() : body, { status, headers: { 'Content-Type': 'text/xml' } });
  }) as typeof fetch;
  return Object.assign(fn, { calls });
}
