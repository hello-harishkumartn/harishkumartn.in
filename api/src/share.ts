/**
 * Picks the shared post link out of a Web Share Target request. Apps disagree on where they put it:
 * some use `url`, Instagram and LinkedIn put it inside `text`, a few use `title`. Returns the first
 * https link found in that order, without trailing punctuation, or null.
 *
 * This function is also inlined into the admin page with toString(), so it must stay self-contained.
 */
export function firstLink(params: { url: string | null; text: string | null; title: string | null }): string | null {
  for (const field of [params.url, params.text, params.title]) {
    const match = field ? /https:\/\/[^\s<>"']+/.exec(field) : null;
    if (match) return match[0].replace(/[.,;:!?)\]]+$/, '');
  }
  return null;
}

/** Web app manifest that makes /admin installable and adds it to the Android share sheet. */
export const MANIFEST = {
  name: 'Harish site: social hub',
  short_name: 'Harish site',
  description: 'Share a LinkedIn, X or Instagram post to harishkumartn.in.',
  start_url: '/admin',
  scope: '/admin',
  display: 'standalone',
  background_color: '#0d0b09',
  theme_color: '#0d0b09',
  icons: [
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
  ],
  share_target: { action: '/admin/share', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } },
};

/** The app icon: a shuttlecock on the site's dark background, safe inside the maskable zone. */
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#0d0b09"/>
<path d="M186 120h140l-38 168h-64z" fill="#f5efe6"/>
<path d="M214 120l18 168M256 116v172M298 120l-18 168M196 178h120M206 232h100" stroke="#0d0b09" stroke-width="10" fill="none"/>
<circle cx="256" cy="336" r="54" fill="#fb923c"/>
</svg>
`;
