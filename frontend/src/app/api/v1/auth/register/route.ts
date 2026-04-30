import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/server/prisma';
import { hashPassword } from '@/server/password';
import { refreshTokenExpiresAt, signAccessToken, signRefreshToken } from '@/server/jwt-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bad(msg: string | string[], status = 400) {
  return NextResponse.json({ message: msg }, { status });
}

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return bad('Invalid JSON', 400);
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
    const roleRaw = body.role;
    const requested = roleRaw === undefined || roleRaw === null ? 'LEARNER' : String(roleRaw);

    if (!email || !password || !firstName || !lastName) return bad('Missing required fields');
    if (password.length < 8) return bad('Password must be at least 8 characters');

    if (requested !== 'LEARNER') return bad('Only LEARNER registration is allowed here', 403);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return bad('Email already registered', 409);

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        role: Role.LEARNER,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, emailVerified: true },
    });

    await prisma.learnerProfile.create({ data: { userId: user.id } });

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(user.id, user.email, user.role),
      signRefreshToken(user.id, user.email, user.role),
    ]);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: refreshTokenExpiresAt() },
    });

    // send verification OTP (best-effort; user can request again from /verify-email)
    try {
      const { generateOtpCode, hashOtp, sendOtpEmail } = await import('@/server/email');
      const code = generateOtpCode();
      const purpose = 'VERIFY_EMAIL';
      await prisma.emailOtp.create({
        data: {
          userId: user.id,
          email: user.email,
          purpose,
          codeHash: hashOtp({ userId: user.id, code, purpose }),
          expiresAt: new Date(Date.now() + 10 * 60_000),
        },
      });
      await sendOtpEmail({ to: user.email, firstName: user.firstName, code });
    } catch {
      // ignore
    }

    return NextResponse.json({ user, accessToken, refreshToken, needsEmailVerification: !user.emailVerified });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'SERVER_MISCONFIGURED') return bad('Server misconfigured', 500);
    console.error(e);
    return bad('Server error', 500);
  }
}
