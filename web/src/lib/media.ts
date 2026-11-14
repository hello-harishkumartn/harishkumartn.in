/** Resolve a path under /public so it works with any deploy base path. */
export function media(path: string): string {
  if (/^(https?:)?\/\//.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
