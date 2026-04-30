import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const updated = await prisma.course.update({
      where: { id: params.id },
      data: {
        ...(body?.slug !== undefined && { slug: body.slug }),
        ...(body?.title !== undefined && { title: body.title }),
        ...(body?.description !== undefined && { description: body.description }),
        ...(body?.mode !== undefined && { mode: body.mode }),
        ...(body?.price !== undefined && { price: Number(body.price) }),
        ...(body?.currency !== undefined && { currency: body.currency }),
        ...(body?.isPublished !== undefined && { isPublished: Boolean(body.isPublished) }),
        ...(body?.whatsappLink !== undefined && { whatsappLink: body.whatsappLink }),
      } as any,
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
    await prisma.course.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

