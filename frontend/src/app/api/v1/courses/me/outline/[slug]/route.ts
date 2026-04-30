import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireUser(req);
    const slug = params.slug;

    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        bundles: {
          where: { isPublished: true },
          include: { items: { select: { moduleId: true } } },
        },
        modules: {
          where: { isPublished: true },
          include: { lessons: { where: { isPublished: true }, orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!course) return NextResponse.json({ message: 'Course not found' }, { status: 404 });

    const [coursePurchase, modulePurchases, bundlePurchases, completions, certs, bundleTemplates, trackTemplate] = await Promise.all([
      prisma.coursePurchase.findFirst({ where: { userId: user.id, courseId: course.id, status: 'SUCCESS' } }),
      prisma.courseModulePurchase.findMany({
        where: { userId: user.id, status: 'SUCCESS', module: { courseId: course.id } },
        select: { moduleId: true },
      }),
      prisma.courseBundlePurchase.findMany({
        where: { userId: user.id, status: 'SUCCESS', bundle: { courseId: course.id } },
        include: { bundle: { include: { items: { select: { moduleId: true } } } } },
      }),
      prisma.courseModuleCompletion.findMany({ where: { userId: user.id, module: { courseId: course.id } } }),
      prisma.courseModuleCertificate.findMany({ where: { userId: user.id, module: { courseId: course.id } } }),
      prisma.practicalTemplate.findMany({
        where: { scope: 'BUNDLE', isPublished: true, requiredForCompletion: true, bundle: { courseId: course.id } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.practicalTemplate.findFirst({
        where: { scope: 'TRACK', isPublished: true, requiredForCompletion: true, courseId: course.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const purchasedModules = new Set(modulePurchases.map((p) => p.moduleId));
    bundlePurchases.forEach((bp) => bp.bundle.items.forEach((i) => purchasedModules.add(i.moduleId)));
    const completedModules = new Set(completions.map((c) => c.moduleId));
    const certMap = new Map(certs.map((c) => [c.moduleId, c]));

    const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const lessonProgressRows = allLessonIds.length
      ? await prisma.lessonProgress.findMany({
          where: { userId: user.id, lessonId: { in: allLessonIds } },
          select: { lessonId: true, positionSeconds: true },
        })
      : [];
    const progressByLessonId = new Map<string, number>(lessonProgressRows.map((r) => [r.lessonId, r.positionSeconds]));

    const isWatched = (positionSeconds: number, durationMins: number | null | undefined) => {
      const durSec = Math.max(0, Math.floor(Number(durationMins ?? 0) * 60));
      if (!durSec) return false;
      return positionSeconds >= Math.floor(durSec * 0.9);
    };

    const unlockedByCourse = !!coursePurchase;
    const modules = course.modules.map((m) => {
      const unlocked = unlockedByCourse || m.isFree || purchasedModules.has(m.id);
      const completed = completedModules.has(m.id);
      const cert = certMap.get(m.id) ?? null;
      const lessonsTotal = m.lessons.length;
      const watchedCount = m.lessons.filter((l) => isWatched(progressByLessonId.get(l.id) ?? 0, l.durationMins)).length;
      const watchedPct = lessonsTotal > 0 ? Math.round((watchedCount / lessonsTotal) * 100) : 0;
      return {
        id: m.id,
        order: m.order,
        title: m.title,
        description: m.description,
        isFree: m.isFree,
        price: m.price,
        currency: m.currency,
        unlocked,
        completed,
        watch: { watchedCount, totalLessons: lessonsTotal, watchedPct },
        certificate: cert ? { code: cert.code, fileUrl: cert.fileUrl, issuedAt: cert.issuedAt } : null,
        lessons: unlocked
          ? m.lessons.map((l) => {
              const positionSeconds = progressByLessonId.get(l.id) ?? 0;
              return {
                ...l,
                positionSeconds,
                watched: isWatched(positionSeconds, l.durationMins),
              };
            })
          : m.lessons.map((l) => ({
              id: l.id,
              order: l.order,
              title: l.title,
              description: l.description,
              durationMins: l.durationMins,
              isPublished: l.isPublished,
              positionSeconds: 0,
              watched: false,
            })),
      };
    });

    const bundleTemplateMap = new Map(bundleTemplates.map((t: any) => [t.bundleId, t]));
    const bundleTemplateIds = bundleTemplates.map((t: any) => t.id);
    const bundleTrackSubmissionRows = await prisma.practicalSubmission.findMany({
      where: {
        userId: user.id,
        templateId: { in: [...bundleTemplateIds, ...(trackTemplate ? [trackTemplate.id] : [])] },
      },
      orderBy: { createdAt: 'desc' },
    });
    const latestByTemplate = new Map<string, any>();
    for (const s of bundleTrackSubmissionRows) {
      if (!latestByTemplate.has(s.templateId)) latestByTemplate.set(s.templateId, s);
    }

    const bundles = course.bundles.map((b) => {
      const purchased = bundlePurchases.some((p) => p.bundleId === b.id);
      const moduleIds = b.items.map((i) => i.moduleId);
      const completedCount = moduleIds.filter((id) => completedModules.has(id)).length;
      const allModulesCompleted = moduleIds.length > 0 && completedCount === moduleIds.length;
      const practicalTemplate = bundleTemplateMap.get(b.id);
      const practicalSubmission = practicalTemplate ? latestByTemplate.get(practicalTemplate.id) : null;
      const practicalApproved = practicalSubmission?.status === 'APPROVED';
      const practicalRequired = !!practicalTemplate;
      return {
        id: b.id,
        name: b.name,
        description: b.description,
        price: b.price,
        currency: b.currency,
        moduleIds,
        purchased,
        modulesCompleted: completedCount,
        allModulesCompleted,
        practicalRequired,
        practicalApproved,
        completionEligible: allModulesCompleted && (!practicalRequired || practicalApproved),
      };
    });

    const trackSubmission = trackTemplate ? latestByTemplate.get(trackTemplate.id) : null;
    const totalCourseModules = course.modules.length;
    const doneCourseModules = course.modules.filter((m) => completedModules.has(m.id)).length;
    const trackPracticalRequired = !!trackTemplate;
    const trackPracticalApproved = trackSubmission?.status === 'APPROVED';
    const trackCompletionEligible =
      totalCourseModules > 0 &&
      doneCourseModules === totalCourseModules &&
      (!trackPracticalRequired || trackPracticalApproved);

    return NextResponse.json({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      whatsappLink: course.whatsappLink,
      modules,
      bundles,
      track: {
        modulesCompleted: doneCourseModules,
        modulesTotal: totalCourseModules,
        practicalRequired: trackPracticalRequired,
        practicalApproved: trackPracticalApproved,
        completionEligible: trackCompletionEligible,
      },
    });
  } catch (e: any) {
    const code = e?.message;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

