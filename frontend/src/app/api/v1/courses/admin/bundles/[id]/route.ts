import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const moduleIds = Array.isArray(body?.moduleIds) ? body.moduleIds.map(String) : null;

    if (moduleIds) {
      await prisma.courseBundleItem.deleteMany({ where: { bundleId: params.id } });
    }

    const updated = await prisma.courseBundle.update({
      where: { id: params.id },
      data: {
        ...(body?.name !== undefined && { name: body.name }),
        ...(body?.description !== undefined && { description: body.description }),
        ...(body?.price !== undefined && { price: Number(body.price) }),
        ...(body?.currency !== undefined && { currency: body.currency }),
        ...(body?.isPublished !== undefined && { isPublished: Boolean(body.isPublished) }),
        ...(moduleIds ? { items: { create: moduleIds.map((moduleId: string) => ({ moduleId })) } } : {}),
      } as any,
      include: { items: { select: { moduleId: true } } },
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
    await prisma.courseBundle.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
