import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const moduleId = url.searchParams.get('moduleId');
    const templateId = url.searchParams.get('templateId');
    const db = prisma as any;

    const where: any = {};
    if (templateId) where.templateId = templateId;
    if (moduleId) where.moduleId = moduleId;

    const rows = await db.practicalSubmission.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: { select: { id: true, title: true, scope: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(rows);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

