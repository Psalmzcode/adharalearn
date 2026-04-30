import { jwtVerify } from 'jose';

export type AuthUser = { id: string; email?: string; role?: string };

function getBearerToken(req: Request): string | null {
  const h = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function requireUser(req: Request): Promise<AuthUser> {
  const token = getBearerToken(req);
  if (!token) throw new Error('UNAUTHORIZED');
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('SERVER_MISCONFIGURED');

  let payload: Awaited<ReturnType<typeof jwtVerify>>['payload'];
  try {
    ({ payload } = await jwtVerify(token, new TextEncoder().encode(secret)));
  } catch {
    throw new Error('UNAUTHORIZED');
  }
  const sub = payload.sub;
  if (!sub || typeof sub !== 'string') throw new Error('UNAUTHORIZED');
  return {
    id: sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    role: typeof payload.role === 'string' ? payload.role : undefined,
  };
}

export async function requireAdmin(req: Request): Promise<AuthUser> {
  const u = await requireUser(req);
  if (u.role !== 'ADMIN') throw new Error('FORBIDDEN');
  return u;
}

