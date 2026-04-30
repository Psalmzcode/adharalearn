'use client';
import { useRouter } from 'next/navigation';
export default function NotFound() {
  const router = useRouter();
  return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',padding:24,background:'var(--bg)',fontFamily:'var(--font-body)' }}>
      <div>
        <div style={{ fontFamily:'var(--font-display)',fontWeight:900,lineHeight:1,marginBottom:16,fontSize:'clamp(80px,18vw,160px)',background:'linear-gradient(135deg,var(--gold),var(--teal))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>404</div>
        <h2 style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:24,color:'var(--text)',marginBottom:12 }}>Page not found</h2>
        <p style={{ color:'var(--muted)',marginBottom:32,maxWidth:360,margin:'0 auto 32px' }}>This page doesn't exist or has been moved.</p>
        <div style={{ display:'flex',gap:12,justifyContent:'center' }}>
          <button className="btn btn-gold" onClick={()=>router.push('/')}>← Homepage</button>
          <button className="btn btn-ghost" onClick={()=>router.push('/login')}>Sign In</button>
        </div>
      </div>
    </div>
  );
}
