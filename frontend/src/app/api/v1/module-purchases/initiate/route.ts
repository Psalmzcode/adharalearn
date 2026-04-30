import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const moduleId = String(body?.moduleId ?? '');
    const callbackUrl = String(body?.callbackUrl ?? '');
    if (!moduleId || !callbackUrl) return NextResponse.json({ message: 'moduleId and callbackUrl required' }, { status: 400 });

    const mod = await prisma.courseModule.findUnique({ where: { id: moduleId }, include: { course: true } });
    if (!mod || !mod.isPublished) return NextResponse.json({ message: 'Module not found' }, { status: 404 });
    if (mod.isFree) return NextResponse.json({ message: 'Module is free' }, { status: 400 });
    if (!mod.price) return NextResponse.json({ message: 'Module price not set' }, { status: 400 });

    const purchase = await prisma.courseModulePurchase.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId: mod.id } },
      create: { userId: user.id, moduleId: mod.id, amount: Number(mod.price), currency: mod.currency, status: 'PENDING' },
      update: { amount: Number(mod.price), currency: mod.currency, status: 'PENDING', paidAt: null },
    });

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({
        purchaseId: purchase.id,
        authorizationUrl: null,
        amount: Number(mod.price),
        message: 'PAYSTACK_SECRET_KEY not set; purchase created as PENDING.',
      });
    }

    const u = await prisma.user.findUnique({ where: { id: user.id } });
    if (!u) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const res = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      { email: u.email, amount: Number(mod.price) * 100, reference: purchase.id, callback_url: callbackUrl },
      { headers: { Authorization: `Bearer ${secret}` } },
    );

    await prisma.courseModulePurchase.update({ where: { id: purchase.id }, data: { paystackRef: res.data.data.reference } });

    return NextResponse.json({
      purchaseId: purchase.id,
      authorizationUrl: res.data.data.authorization_url,
      amount: Number(mod.price),
    });
  } catch (e: any) {
    const code = e?.message;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

