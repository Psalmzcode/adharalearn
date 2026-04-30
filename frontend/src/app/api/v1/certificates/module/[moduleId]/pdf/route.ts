import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '@/server/prisma';
import { requireUser } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('en-NG', { year: 'numeric', month: 'long', day: '2-digit' }).format(d);
}

export async function GET(req: Request, { params }: { params: { moduleId: string } }) {
  try {
    const user = await requireUser(req);
    const moduleId = params.moduleId;

    const cert = await prisma.courseModuleCertificate.findUnique({
      where: { userId_moduleId: { userId: user.id, moduleId } },
      include: {
        user: { select: { firstName: true, lastName: true } },
        module: { include: { course: { select: { title: true } } } },
      },
    });

    if (!cert) return NextResponse.json({ message: 'Certificate not found' }, { status: 404 });

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([842, 595]); // landscape A4
    const { width, height } = page.getSize();

    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // Border
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: rgb(0.82, 0.67, 0.18),
      borderWidth: 3,
    });

    // Branding
    page.drawText('ADHARA EDU', { x: 55, y: height - 85, size: 26, font: bold, color: rgb(0.15, 0.15, 0.15) });
    page.drawText('Certificate of Completion', { x: 55, y: height - 120, size: 18, font, color: rgb(0.25, 0.25, 0.25) });

    const studentName = `${cert.user.firstName} ${cert.user.lastName}`.trim();
    const courseTitle = cert.module.course.title;
    const moduleTitle = cert.module.title;

    // Main text
    page.drawText('This certifies that', { x: 55, y: height - 185, size: 14, font, color: rgb(0.25, 0.25, 0.25) });
    page.drawText(studentName, { x: 55, y: height - 235, size: 34, font: bold, color: rgb(0.12, 0.12, 0.12) });
    page.drawText('has successfully completed', { x: 55, y: height - 270, size: 14, font, color: rgb(0.25, 0.25, 0.25) });

    page.drawText(courseTitle, { x: 55, y: height - 310, size: 20, font: bold, color: rgb(0.12, 0.12, 0.12) });
    page.drawText(`Module: ${moduleTitle}`, { x: 55, y: height - 340, size: 14, font, color: rgb(0.25, 0.25, 0.25) });

    // Footer / verification
    const issued = fmtDate(cert.issuedAt);
    page.drawText(`Issued: ${issued}`, { x: 55, y: 90, size: 12, font, color: rgb(0.25, 0.25, 0.25) });
    page.drawText(`Verification code: ${cert.code}`, { x: 55, y: 70, size: 12, font: bold, color: rgb(0.12, 0.12, 0.12) });
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
    const verifyLine = site ? `Verify at: ${site}/verify/${cert.code}` : `Verify at: /verify/${cert.code}`;
    page.drawText(verifyLine, { x: 55, y: 50, size: 12, font, color: rgb(0.25, 0.25, 0.25) });

    // Signature placeholder
    page.drawLine({ start: { x: width - 300, y: 95 }, end: { x: width - 60, y: 95 }, thickness: 1, color: rgb(0.25, 0.25, 0.25) });
    page.drawText('Authorized Signature', { x: width - 235, y: 75, size: 11, font, color: rgb(0.25, 0.25, 0.25) });

    const bytes = await pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="AdharaEdu-Certificate-${cert.code}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

