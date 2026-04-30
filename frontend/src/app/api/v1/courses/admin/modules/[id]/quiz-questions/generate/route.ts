import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DraftQ = {
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
};

function extractJsonArray(s: string): any[] {
  const match = s.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    return JSON.parse(match[0]);
  } catch {
    return [];
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const count = Math.min(20, Math.max(1, Number(body?.count ?? 5)));
    const moduleId = params.id;

    const mod = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: {
        course: { select: { title: true } },
        lessons: { where: { isPublished: true }, select: { order: true, title: true, description: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!mod) return NextResponse.json({ message: 'Module not found' }, { status: 404 });

    const key = process.env.GEMINI_API_KEY;
    if (!key) return NextResponse.json({ message: 'GEMINI_API_KEY not set' }, { status: 400 });
    const models = (process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    const context = {
      course: mod.course.title,
      module: { title: mod.title, description: mod.description ?? '', notes: mod.notesMd ?? '' },
      lessons: mod.lessons.map((l) => ({ order: l.order, title: l.title, description: l.description ?? '' })),
    };

    const prompt = [
      `Generate ${count} multiple-choice quiz questions for this module.`,
      `Output ONLY valid JSON array, no markdown, no commentary.`,
      `Each object must contain: prompt, optionA, optionB, optionC, optionD, correctOption (A/B/C/D), explanation.`,
      `Quality rules: practical, beginner-friendly, not ambiguous, one clearly correct answer.`,
      `Context JSON:`,
      JSON.stringify(context),
    ].join('\n');

    let text = '';
    let lastErr: any = null;
    for (const model of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 },
          }),
        });
        if (!res.ok) throw new Error(`Gemini ${model} failed (${res.status})`);
        const data = await res.json();
        text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('\n') ?? '';
        if (text) break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!text) return NextResponse.json({ message: 'Failed to generate questions', detail: String(lastErr ?? '') }, { status: 502 });

    const parsed = extractJsonArray(text) as DraftQ[];
    const drafts = parsed
      .filter((q) => q?.prompt && q?.optionA && q?.optionB && q?.optionC && q?.optionD && ['A', 'B', 'C', 'D'].includes(q?.correctOption))
      .slice(0, count);
    if (drafts.length === 0) return NextResponse.json({ message: 'AI did not return valid questions' }, { status: 422 });

    const maxOrder = await prisma.courseModuleQuizQuestion.aggregate({ where: { moduleId }, _max: { order: true } });
    let nextOrder = (maxOrder._max.order ?? 0) + 1;

    const created = [];
    for (const q of drafts) {
      const row = await prisma.courseModuleQuizQuestion.create({
        data: {
          moduleId,
          order: nextOrder++,
          prompt: q.prompt,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          explanation: q.explanation ?? null,
        },
      });
      created.push(row);
    }

    return NextResponse.json({ createdCount: created.length, questions: created });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

