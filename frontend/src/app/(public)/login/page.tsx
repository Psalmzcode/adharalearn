'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

function BootcampLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 50" height="44" width="220">
      <rect x="1" y="4" width="38" height="40" rx="12" ry="14" fill="#1E7FD4"/>
      <polygon points="20,10 23.5,18.5 33,18.5 25.5,24 28.5,33 20,27.5 11.5,33 14.5,24 7,18.5 16.5,18.5" fill="#F5C518"/>
      <text x="46" y="33" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="26" fill="#F2F4F8">Adhara</text>
      <text x="153" y="14" fontFamily="Arial, sans-serif" fontWeight="700" fontStyle="italic" fontSize="12" fill="#1E7FD4">Edu</text>
      <text x="46" y="46" fontFamily="Georgia, serif" fontStyle="italic" fontSize="9.5" fill="#A0B9DC" letterSpacing="0.3">Bootcamp</text>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      toast.success('Welcome back!');
      if (user && (user as any).emailVerified === false) {
        router.push('/verify-email');
        return;
      }
      if (user?.role === 'ADMIN') router.push('/admin');
      else if (user?.role === 'FACILITATOR') router.push('/facilitator');
      else router.push('/learner');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Invalid email or password';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '80px 24px', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>
      <div className="orb" style={{ width: 500, height: 500, background: 'var(--teal)', top: -200, right: -150 }} />
      <div className="orb" style={{ width: 400, height: 400, background: 'var(--gold)', bottom: -150, left: -100 }} />
      <div className="grid-bg" />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><BootcampLogo /></div>
          <h2 style={{ fontSize: 26, marginBottom: 6, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text)' }}>Welcome back</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Sign in with your learner, facilitator, or admin account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div className="field">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div className="field">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              Password
              <a style={{ color: 'var(--gold)', fontSize: 12, cursor: 'pointer' }}>Forgot?</a>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: 44 }}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16 }}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-gold"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 20 }}>
          New here?{' '}
          <a style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 700 }} onClick={() => router.push('/signup')}>
            Create Adhara Learn account →
          </a>
        </p>
      </div>
    </div>
  );
}
