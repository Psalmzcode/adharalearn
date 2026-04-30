import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      service: 'db-keepalive',
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        service: 'db-keepalive',
        message: 'Database unavailable',
        detail: process.env.NODE_ENV === 'development' ? String(e?.message ?? e) : undefined,
      },
      { status: 503 },
    );
  }
}
