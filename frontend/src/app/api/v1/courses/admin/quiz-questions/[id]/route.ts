import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const updated = await prisma.courseModuleQuizQuestion.update({
      where: { id: params.id },
      data: {
        ...(body?.order !== undefined && { order: Number(body.order) }),
        ...(body?.prompt !== undefined && { prompt: String(body.prompt) }),
        ...(body?.optionA !== undefined && { optionA: String(body.optionA) }),
        ...(body?.optionB !== undefined && { optionB: String(body.optionB) }),
        ...(body?.optionC !== undefined && { optionC: String(body.optionC) }),
        ...(body?.optionD !== undefined && { optionD: String(body.optionD) }),
        ...(body?.correctOption !== undefined && { correctOption: String(body.correctOption) }),
        ...(body?.explanation !== undefined && { explanation: body.explanation }),
      },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    await prisma.courseModuleQuizQuestion.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

