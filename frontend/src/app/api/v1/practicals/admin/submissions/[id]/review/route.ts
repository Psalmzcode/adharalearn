import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const status = String(body?.status ?? '');
    if (!['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ message: 'Invalid review status' }, { status: 400 });
    }

    const db = prisma as any;
    const updated = await db.practicalSubmission.update({
      where: { id: params.id },
      data: {
        status,
        feedback: body?.feedback ?? null,
        score: body?.score !== undefined && body?.score !== null ? Number(body.score) : null,
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

