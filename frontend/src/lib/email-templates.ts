function escapeHtml(s: string) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c] || c);
}

function baseEmail(opts: {
  title: string;
  preheader?: string;
  toEmail: string;
  appUrl: string;
  bodyHtml: string;
  footerHint?: string;
  badge?: string;
}) {
  const appUrl = opts.appUrl.replace(/\/+$/, '');
  const logoUrl = `${appUrl}/images/brand/email-logo.png`;
  const supportUrl = `${appUrl}/support`;
  const preheader = opts.preheader ? escapeHtml(opts.preheader) : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(opts.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#060A12;color:#F2F4F8;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial;">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div>` : ''}
    <div style="padding:28px 14px;">
      <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:18px;overflow:hidden;background:linear-gradient(135deg,rgba(240,165,0,0.10),rgba(0,212,170,0.06))">
        <div style="padding:22px 22px 0;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:10px;">
              <img src="${logoUrl}" alt="AdharaEdu" width="132" style="display:block;max-width:132px;height:auto" />
              <div style="font-weight:800;letter-spacing:.02em;font-size:14px;color:#F2F4F8;">Adhara Learn</div>
            </div>
            <div style="font-size:12px;color:rgba(160,185,220,0.75)">${escapeHtml(opts.badge ?? '')}</div>
          </div>
        </div>

        <div style="padding:22px;">
          <div style="font-size:22px;font-weight:900;line-height:1.1;margin:10px 0 12px;">${escapeHtml(opts.title)}</div>
          ${opts.bodyHtml}

          <div style="margin-top:18px;border-top:1px solid rgba(255,255,255,0.08);padding-top:14px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12px;color:rgba(160,185,220,0.7);">
            <div>Need help? <a href="${supportUrl}" style="color:#00D4AA;text-decoration:none;font-weight:700;">Contact support</a></div>
            <div style="opacity:.9">© ${new Date().getFullYear()} AdharaEdu</div>
          </div>
        </div>
      </div>

      <div style="max-width:640px;margin:10px auto 0;color:rgba(160,185,220,0.55);font-size:11px;line-height:1.6;">
        ${opts.footerHint ? escapeHtml(opts.footerHint) + '<br/>' : ''}This message was sent to ${escapeHtml(opts.toEmail)}.
      </div>
    </div>
  </body>
</html>`;
}

function pill(label: string, color: 'gold' | 'teal' | 'blue' | 'red' = 'gold') {
  const map: Record<string, { bg: string; fg: string; bd: string }> = {
    gold: { bg: 'rgba(240,165,0,0.12)', fg: '#F0A500', bd: 'rgba(240,165,0,0.24)' },
    teal: { bg: 'rgba(0,212,170,0.12)', fg: '#00D4AA', bd: 'rgba(0,212,170,0.24)' },
    blue: { bg: 'rgba(59,130,246,0.12)', fg: '#93C5FD', bd: 'rgba(59,130,246,0.24)' },
    red: { bg: 'rgba(255,77,77,0.12)', fg: '#FF4D4D', bd: 'rgba(255,77,77,0.24)' },
  };
  const c = map[color];
  return `<span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid ${c.bd};background:${c.bg};color:${c.fg};letter-spacing:.02em">${escapeHtml(label)}</span>`;
}

function ctaButton(url: string, label: string, variant: 'gold' | 'ghost' = 'gold') {
  const s =
    variant === 'gold'
      ? 'background:#F0A500;color:#060A12;box-shadow:0 8px 30px rgba(240,165,0,0.25);'
      : 'background:rgba(255,255,255,0.07);color:#F2F4F8;border:1px solid rgba(255,255,255,0.12);';
  return `<a href="${url}" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 20px;border-radius:999px;font-weight:900;font-size:13px;text-decoration:none;${s}">${escapeHtml(label)}</a>`;
}

export function otpEmailTemplate(opts: { code: string; firstName?: string; toEmail: string; appUrl: string }) {
  const body = `
    <div style="color:rgba(160,185,220,0.75);font-size:14px;line-height:1.7;">
      ${opts.firstName ? `Hi ${escapeHtml(opts.firstName)},` : 'Hi,'}
      <br/>Use the OTP below to verify <strong>${escapeHtml(opts.toEmail)}</strong>. This code expires in <strong>10 minutes</strong>.
    </div>
    <div style="margin:18px 0 14px;padding:16px;border-radius:16px;border:1px solid rgba(255,255,255,0.10);background:rgba(14,21,32,0.6);text-align:center;">
      <div style="font-size:12px;color:rgba(160,185,220,0.75);letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;">Your OTP</div>
      <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,JetBrains Mono,monospace;font-size:34px;font-weight:900;letter-spacing:.32em;color:#F0A500;">
        ${escapeHtml(opts.code)}
      </div>
    </div>
    <div style="font-size:12px;color:rgba(160,185,220,0.7);line-height:1.65;">
      If you didn’t request this, you can ignore this email.
    </div>
  `;
  return {
    subject: 'Your Adhara Learn verification code',
    html: baseEmail({
      title: 'Confirm it’s you',
      preheader: `Your OTP is ${opts.code}`,
      toEmail: opts.toEmail,
      appUrl: opts.appUrl,
      bodyHtml: body,
      badge: 'Verify email',
    }),
  };
}

export function welcomeEmailTemplate(opts: { firstName?: string; toEmail: string; appUrl: string }) {
  const url = `${opts.appUrl.replace(/\/+$/, '')}/learn`;
  const body = `
    <div style="color:rgba(160,185,220,0.75);font-size:14px;line-height:1.75;">
      ${opts.firstName ? `Hi ${escapeHtml(opts.firstName)},` : 'Hi,'}
      <br/>Welcome to <strong>Adhara Learn</strong>. Pick a career path and start building real projects — with support when you get stuck.
    </div>
    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
      ${ctaButton(url, 'Choose your path →', 'gold')}
      ${ctaButton(`${opts.appUrl.replace(/\/+$/, '')}/login`, 'Log in', 'ghost')}
    </div>
    <div style="margin-top:14px;display:grid;gap:10px;">
      <div style="padding:12px;border-radius:16px;border:1px solid rgba(255,255,255,0.10);background:rgba(14,21,32,0.6);">
        <div style="font-weight:900;margin-bottom:4px;">What you get</div>
        <div style="color:rgba(160,185,220,0.75);font-size:12px;line-height:1.7;">
          ${pill('Start free', 'teal')} ${pill('Pay per course', 'gold')} ${pill('Live help', 'blue')} ${pill('Projects', 'teal')}
        </div>
      </div>
    </div>
  `;
  return {
    subject: 'Welcome to Adhara Learn',
    html: baseEmail({ title: 'Welcome!', preheader: 'Your learning journey starts now.', toEmail: opts.toEmail, appUrl: opts.appUrl, bodyHtml: body, badge: 'Welcome' }),
  };
}

export function passwordResetEmailTemplate(opts: { firstName?: string; toEmail: string; appUrl: string; resetUrl: string; expiresMins?: number }) {
  const body = `
    <div style="color:rgba(160,185,220,0.75);font-size:14px;line-height:1.75;">
      ${opts.firstName ? `Hi ${escapeHtml(opts.firstName)},` : 'Hi,'}
      <br/>We received a request to reset your password. This link expires in <strong>${Number(opts.expiresMins ?? 30)} minutes</strong>.
    </div>
    <div style="margin-top:16px;">
      ${ctaButton(opts.resetUrl, 'Reset password →', 'gold')}
    </div>
    <div style="margin-top:14px;font-size:12px;color:rgba(160,185,220,0.7);line-height:1.65;">
      If you didn’t request this, you can ignore this email.
    </div>
  `;
  return {
    subject: 'Reset your Adhara Learn password',
    html: baseEmail({ title: 'Reset your password', preheader: 'Reset link inside.', toEmail: opts.toEmail, appUrl: opts.appUrl, bodyHtml: body, badge: 'Security' }),
  };
}

export function purchaseReceiptEmailTemplate(opts: { toEmail: string; firstName?: string; appUrl: string; itemName: string; amount: string; reference?: string; viewUrl?: string }) {
  const view = opts.viewUrl || `${opts.appUrl.replace(/\/+$/, '')}/learner`;
  const body = `
    <div style="color:rgba(160,185,220,0.75);font-size:14px;line-height:1.75;">
      ${opts.firstName ? `Hi ${escapeHtml(opts.firstName)},` : 'Hi,'}
      <br/>Payment received. You now have access to:
    </div>
    <div style="margin:14px 0 10px;padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,0.10);background:rgba(14,21,32,0.6);">
      <div style="font-weight:900;font-size:16px;margin-bottom:6px;">${escapeHtml(opts.itemName)}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        ${pill(escapeHtml(opts.amount), 'gold')}
        ${opts.reference ? pill(`Ref: ${escapeHtml(opts.reference)}`, 'blue') : ''}
      </div>
    </div>
    <div style="margin-top:10px;">${ctaButton(view, 'Go to My Courses →', 'gold')}</div>
  `;
  return {
    subject: 'Payment received — Adhara Learn',
    html: baseEmail({ title: 'Receipt', preheader: `Payment received for ${opts.itemName}`, toEmail: opts.toEmail, appUrl: opts.appUrl, bodyHtml: body, badge: 'Receipt' }),
  };
}

export function supportTicketCreatedEmailTemplate(opts: { toEmail: string; firstName?: string; appUrl: string; subject: string; ticketId?: string; viewUrl?: string }) {
  const view = opts.viewUrl || `${opts.appUrl.replace(/\/+$/, '')}/learner`;
  const body = `
    <div style="color:rgba(160,185,220,0.75);font-size:14px;line-height:1.75;">
      ${opts.firstName ? `Hi ${escapeHtml(opts.firstName)},` : 'Hi,'}
      <br/>We got your question. Our team will respond soon.
    </div>
    <div style="margin:14px 0 10px;padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,0.10);background:rgba(14,21,32,0.6);">
      <div style="font-weight:900;margin-bottom:6px;">${escapeHtml(opts.subject)}</div>
      <div style="font-size:12px;color:rgba(160,185,220,0.75);">
        ${opts.ticketId ? `Ticket ID: ${escapeHtml(opts.ticketId)}` : ''}
      </div>
    </div>
    <div style="margin-top:10px;">${ctaButton(view, 'View in dashboard →', 'ghost')}</div>
  `;
  return {
    subject: 'Support ticket received — Adhara Learn',
    html: baseEmail({ title: 'Ticket received', preheader: 'We got your question.', toEmail: opts.toEmail, appUrl: opts.appUrl, bodyHtml: body, badge: 'Support' }),
  };
}

export function supportTicketReplyEmailTemplate(opts: { toEmail: string; firstName?: string; appUrl: string; subject: string; reply: string; viewUrl?: string }) {
  const view = opts.viewUrl || `${opts.appUrl.replace(/\/+$/, '')}/learner`;
  const body = `
    <div style="color:rgba(160,185,220,0.75);font-size:14px;line-height:1.75;">
      ${opts.firstName ? `Hi ${escapeHtml(opts.firstName)},` : 'Hi,'}
      <br/>We replied to your question:
    </div>
    <div style="margin:14px 0 10px;padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,0.10);background:rgba(14,21,32,0.6);">
      <div style="font-weight:900;margin-bottom:6px;">${escapeHtml(opts.subject)}</div>
      <div style="font-size:13px;color:rgba(160,185,220,0.85);line-height:1.75;white-space:pre-wrap;">${escapeHtml(opts.reply)}</div>
    </div>
    <div style="margin-top:10px;">${ctaButton(view, 'Open dashboard →', 'gold')}</div>
  `;
  return {
    subject: 'Support reply — Adhara Learn',
    html: baseEmail({ title: 'We replied', preheader: 'Open to read the reply.', toEmail: opts.toEmail, appUrl: opts.appUrl, bodyHtml: body, badge: 'Support' }),
  };
}

export function completionEmailTemplate(opts: { toEmail: string; firstName?: string; appUrl: string; moduleTitle: string; certificateUrl?: string }) {
  const body = `
    <div style="color:rgba(160,185,220,0.75);font-size:14px;line-height:1.75;">
      ${opts.firstName ? `Hi ${escapeHtml(opts.firstName)},` : 'Hi,'}
      <br/>Congrats — you completed <strong>${escapeHtml(opts.moduleTitle)}</strong>.
    </div>
    <div style="margin:14px 0 10px;padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,0.10);background:rgba(14,21,32,0.6);display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;">
      <div>
        <div style="font-weight:900;margin-bottom:4px;">Module completed</div>
        <div style="font-size:12px;color:rgba(160,185,220,0.75);">Keep going — momentum is everything.</div>
      </div>
      <div>${pill('Completed', 'teal')}</div>
    </div>
    <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">
      ${opts.certificateUrl ? ctaButton(opts.certificateUrl, 'Download certificate →', 'gold') : ''}
      ${ctaButton(`${opts.appUrl.replace(/\/+$/, '')}/learner`, 'Continue learning', 'ghost')}
    </div>
  `;
  return {
    subject: 'Congrats — module completed!',
    html: baseEmail({ title: 'You did it!', preheader: `Completed: ${opts.moduleTitle}`, toEmail: opts.toEmail, appUrl: opts.appUrl, bodyHtml: body, badge: 'Milestone' }),
  };
}

