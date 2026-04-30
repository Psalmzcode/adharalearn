import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const updated = await prisma.lesson.update({
      where: { id: params.id },
      data: {
        ...(body?.order !== undefined && { order: Number(body.order) }),
        ...(body?.title !== undefined && { title: body.title }),
        ...(body?.description !== undefined && { description: body.description }),
        ...(body?.videoUrl !== undefined && { videoUrl: body.videoUrl }),
        ...(body?.notesUrl !== undefined && { notesUrl: body.notesUrl }),
        ...(body?.durationMins !== undefined && { durationMins: body.durationMins === null ? null : Number(body.durationMins) }),
        ...(body?.isPublished !== undefined && { isPublished: Boolean(body.isPublished) }),
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
    await prisma.lesson.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

