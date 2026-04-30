import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { code: string } }) {
  const code = params.code;
  const cert = await prisma.courseModuleCertificate.findUnique({
    where: { code },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      module: { include: { course: { select: { title: true, slug: true } } } },
    },
  });
  if (!cert) return NextResponse.json({ valid: false }, { status: 404 });

  return NextResponse.json({
    valid: true,
    code: cert.code,
    issuedAt: cert.issuedAt,
    studentName: `${cert.user.firstName} ${cert.user.lastName}`,
    courseTitle: cert.module.course.title,
    moduleTitle: cert.module.title,
  });
}

