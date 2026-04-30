import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { refreshTokenExpiresAt, signAccessToken, signRefreshToken } from '@/server/jwt-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    let body: { refreshToken?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : '';
    if (!refreshToken) return NextResponse.json({ message: 'Invalid or expired refresh token' }, { status: 401 });

    const stored = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, expiresAt: { gt: new Date() } },
    });
    if (!stored) return NextResponse.json({ message: 'Invalid or expired refresh token' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return NextResponse.json({ message: 'User inactive' }, { status: 401 });
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const [accessToken, newRefresh] = await Promise.all([
      signAccessToken(user.id, user.email, user.role),
      signRefreshToken(user.id, user.email, user.role),
    ]);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: newRefresh, expiresAt: refreshTokenExpiresAt() },
    });

    return NextResponse.json({ accessToken, refreshToken: newRefresh });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'SERVER_MISCONFIGURED') {
      return NextResponse.json({ message: 'Server misconfigured' }, { status: 500 });
    }
    console.error(e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
