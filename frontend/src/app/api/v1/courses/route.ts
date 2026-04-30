import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        mode: true,
        price: true,
        currency: true,
        isPublished: true,
        createdAt: true,
        modules: {
          where: { isPublished: true },
          select: {
            id: true,
            order: true,
            title: true,
            isFree: true,
            price: true,
            currency: true,
          },
          orderBy: { order: 'asc' },
        },
        bundles: {
          where: { isPublished: true },
          select: {
            id: true,
            name: true,
            price: true,
            currency: true,
            _count: { select: { items: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const body = courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      mode: c.mode,
      price: Number(c.price),
      currency: c.currency,
      isPublished: c.isPublished,
      createdAt: c.createdAt,
      modules: c.modules.map((m) => ({
        id: m.id,
        order: m.order,
        title: m.title,
        isFree: m.isFree,
        price: m.price != null ? Number(m.price) : null,
        currency: m.currency,
      })),
      bundles: c.bundles.map((b) => ({
        id: b.id,
        name: b.name,
        price: Number(b.price),
        currency: b.currency,
        moduleCount: b._count.items,
      })),
    }));

    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Database unavailable', detail: process.env.NODE_ENV === 'development' ? String(e?.message ?? e) : undefined },
      { status: 503 },
    );
  }
}

