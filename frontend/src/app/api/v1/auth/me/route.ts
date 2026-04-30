import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const u = await requireUser(req);
    const user = await prisma.user.findUnique({
      where: { id: u.id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (msg === 'SERVER_MISCONFIGURED') return NextResponse.json({ message: 'Server misconfigured' }, { status: 500 });
    console.error(e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
