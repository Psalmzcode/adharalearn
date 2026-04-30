import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const courseId = String(body?.courseId ?? '');
    const callbackUrl = String(body?.callbackUrl ?? '');
    if (!courseId || !callbackUrl) return NextResponse.json({ message: 'courseId and callbackUrl required' }, { status: 400 });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || !course.isPublished) return NextResponse.json({ message: 'Course not found' }, { status: 404 });

    const purchase = await prisma.coursePurchase.upsert({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      create: { userId: user.id, courseId: course.id, amount: Number(course.price), currency: course.currency, status: 'PENDING' },
      update: { amount: Number(course.price), currency: course.currency, status: 'PENDING', paidAt: null },
    });

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({
        purchaseId: purchase.id,
        authorizationUrl: null,
        amount: Number(course.price),
        message: 'PAYSTACK_SECRET_KEY not set; purchase created as PENDING.',
      });
    }

    const u = await prisma.user.findUnique({ where: { id: user.id } });
    if (!u) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const res = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      { email: u.email, amount: Number(course.price) * 100, reference: purchase.id, callback_url: callbackUrl },
      { headers: { Authorization: `Bearer ${secret}` } },
    );

    await prisma.coursePurchase.update({ where: { id: purchase.id }, data: { paystackRef: res.data.data.reference } });

    return NextResponse.json({
      purchaseId: purchase.id,
      authorizationUrl: res.data.data.authorization_url,
      amount: Number(course.price),
    });
  } catch (e: any) {
    const code = e?.message;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

