import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export async function GET(req: Request, { params }: { params: { ref: string } }) {
  try {
    await requireUser(req);
    const ref = params.ref;
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ message: 'PAYSTACK_SECRET_KEY not configured' }, { status: 403 });

    const res = await axios.get(`https://api.paystack.co/transaction/verify/${ref}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const status = res.data.data.status === 'success' ? 'SUCCESS' : 'FAILED';

    const purchase = await prisma.coursePurchase.findFirst({ where: { paystackRef: ref } });
    if (!purchase) return NextResponse.json({ message: 'Purchase not found' }, { status: 404 });

    const updated = await prisma.coursePurchase.update({
      where: { id: purchase.id },
      data: { status: status as any, ...(status === 'SUCCESS' ? { paidAt: new Date() } : {}) },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    const code = e?.message;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

