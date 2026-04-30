import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { verifyPassword } from '@/server/password';
import { refreshTokenExpiresAt, signAccessToken, signRefreshToken } from '@/server/jwt-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function envFlag(name: string) {
  const v = process.env[name];
  return v === '1' || v === 'true' || v === 'yes';
}

function bad(msg: string, status = 401) {
  return NextResponse.json({ message: msg }, { status });
}

export async function POST(req: Request) {
  try {
    let body: { email?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return bad('Invalid JSON', 400);
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) return bad('Invalid credentials');

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        emailVerified: true,
      },
    });

    if (!user) return bad('Invalid credentials');
    if (!user.isActive) return bad('Account is suspended');

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) return bad('Invalid credentials');

    // Dev-only escape hatch: allow login even if not verified.
    // This is useful for seeded/test accounts with dummy emails.
    if (!user.emailVerified && !(process.env.NODE_ENV === 'development' && envFlag('LEARN_DEV_SKIP_EMAIL_VERIFICATION'))) {
      return bad('Please verify your email before logging in', 403);
    }

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(user.id, user.email, user.role),
      signRefreshToken(user.id, user.email, user.role),
    ]);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: refreshTokenExpiresAt() },
    });

    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser, accessToken, refreshToken });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'SERVER_MISCONFIGURED') return NextResponse.json({ message: 'Server misconfigured' }, { status: 500 });
    console.error(e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
