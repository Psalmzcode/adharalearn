'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loadMe, setUser } = useAuthStore();
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    // Ensure we have a user loaded after signup/login refresh
    if (!user) loadMe().catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.emailVerified) router.push('/learn');
  }, [user?.emailVerified]);

  const requestCode = async () => {
    setSending(true);
    try {
      await authApi.requestEmailOtp();
      toast.success('Verification code sent.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to send code');
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    setVerifying(true);
    try {
      const res = await authApi.verifyEmailOtp(code);
      if (res.user) setUser(res.user);
      toast.success('Email verified!');
      router.push('/learn');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '96px 20px', background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 520 }}>
        <div className="section-label">Verify Email</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, marginTop: 10 }}>
          Enter the 6‑digit code
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginTop: 8 }}>
          We sent a verification code to <strong style={{ color: 'var(--text)' }}>{user?.email ?? 'your email'}</strong>.
        </div>

        <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
          <div className="field">
            <label>OTP code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '.3em', fontWeight: 800, fontSize: 18, textAlign: 'center' }}
            />
          </div>
          <button className="btn btn-gold" style={{ justifyContent: 'center' }} disabled={verifying || code.length !== 6} onClick={verify}>
            {verifying ? 'Verifying…' : 'Verify email →'}
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'center' }} disabled={sending} onClick={requestCode}>
            {sending ? 'Sending…' : 'Resend code'}
          </button>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
            Didn’t get it? Check spam/junk, or try resending after a minute.
          </div>
        </div>
      </div>
    </div>
  );
}

