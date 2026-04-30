import { NextResponse } from 'next/server';
import { LearnerType } from '@prisma/client';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEARNER_INCLUDE = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
    },
  },
  enrollments: {
    include: {
      cohort: { include: { track: { select: { name: true, slug: true } } } },
      payments: true,
    },
  },
  certificates: true,
  _count: { select: { submissions: true, certificates: true } },
} as const;

const LEARNER_TYPES = new Set<string>(Object.values(LearnerType));

export async function GET(req: Request) {
  try {
    const u = await requireUser(req);
    const learner = await prisma.learnerProfile.findUnique({
      where: { userId: u.id },
      include: LEARNER_INCLUDE,
    });
    if (!learner) return NextResponse.json({ message: 'Learner profile not found' }, { status: 404 });
    return NextResponse.json(learner);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (msg === 'SERVER_MISCONFIGURED') return NextResponse.json({ message: 'Server misconfigured' }, { status: 500 });
    console.error(e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const u = await requireUser(req);
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const learner = await prisma.learnerProfile.findUnique({ where: { userId: u.id } });
    if (!learner) return NextResponse.json({ message: 'Learner profile not found' }, { status: 404 });

    const data: {
      learnerType?: LearnerType;
      currentStage?: string | null;
      location?: string | null;
      source?: string | null;
      bio?: string | null;
      portfolioUrl?: string | null;
      linkedInUrl?: string | null;
      githubUrl?: string | null;
    } = {};

    if (body.learnerType !== undefined) {
      const lt = String(body.learnerType);
      if (!LEARNER_TYPES.has(lt)) {
        return NextResponse.json({ message: 'Invalid learnerType' }, { status: 400 });
      }
      data.learnerType = lt as LearnerType;
    }
    if (body.currentStage !== undefined) data.currentStage = body.currentStage == null ? null : String(body.currentStage);
    if (body.location !== undefined) data.location = body.location == null ? null : String(body.location);
    if (body.source !== undefined) data.source = body.source == null ? null : String(body.source);
    if (body.bio !== undefined) data.bio = body.bio == null ? null : String(body.bio);
    if (body.portfolioUrl !== undefined) data.portfolioUrl = body.portfolioUrl == null ? null : String(body.portfolioUrl);
    if (body.linkedInUrl !== undefined) data.linkedInUrl = body.linkedInUrl == null ? null : String(body.linkedInUrl);
    if (body.githubUrl !== undefined) data.githubUrl = body.githubUrl == null ? null : String(body.githubUrl);

    const updated = await prisma.learnerProfile.update({
      where: { userId: u.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error(e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
