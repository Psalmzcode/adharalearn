import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let refreshToken: string | undefined;
  try {
    const body = await req.json();
    refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : undefined;
  } catch {
    refreshToken = undefined;
  }

  try {
    const user = await requireUser(req);
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id, token: refreshToken } });
    } else {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    }

    return NextResponse.json({ message: 'Logged out' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHORIZED') {
      if (refreshToken) {
        await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
      }
      // Keep logout idempotent for expired access tokens.
      return NextResponse.json({ message: 'Logged out' });
    }
    console.error(e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
