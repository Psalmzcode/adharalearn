'use client';
import { useRouter } from 'next/navigation';

export default function ApplyPage() {
  const router = useRouter();

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: 64, fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-mono)', cursor: 'pointer', marginBottom: 24 }}>
          ← Back
        </button>
        <div className="card" style={{ padding: 28 }}>
          <div className="badge badge-soon" style={{ marginBottom: 10 }}>Cohort Service</div>
          <h1 style={{ fontSize: 32, marginBottom: 8, fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--text)' }}>
            Cohort Enrollment Coming Soon
          </h1>
          <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 14, lineHeight: 1.7 }}>
            We are launching with Adhara Learn first. Learn at your own pace. Start today. Cohort classes will open when live backend hosting is ready.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-gold" onClick={() => router.push('/learn')}>
              Go to Adhara Learn →
            </button>
            <button className="btn btn-ghost" onClick={() => router.push('/courses')}>
              View Cohort Tracks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
