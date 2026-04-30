import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug;
  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      mode: true,
      price: true,
      currency: true,
      isPublished: true,
      bundles: {
        where: { isPublished: true },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          currency: true,
          items: { select: { moduleId: true } },
        },
      },
      modules: {
        where: { isPublished: true },
        select: {
          id: true,
          order: true,
          title: true,
          description: true,
          isFree: true,
          price: true,
          currency: true,
          isPublished: true,
          lessons: {
            where: { isPublished: true },
            select: { id: true, order: true, title: true, description: true, durationMins: true, isPublished: true, videoUrl: true, notesUrl: true },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!course || !course.isPublished) {
    return NextResponse.json({ message: 'Course not found' }, { status: 404 });
  }

  // Visitor access rules:
  // - Can preview the first 2 lessons of the first published FREE module (by order) without signup.
  // - Remaining lessons in that free module are "free (signup)".
  const previewModuleId =
    (course.modules ?? []).find((m: any) => m.isFree)?.id ?? null;

  return NextResponse.json({
    ...course,
    bundles: (course.bundles ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      price: b.price,
      currency: b.currency,
      moduleIds: (b.items ?? []).map((i: any) => i.moduleId),
    })),
    modules: (course.modules ?? []).map((m: any) => ({
      ...m,
      lessons: (m.lessons ?? []).map((l: any) => {
        const isPreviewModule = previewModuleId && m.id === previewModuleId;
        const canPreview = isPreviewModule && m.isFree && Number(l.order) <= 2;
        const access = m.isFree ? (canPreview ? 'PREVIEW' : 'FREE_SIGNUP') : 'PAID';
        return {
          id: l.id,
          order: l.order,
          title: l.title,
          description: l.description,
          durationMins: l.durationMins,
          isPublished: l.isPublished,
          access,
          // Only expose URLs for preview lessons to visitors.
          videoUrl: canPreview ? l.videoUrl : null,
          notesUrl: canPreview ? l.notesUrl : null,
        };
      }),
    })),
  });
}

