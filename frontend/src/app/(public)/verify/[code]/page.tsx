'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

export default function VerifyCertificatePage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const { data, isLoading } = useQuery({
    queryKey: ['verify-cert', code],
    queryFn: async () => {
      const res = await fetch(`/api/v1/certificates/verify/${code}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    enabled: !!code,
    retry: false,
  });

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: 64, fontFamily: 'var(--font-body)' }}>
      <div className="section-inner" style={{ paddingTop: 64, maxWidth: 820 }}>
        <div className="section-label">Certificate Verification</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px,4vw,44px)', color: 'var(--text)', marginBottom: 10 }}>
          Verify Certificate
        </h1>

        <div className="card">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            Code: <strong style={{ color: 'var(--text)' }}>{code}</strong>
          </div>

          {isLoading ? (
            <div style={{ color: 'var(--muted)' }}>Checking…</div>
          ) : !data ? (
            <div style={{ color: 'var(--muted)' }}>Not found.</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <span className="badge badge-open">Valid</span>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Issued: {new Date(data.issuedAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--text)' }}>
                {data.studentName}
              </div>
              <div style={{ color: 'var(--muted)', marginTop: 6 }}>
                {data.courseTitle} — <strong>{data.moduleTitle}</strong>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

