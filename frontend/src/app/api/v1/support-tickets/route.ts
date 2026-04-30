import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { requireUser, requireAdmin } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // admin can see all; learners see their own
    const user = await requireUser(req);
    const isAdmin = user.role === 'ADMIN';
    const tickets = await prisma.supportTicket.findMany({
      where: isAdmin ? undefined : { userId: user.id },
      include: { module: { select: { id: true, title: true, order: true, courseId: true } }, user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tickets);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const moduleId = String(body?.moduleId ?? '');
    const subject = String(body?.subject ?? '');
    const text = String(body?.body ?? '');
    if (!moduleId || !subject || !text) return NextResponse.json({ message: 'moduleId, subject, body required' }, { status: 400 });

    const created = await prisma.supportTicket.create({
      data: { userId: user.id, moduleId, subject, body: text },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

