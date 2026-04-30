import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const moduleId = String(body?.moduleId ?? '');
    let order = Number(body?.order ?? 0);
    const title = String(body?.title ?? '');
    if (!moduleId || !title) return NextResponse.json({ message: 'moduleId and title required' }, { status: 400 });

    if (!order || order < 1) {
      const agg = await prisma.lesson.aggregate({ where: { moduleId }, _max: { order: true } });
      order = Number(agg?._max?.order ?? 0) + 1;
    }

    const created = await prisma.lesson.create({
      data: {
        moduleId,
        order,
        title,
        description: body?.description ?? null,
        videoUrl: body?.videoUrl ?? null,
        notesUrl: body?.notesUrl ?? null,
        durationMins: body?.durationMins !== undefined ? Number(body.durationMins) : null,
        isPublished: Boolean(body?.isPublished ?? false),
      } as any,
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { message: 'Lesson order already exists in this module. Choose a different order number.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

