'use client';

import { useMemo, useState } from 'react';
import {
  completionEmailTemplate,
  otpEmailTemplate,
  passwordResetEmailTemplate,
  purchaseReceiptEmailTemplate,
  supportTicketCreatedEmailTemplate,
  supportTicketReplyEmailTemplate,
  welcomeEmailTemplate,
} from '@/lib/email-templates';

export default function EmailPreviewPage() {
  const [active, setActive] = useState<
    'otp' | 'welcome' | 'reset' | 'receipt' | 'ticketCreated' | 'ticketReply' | 'completion'
  >('otp');

  const appUrl = 'https://learn.adharaedu.com';
  const toEmail = 'learner@example.com';

  const templates = useMemo(() => {
    const otp = otpEmailTemplate({ code: '123456', firstName: 'Samuel', toEmail, appUrl });
    const welcome = welcomeEmailTemplate({ firstName: 'Samuel', toEmail, appUrl });
    const reset = passwordResetEmailTemplate({
      firstName: 'Samuel',
      toEmail,
      appUrl,
      resetUrl: `${appUrl}/reset-password?token=demo`,
      expiresMins: 30,
    });
    const receipt = purchaseReceiptEmailTemplate({
      firstName: 'Samuel',
      toEmail,
      appUrl,
      itemName: 'Web Development Track (Bundle)',
      amount: '₦40,000',
      reference: 'PSK_demo_123',
      viewUrl: `${appUrl}/learner`,
    });
    const ticketCreated = supportTicketCreatedEmailTemplate({
      firstName: 'Samuel',
      toEmail,
      appUrl,
      subject: 'I’m stuck on flexbox alignment',
      ticketId: 'TCK-1024',
      viewUrl: `${appUrl}/learner`,
    });
    const ticketReply = supportTicketReplyEmailTemplate({
      firstName: 'Samuel',
      toEmail,
      appUrl,
      subject: 'I’m stuck on flexbox alignment',
      reply: 'Try setting `align-items: center` on the parent, and ensure the container has a defined height.\n\nIf you share your HTML/CSS, I’ll point out the exact line.',
      viewUrl: `${appUrl}/learner`,
    });
    const completion = completionEmailTemplate({
      firstName: 'Samuel',
      toEmail,
      appUrl,
      moduleTitle: 'HTML & CSS Foundations',
      certificateUrl: `${appUrl}/certificates/demo.pdf`,
    });

    return {
      otp,
      welcome,
      reset,
      receipt,
      ticketCreated,
      ticketReply,
      completion,
    };
  }, []);

  const navBtn = (k: string) => ({
    padding: '10px 12px',
    borderRadius: 12,
    border: `1px solid ${active === k ? 'rgba(240,165,0,0.35)' : 'var(--border)'}`,
    background: active === k ? 'rgba(240,165,0,0.10)' : 'var(--surface2)',
    color: active === k ? 'var(--gold)' : 'var(--muted)',
    fontWeight: 800,
    fontSize: 12,
    cursor: 'pointer',
  } as const);

  const selected = (templates as any)[active];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: 64 }}>
      <div className="section-inner" style={{ paddingTop: 32 }}>
        <div className="section-label">Email preview</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, marginTop: 10 }}>
          Templates (browser preview)
        </div>
        <div style={{ color: 'var(--muted)', marginTop: 8, lineHeight: 1.7, maxWidth: 720 }}>
          This page is for design review. It renders each email template inside an iframe using demo data.
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <button style={navBtn('otp')} onClick={() => setActive('otp')}>OTP</button>
          <button style={navBtn('welcome')} onClick={() => setActive('welcome')}>Welcome</button>
          <button style={navBtn('reset')} onClick={() => setActive('reset')}>Password reset</button>
          <button style={navBtn('receipt')} onClick={() => setActive('receipt')}>Receipt</button>
          <button style={navBtn('ticketCreated')} onClick={() => setActive('ticketCreated')}>Ticket created</button>
          <button style={navBtn('ticketReply')} onClick={() => setActive('ticketReply')}>Ticket reply</button>
          <button style={navBtn('completion')} onClick={() => setActive('completion')}>Completion</button>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
              Subject: <span style={{ color: 'var(--text)' }}>{selected?.subject}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
              Logo path: <span style={{ color: 'var(--text)' }}>/images/brand/email-logo.png</span>
            </div>
          </div>
          <div style={{ marginTop: 12, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <iframe
              title="Email preview"
              style={{ width: '100%', height: 760, border: 'none', background: '#060A12' }}
              srcDoc={selected?.html ?? '<div />'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

