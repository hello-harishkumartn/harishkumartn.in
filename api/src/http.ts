export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  h.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers: h });
}

export const errorResponse = (status: number, message: string) => json({ error: message }, status, { 'Cache-Control': 'no-store' });

/** The request's Origin if it is on the allow list (ALLOWED_ORIGINS, comma separated), else null. */
export function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

/** Adds CORS headers for allowed origins and always marks the response as varying on Origin. */
export function withCors(response: Response, origin: string | null): Response {
  const res = new Response(response.body, response);
  res.headers.append('Vary', 'Origin');
  if (origin) res.headers.set('Access-Control-Allow-Origin', origin);
  return res;
}

/** Reads a JSON object body or throws a 400. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, 'Body must be JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Body must be a JSON object.');
  return body as Record<string, unknown>;
}
