import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const slug = String(body?.slug ?? '');
    const title = String(body?.title ?? '');
    if (!slug || !title) return NextResponse.json({ message: 'slug and title required' }, { status: 400 });

    const created = await prisma.course.create({
      data: {
        slug,
        title,
        description: body?.description ?? null,
        mode: body?.mode ?? 'SELF_PACED',
        price: Number(body?.price ?? 0),
        currency: body?.currency ?? 'NGN',
        isPublished: Boolean(body?.isPublished ?? false),
        whatsappLink: body?.whatsappLink ?? null,
      } as any,
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

