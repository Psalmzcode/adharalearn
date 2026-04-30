import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const courseId = String(body?.courseId ?? '');
    const order = Number(body?.order ?? 0);
    const title = String(body?.title ?? '');
    if (!courseId || !order || !title) return NextResponse.json({ message: 'courseId, order, title required' }, { status: 400 });

    const isFree = Boolean(body?.isFree ?? false);
    const created = await prisma.courseModule.create({
      data: {
        courseId,
        order,
        title,
        description: body?.description ?? null,
        isFree,
        price: isFree ? null : (body?.price !== undefined ? Number(body.price) : null),
        currency: body?.currency ?? 'NGN',
        isPublished: Boolean(body?.isPublished ?? false),
        notesMd: body?.notesMd ?? null,
      } as any,
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

