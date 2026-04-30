import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';
import { bumpLearnStreak } from '@/server/learn-streak';

function certCode() {
  return `MOD-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-4)}`;
}

export async function POST(req: Request, { params }: { params: { moduleId: string } }) {
  try {
    const user = await requireUser(req);
    const moduleId = params.moduleId;
    const db = prisma as any;
    const body = await req.json().catch(() => ({}));
    const score = body?.score !== undefined ? Number(body.score) : undefined;
    const passed = body?.passed !== undefined ? Boolean(body.passed) : true;

    const mod = await prisma.courseModule.findUnique({ where: { id: moduleId } });
    if (!mod) return NextResponse.json({ message: 'Module not found' }, { status: 404 });

    const [coursePurchase, modulePurchase] = await Promise.all([
      prisma.coursePurchase.findFirst({ where: { userId: user.id, courseId: mod.courseId, status: 'SUCCESS' } }),
      prisma.courseModulePurchase.findFirst({ where: { userId: user.id, moduleId, status: 'SUCCESS' } }),
    ]);
    if (!mod.isFree && !coursePurchase && !modulePurchase) return NextResponse.json({ message: 'Module locked' }, { status: 403 });

    const requiredPractical = await db.practicalTemplate.findFirst({
      where: { moduleId, scope: 'MODULE', isPublished: true, requiredForCompletion: true },
      orderBy: { createdAt: 'desc' },
    });
    if (requiredPractical) {
      const approved = await db.practicalSubmission.findFirst({
        where: { templateId: requiredPractical.id, userId: user.id, status: 'APPROVED' },
        orderBy: { reviewedAt: 'desc' },
      });
      if (!approved) {
        return NextResponse.json(
          { message: 'Practical submission must be approved before module completion' },
          { status: 400 },
        );
      }
    }

    const completion = await prisma.courseModuleCompletion.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId } },
      create: { userId: user.id, moduleId, score, passed },
      update: { score, passed, completedAt: new Date() },
    });

    let certificate: any = null;
    if (completion.passed) {
      certificate = await prisma.courseModuleCertificate.upsert({
        where: { userId_moduleId: { userId: user.id, moduleId } },
        create: { userId: user.id, moduleId, code: certCode() },
        update: {},
      });
    }

    await bumpLearnStreak(user.id);

    return NextResponse.json({ completion, certificate });
  } catch (e: any) {
    const code = e?.message;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

