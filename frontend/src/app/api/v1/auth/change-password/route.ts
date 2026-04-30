import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';
import { hashPassword, verifyPassword } from '@/server/password';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const u = await requireUser(req);
    let body: { currentPassword?: string; oldPassword?: string; newPassword?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const current = body.currentPassword ?? body.oldPassword;
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (typeof current !== 'string' || !current) {
      return NextResponse.json({ message: 'Current password is required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ message: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: u.id } });
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const valid = await verifyPassword(user.passwordHash, current);
    if (!valid) return NextResponse.json({ message: 'Current password is incorrect' }, { status: 400 });

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: u.id }, data: { passwordHash } });
    await prisma.refreshToken.deleteMany({ where: { userId: u.id } });

    return NextResponse.json({ message: 'Password changed' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error(e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
