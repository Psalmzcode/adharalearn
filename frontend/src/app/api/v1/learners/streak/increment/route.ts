import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  try {
    const u = await requireUser(req);
    const row = await prisma.learnerProfile.update({
      where: { userId: u.id },
      data: { streak: { increment: 1 }, lastActive: new Date() },
    });
    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2025') {
      return NextResponse.json({ message: 'Learner profile not found' }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
