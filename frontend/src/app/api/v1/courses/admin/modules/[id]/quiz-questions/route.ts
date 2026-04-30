import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const questions = await prisma.courseModuleQuizQuestion.findMany({
      where: { moduleId: params.id },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(questions);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const created = await prisma.courseModuleQuizQuestion.create({
      data: {
        moduleId: params.id,
        order: Number(body?.order ?? 1),
        prompt: String(body?.prompt ?? ''),
        optionA: String(body?.optionA ?? ''),
        optionB: String(body?.optionB ?? ''),
        optionC: String(body?.optionC ?? ''),
        optionD: String(body?.optionD ?? ''),
        correctOption: String(body?.correctOption ?? 'A'),
        explanation: body?.explanation ?? null,
      },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

