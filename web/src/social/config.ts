import { social } from '../content';

/** The social hub API base URL. VITE_SOCIAL_API (for example a local `wrangler dev`) wins over content.ts. */
export const SOCIAL_API: string = import.meta.env.VITE_SOCIAL_API || social.api;

/** The /social/ page, respecting BASE_PATH builds. */
export const SOCIAL_PAGE = `${import.meta.env.BASE_URL}social/`;
