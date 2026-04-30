import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';
import { bumpLearnStreak } from '@/server/learn-streak';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { lessonId: string } }) {
  try {
    const user = await requireUser(req);
    const rec = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: params.lessonId } },
      select: { positionSeconds: true, updatedAt: true },
    });
    return NextResponse.json(rec ?? { positionSeconds: 0 });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { lessonId: string } }) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const positionSeconds = Math.max(0, Math.floor(Number(body?.positionSeconds ?? 0)));
    const saved = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId: params.lessonId } },
      create: { userId: user.id, lessonId: params.lessonId, positionSeconds },
      update: { positionSeconds },
      select: { positionSeconds: true, updatedAt: true },
    });

    await bumpLearnStreak(user.id);
    return NextResponse.json(saved);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

