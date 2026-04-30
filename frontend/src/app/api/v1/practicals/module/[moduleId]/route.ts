import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { moduleId: string } }) {
  try {
    const user = await requireUser(req);
    const moduleId = params.moduleId;
    const db = prisma as any;

    const template = await db.practicalTemplate.findFirst({
      where: { moduleId, scope: 'MODULE', isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!template) return NextResponse.json({ template: null, latestSubmission: null });

    const latestSubmission = await db.practicalSubmission.findFirst({
      where: { templateId: template.id, userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ template, latestSubmission });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { moduleId: string } }) {
  try {
    const user = await requireUser(req);
    const moduleId = params.moduleId;
    const body = await req.json().catch(() => ({}));
    const db = prisma as any;

    const template = await db.practicalTemplate.findFirst({
      where: { moduleId, scope: 'MODULE', isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!template) return NextResponse.json({ message: 'No practical template found for this module' }, { status: 404 });

    if (!body?.repoUrl && !body?.liveUrl && !body?.fileUrl && !body?.submissionText) {
      return NextResponse.json({ message: 'Provide at least one submission field' }, { status: 400 });
    }

    const created = await db.practicalSubmission.create({
      data: {
        templateId: template.id,
        userId: user.id,
        moduleId,
        repoUrl: body?.repoUrl ?? null,
        liveUrl: body?.liveUrl ?? null,
        fileUrl: body?.fileUrl ?? null,
        submissionText: body?.submissionText ?? null,
        status: 'SUBMITTED',
      },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

