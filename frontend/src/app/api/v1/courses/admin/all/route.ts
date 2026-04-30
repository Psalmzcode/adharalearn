import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const courses = await prisma.course.findMany({
      include: { _count: { select: { modules: true, lessons: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(courses);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const detail = process.env.NODE_ENV === 'development' ? String(e?.message ?? e) : undefined;
    return NextResponse.json({ message: 'Server error', detail }, { status: 500 });
  }
}

