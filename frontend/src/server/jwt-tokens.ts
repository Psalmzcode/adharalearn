import { SignJWT } from 'jose';

const enc = (s: string) => new TextEncoder().encode(s);

export async function signAccessToken(userId: string, email: string, role: string): Promise<string> {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('SERVER_MISCONFIGURED');
  const exp = process.env.JWT_ACCESS_EXPIRES ?? '15m';
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(enc(secret));
}

export async function signRefreshToken(userId: string, email: string, role: string): Promise<string> {
  const secret = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('SERVER_MISCONFIGURED');
  const exp = process.env.JWT_REFRESH_EXPIRES ?? '7d';
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(enc(secret));
}

export function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}
