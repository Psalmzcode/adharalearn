import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/server/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET ?? '';
  if (!secret) return NextResponse.json({ received: false }, { status: 200 });

  const signature = req.headers.get('x-paystack-signature') ?? '';
  const raw = Buffer.from(await req.arrayBuffer());
  const hash = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  if (hash !== signature) return NextResponse.json({ received: false }, { status: 200 });

  const event = JSON.parse(raw.toString('utf8'));
  if (event?.event === 'charge.success') {
    const ref = event?.data?.reference;
    if (ref) {
      const p = await prisma.courseModulePurchase.findFirst({ where: { paystackRef: ref } });
      if (p && p.status !== 'SUCCESS') {
        await prisma.courseModulePurchase.update({ where: { id: p.id }, data: { status: 'SUCCESS', paidAt: new Date() } });
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

