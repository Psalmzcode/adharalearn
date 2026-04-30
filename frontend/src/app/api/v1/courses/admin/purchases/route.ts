import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const safe = async <T>(fn: () => Promise<T>): Promise<T | []> => {
      try {
        return await fn();
      } catch {
        return [];
      }
    };

    const [coursePurchases, modulePurchases, bundlePurchases] = await Promise.all([
      safe(() =>
        prisma.coursePurchase.findMany({
          orderBy: { createdAt: 'desc' },
          take: 200,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            course: { select: { id: true, title: true } },
          },
        }),
      ),
      safe(() =>
        prisma.courseModulePurchase.findMany({
          orderBy: { createdAt: 'desc' },
          take: 200,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            module: {
              select: {
                id: true,
                title: true,
                course: { select: { id: true, title: true } },
              },
            },
          },
        }),
      ),
      safe(() =>
        prisma.courseBundlePurchase.findMany({
          orderBy: { createdAt: 'desc' },
          take: 200,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            bundle: {
              select: {
                id: true,
                name: true,
                course: { select: { id: true, title: true } },
              },
            },
          },
        }),
      ),
    ]);

    const rows = [
      ...coursePurchases.map((p) => ({
        id: p.id,
        kind: 'COURSE',
        status: p.status,
        amount: Number(p.amount),
        currency: p.currency,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        paystackRef: p.paystackRef,
        learner: p.user,
        course: p.course,
        item: p.course.title,
      })),
      ...modulePurchases.map((p) => ({
        id: p.id,
        kind: 'MODULE',
        status: p.status,
        amount: Number(p.amount),
        currency: p.currency,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        paystackRef: p.paystackRef,
        learner: p.user,
        course: p.module.course,
        item: p.module.title,
      })),
      ...bundlePurchases.map((p) => ({
        id: p.id,
        kind: 'BUNDLE',
        status: p.status,
        amount: Number(p.amount),
        currency: p.currency,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        paystackRef: p.paystackRef,
        learner: p.user,
        course: p.bundle.course,
        item: p.bundle.name,
      })),
    ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    return NextResponse.json(rows);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (e?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const detail = process.env.NODE_ENV === 'development' ? String(e?.message ?? e) : undefined;
    return NextResponse.json({ message: 'Server error', detail }, { status: 500 });
  }
}
