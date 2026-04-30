import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { moduleId: string } }) {
  try {
    await requireUser(req);
    const qs = await prisma.courseModuleQuizQuestion.findMany({
      where: { moduleId: params.moduleId },
      select: { id: true, order: true, prompt: true, optionA: true, optionB: true, optionC: true, optionD: true },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(qs);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

