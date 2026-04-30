import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const bundles = await prisma.courseBundle.findMany({
      where: { courseId: params.id },
      include: { items: { select: { moduleId: true } }, _count: { select: { purchases: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(bundles);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
