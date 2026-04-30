import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const user = await requireUser(req);
    const courseId = params.courseId;

    const [coursePurchase, modulePurchase, bundlePurchase] = await Promise.all([
      prisma.coursePurchase.findFirst({ where: { userId: user.id, courseId, status: 'SUCCESS' } }),
      prisma.courseModulePurchase.findFirst({ where: { userId: user.id, status: 'SUCCESS', module: { courseId } } }),
      prisma.courseBundlePurchase.findFirst({ where: { userId: user.id, status: 'SUCCESS', bundle: { courseId } } }),
    ]);
    if (!coursePurchase && !modulePurchase && !bundlePurchase) {
      return NextResponse.json({ message: 'Course locked' }, { status: 403 });
    }

    const template = await prisma.practicalTemplate.findFirst({
      where: { courseId, scope: 'TRACK', isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!template) return NextResponse.json({ template: null, latestSubmission: null });

    const latestSubmission = await prisma.practicalSubmission.findFirst({
      where: { templateId: template.id, userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ template, latestSubmission });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const user = await requireUser(req);
    const courseId = params.courseId;
    const body = await req.json().catch(() => ({}));

    const [coursePurchase, modulePurchase, bundlePurchase] = await Promise.all([
      prisma.coursePurchase.findFirst({ where: { userId: user.id, courseId, status: 'SUCCESS' } }),
      prisma.courseModulePurchase.findFirst({ where: { userId: user.id, status: 'SUCCESS', module: { courseId } } }),
      prisma.courseBundlePurchase.findFirst({ where: { userId: user.id, status: 'SUCCESS', bundle: { courseId } } }),
    ]);
    if (!coursePurchase && !modulePurchase && !bundlePurchase) {
      return NextResponse.json({ message: 'Course locked' }, { status: 403 });
    }

    const template = await prisma.practicalTemplate.findFirst({
      where: { courseId, scope: 'TRACK', isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!template) return NextResponse.json({ message: 'No track practical template found' }, { status: 404 });

    if (!body?.repoUrl && !body?.liveUrl && !body?.fileUrl && !body?.submissionText) {
      return NextResponse.json({ message: 'Provide at least one submission field' }, { status: 400 });
    }

    const created = await prisma.practicalSubmission.create({
      data: {
        templateId: template.id,
        userId: user.id,
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

