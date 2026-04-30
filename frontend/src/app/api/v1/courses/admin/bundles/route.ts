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
    const name = String(body?.name ?? '');
    const moduleIds = Array.isArray(body?.moduleIds) ? body.moduleIds.map(String) : [];
    if (!courseId || !name || moduleIds.length === 0) {
      return NextResponse.json({ message: 'courseId, name, moduleIds required' }, { status: 400 });
    }

    const created = await prisma.courseBundle.create({
      data: {
        courseId,
        name,
        description: body?.description ?? null,
        price: Number(body?.price ?? 0),
        currency: body?.currency ?? 'NGN',
        isPublished: Boolean(body?.isPublished ?? false),
        items: { create: moduleIds.map((moduleId: string) => ({ moduleId })) },
      } as any,
      include: { items: { select: { moduleId: true } } },
    });

    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
