import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';
import { generateOtpCode, hashOtp, sendOtpEmail } from '@/server/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const u = await requireUser(req);
    const user = await prisma.user.findUnique({ where: { id: u.id }, select: { id: true, email: true, firstName: true, emailVerified: true } });
    if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

    const purpose = 'VERIFY_EMAIL';

    // Basic rate-limit: don't allow more than 1 active OTP per minute
    const recent = await prisma.emailOtp.findFirst({
      where: { userId: user.id, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
      return NextResponse.json({ message: 'Please wait a minute before requesting another code.' }, { status: 429 });
    }

    const code = generateOtpCode();
    const codeHash = hashOtp({ userId: user.id, code, purpose });
    const expiresAt = new Date(Date.now() + 10 * 60_000);

    await prisma.emailOtp.create({
      data: { userId: user.id, email: user.email, purpose, codeHash, expiresAt },
    });

    await sendOtpEmail({ to: user.email, firstName: user.firstName, code });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

