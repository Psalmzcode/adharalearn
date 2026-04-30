import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';
import { hashOtp } from '@/server/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bad(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function POST(req: Request) {
  try {
    const u = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!/^\d{6}$/.test(code)) return bad('Enter the 6-digit code.', 400);

    const user = await prisma.user.findUnique({ where: { id: u.id }, select: { id: true, email: true, emailVerified: true } });
    if (!user) return bad('Not found', 404);
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

    const purpose = 'VERIFY_EMAIL';
    const otp = await prisma.emailOtp.findFirst({
      where: { userId: user.id, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, codeHash: true, expiresAt: true },
    });
    if (!otp) return bad('Code expired. Request a new code.', 410);

    const expected = hashOtp({ userId: user.id, code, purpose });
    if (expected !== otp.codeHash) return bad('Invalid code. Try again.', 401);

    await prisma.$transaction([
      prisma.emailOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }),
      prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } }),
    ]);

    const safe = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, emailVerified: true },
    });
    return NextResponse.json({ ok: true, user: safe });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

