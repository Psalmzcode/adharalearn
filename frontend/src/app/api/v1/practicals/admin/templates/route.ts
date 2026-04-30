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
    const courseId = url.searchParams.get('courseId');
    const db = prisma as any;

    const where: any = {};
    if (moduleId) where.moduleId = moduleId;
    if (courseId) where.courseId = courseId;

    const items = await db.practicalTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const db = prisma as any;

    const courseId = String(body?.courseId ?? '');
    const scope = String(body?.scope ?? 'MODULE');
    const title = String(body?.title ?? '');
    const briefMd = String(body?.briefMd ?? '');
    if (!courseId || !scope || !title || !briefMd) {
      return NextResponse.json({ message: 'courseId, scope, title, briefMd required' }, { status: 400 });
    }
    if (scope === 'MODULE' && !body?.moduleId) {
      return NextResponse.json({ message: 'moduleId required for MODULE scope' }, { status: 400 });
    }

    const created = await db.practicalTemplate.create({
      data: {
        courseId,
        scope,
        moduleId: body?.moduleId ?? null,
        bundleId: body?.bundleId ?? null,
        title,
        briefMd,
        instructionsMd: body?.instructionsMd ?? null,
        requiredForCompletion: body?.requiredForCompletion !== false,
        isPublished: Boolean(body?.isPublished ?? false),
      },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

