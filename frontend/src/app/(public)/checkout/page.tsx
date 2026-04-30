'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function CheckoutInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const msg = sp.get('msg');
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: 64, fontFamily: 'var(--font-body)' }}>
      <div className="section-inner" style={{ paddingTop: 64, maxWidth: 720 }}>
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color: 'var(--text)', marginBottom: 10 }}>
            Checkout
          </div>
          <div style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 18 }}>
            {msg ?? 'Redirecting you to payment…'}
          </div>
          <button className="btn btn-ghost" onClick={() => router.push('/learn')}>Back to courses</button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ background: 'var(--bg)', minHeight: '100vh' }} />}>
      <CheckoutInner />
    </Suspense>
  );
}

