import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';
import { bumpLearnStreak } from '@/server/learn-streak';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Answer = { questionId: string; answer: 'A' | 'B' | 'C' | 'D' };

export async function POST(req: Request, { params }: { params: { moduleId: string } }) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const answers = (body?.answers ?? []) as Answer[];
    const moduleId = params.moduleId;

    const questions = await prisma.courseModuleQuizQuestion.findMany({
      where: { moduleId },
      select: {
        id: true,
        order: true,
        prompt: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctOption: true,
        explanation: true,
      },
      orderBy: { order: 'asc' },
    });

    if (questions.length === 0) return NextResponse.json({ message: 'No quiz questions' }, { status: 400 });

    const map = new Map(answers.map((a) => [a.questionId, a.answer]));
    let score = 0;

    const feedback = questions.map((q) => {
      const chosen = map.get(q.id) ?? null;
      const correct = chosen ? chosen === (q.correctOption as any) : false;
      if (correct) score += 1;
      return {
        questionId: q.id,
        order: q.order,
        chosen,
        correctOption: q.correctOption,
        correct,
        explanation: q.explanation ?? null,
      };
    });

    const total = questions.length;
    const percent = Math.round((score / total) * 100);
    const passed = percent >= 70;

    await prisma.courseModuleQuizAttempt.create({
      data: { userId: user.id, moduleId, score, total, percent, passed },
    });

    await bumpLearnStreak(user.id);

    // If they passed, mark module completion + certificate (same logic as module completion endpoint)
    let completion: any = null;
    let certificate: any = null;
    if (passed) {
      completion = await prisma.courseModuleCompletion.upsert({
        where: { userId_moduleId: { userId: user.id, moduleId } },
        create: { userId: user.id, moduleId, score: percent, passed: true },
        update: { score: percent, passed: true, completedAt: new Date() },
      });
      certificate = await prisma.courseModuleCertificate.upsert({
        where: { userId_moduleId: { userId: user.id, moduleId } },
        create: { userId: user.id, moduleId, code: `MOD-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-4)}` },
        update: {},
      });

      await prisma.userBadge.upsert({
        where: { userId_key: { userId: user.id, key: 'FIRST_QUIZ_PASSED' } },
        create: { userId: user.id, key: 'FIRST_QUIZ_PASSED' },
        update: {},
      });
    }

    return NextResponse.json({ score, total, percent, passed, feedback, completion, certificate });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

