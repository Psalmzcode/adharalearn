import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const bundleId = String(body?.bundleId ?? '');
    const callbackUrl = String(body?.callbackUrl ?? '');
    if (!bundleId || !callbackUrl) return NextResponse.json({ message: 'bundleId and callbackUrl required' }, { status: 400 });

    const bundle = await prisma.courseBundle.findUnique({ where: { id: bundleId } });
    if (!bundle || !bundle.isPublished) return NextResponse.json({ message: 'Bundle not found' }, { status: 404 });

    const purchase = await prisma.courseBundlePurchase.upsert({
      where: { userId_bundleId: { userId: user.id, bundleId: bundle.id } },
      create: { userId: user.id, bundleId: bundle.id, amount: Number(bundle.price), currency: bundle.currency, status: 'PENDING' },
      update: { amount: Number(bundle.price), currency: bundle.currency, status: 'PENDING', paidAt: null },
    });

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({
        purchaseId: purchase.id,
        authorizationUrl: null,
        amount: Number(bundle.price),
        message: 'PAYSTACK_SECRET_KEY not set; purchase created as PENDING.',
      });
    }

    const u = await prisma.user.findUnique({ where: { id: user.id } });
    if (!u) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const res = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      { email: u.email, amount: Number(bundle.price) * 100, reference: purchase.id, callback_url: callbackUrl },
      { headers: { Authorization: `Bearer ${secret}` } },
    );

    await prisma.courseBundlePurchase.update({ where: { id: purchase.id }, data: { paystackRef: res.data.data.reference } });

    return NextResponse.json({
      purchaseId: purchase.id,
      authorizationUrl: res.data.data.authorization_url,
      amount: Number(bundle.price),
    });
  } catch (e: any) {
    const code = e?.message;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
