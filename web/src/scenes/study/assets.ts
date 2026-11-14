/** URL of a file under public/assets, respecting the deploy base path. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;
