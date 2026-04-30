import { Resend } from 'resend';
import crypto from 'crypto';
import { otpEmailTemplate } from '@/lib/email-templates';

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`MISSING_ENV:${name}`);
  return v;
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://learn.adharaedu.com').replace(/\/+$/, '');
}

export async function sendOtpEmail(opts: { to: string; firstName?: string; code: string }) {
  const resend = new Resend(env('RESEND_API_KEY'));
  const from = env('RESEND_FROM');
  const tpl = otpEmailTemplate({ code: opts.code, firstName: opts.firstName, toEmail: opts.to, appUrl: getAppUrl() });
  await resend.emails.send({
    from,
    to: opts.to,
    subject: tpl.subject,
    html: tpl.html,
  });
}

export function hashOtp(opts: { userId: string; code: string; purpose: string }) {
  const secret = process.env.JWT_ACCESS_SECRET || 'adhara_email_otp_secret';
  return crypto
    .createHash('sha256')
    .update(`${opts.purpose}:${opts.userId}:${opts.code}:${secret}`)
    .digest('hex');
}

export function generateOtpCode() {
  // 6-digit numeric code
  return String(Math.floor(100000 + Math.random() * 900000));
}

