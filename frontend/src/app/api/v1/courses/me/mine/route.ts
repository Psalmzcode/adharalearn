import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);

    const [coursePurchases, modulePurchases, bundlePurchases] = await Promise.all([
      prisma.coursePurchase.findMany({
        where: { userId: user.id, status: 'SUCCESS' },
        include: { course: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.courseModulePurchase.findMany({
        where: { userId: user.id, status: 'SUCCESS' },
        include: { module: { include: { course: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.courseBundlePurchase.findMany({
        where: { userId: user.id, status: 'SUCCESS' },
        include: { bundle: { include: { course: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const map = new Map<string, any>();
    coursePurchases.forEach((p) => map.set(p.courseId, p.course));
    modulePurchases.forEach((p) => map.set(p.module.courseId, p.module.course));
    bundlePurchases.forEach((p) => map.set(p.bundle.courseId, p.bundle.course));

    const res = Array.from(map.values()).map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      mode: c.mode,
      price: c.price,
      currency: c.currency,
    }));

    return NextResponse.json(res);
  } catch (e: any) {
    const code = e?.message;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

