'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { alumniApi } from '@/lib/api';
import { Avatar, PageLoader, EmptyState } from '@/components/ui';

function BootcampLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 50" height="40" width="200">
      <rect x="1" y="4" width="38" height="40" rx="12" ry="14" fill="#1E7FD4"/>
      <polygon points="20,10 23.5,18.5 33,18.5 25.5,24 28.5,33 20,27.5 11.5,33 14.5,24 7,18.5 16.5,18.5" fill="#F5C518"/>
      <text x="46" y="33" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="26" fill="#F2F4F8">Adhara</text>
      <text x="153" y="14" fontFamily="Arial, sans-serif" fontWeight="700" fontStyle="italic" fontSize="12" fill="#1E7FD4">Edu</text>
      <text x="46" y="46" fontFamily="Georgia, serif" fontStyle="italic" fontSize="9.5" fill="#A0B9DC" letterSpacing="0.3">Alumni</text>
    </svg>
  );
}

export default function AlumniPage() {
  const [filter, setFilter] = useState<'all' | 'hireable'>('all');
  const [trackFilter, setTrackFilter] = useState('');

  const { data: alumni = [], isLoading } = useQuery({
    queryKey: ['alumni-public', filter, trackFilter],
    queryFn: () => alumniApi.list({ hireable: filter === 'hireable' || undefined, track: trackFilter || undefined }),
  });

  const tracks = Array.from(new Set((alumni as any[]).map((a: any) => a.cohort?.track?.slug).filter(Boolean)));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-body)' }}>
      <div className="orb" style={{ width:400, height:400, background:'var(--teal)', top:-150, right:-100 }} />
      <div className="grid-bg" />

      <header style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 48px', borderBottom:'1px solid var(--border)', background:'rgba(6,10,18,0.8)', backdropFilter:'blur(12px)' }}>
        <BootcampLogo />
        <nav style={{ display:'flex', gap:24, fontSize:13, fontWeight:700 }}>
          <a href="/" style={{ color:'var(--muted)', textDecoration:'none' }}>Home</a>
          <a href="/courses" style={{ color:'var(--muted)', textDecoration:'none' }}>Courses</a>
          <a href="/jobs" style={{ color:'var(--muted)', textDecoration:'none' }}>Jobs</a>
          <a href="/alumni" style={{ color:'var(--text)', textDecoration:'none' }}>Alumni</a>
        </nav>
      </header>

      <div style={{ position:'relative', zIndex:2, maxWidth:1100, margin:'0 auto', padding:'60px 24px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:11, color:'var(--teal)', fontWeight:700, fontFamily:'var(--font-mono)', letterSpacing:'0.12em', marginBottom:12, textTransform:'uppercase' }}>Our Graduates</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:44, color:'var(--text)', marginBottom:12, lineHeight:1.1 }}>Alumni Network</h1>
          <p style={{ color:'var(--muted)', fontSize:15, maxWidth:480, margin:'0 auto' }}>
            AdharaEdu graduates working at companies across Nigeria and beyond.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:12, marginBottom:32, flexWrap:'wrap', justifyContent:'center' }}>
          <div style={{ display:'flex', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:100, padding:4 }}>
            {(['all','hireable'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding:'6px 16px', borderRadius:100, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'var(--font-display)', background:filter===f?'var(--gold)':'transparent', color:filter===f?'#060A12':'var(--muted)', transition:'all 0.15s' }}>
                {f === 'all' ? 'All Graduates' : '💼 Open to Work'}
              </button>
            ))}
          </div>
          {tracks.length > 0 && (
            <select value={trackFilter} onChange={e => setTrackFilter(e.target.value)} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:100, padding:'6px 16px', color:'var(--text)', fontSize:12, fontWeight:700, fontFamily:'var(--font-display)' }}>
              <option value="">All Tracks</option>
              {tracks.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        {isLoading ? <PageLoader /> : (alumni as any[]).length === 0 ? (
          <EmptyState icon="🎓" title="No alumni found" message="Check back as more cohorts graduate." />
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:18 }}>
            {(alumni as any[]).map((a: any) => (
              <div key={a.id} style={{ padding:24, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', transition:'border-color 0.15s' }}>
                <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:14 }}>
                  <Avatar name={`${a.user.firstName} ${a.user.lastName}`} url={a.user.avatarUrl} size={48} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:3 }}>{a.user.firstName} {a.user.lastName}</div>
                    {a.jobTitle && <div style={{ fontSize:12, color:'var(--muted)', marginBottom:6 }}>{a.jobTitle}{a.company && ` @ ${a.company}`}</div>}
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, fontWeight:700, background:'rgba(0,212,170,0.12)', color:'var(--teal)', padding:'2px 8px', borderRadius:20 }}>{a.trackName}</span>
                      {a.isHireable && <span style={{ fontSize:10, fontWeight:700, background:'rgba(240,165,0,0.12)', color:'var(--gold)', padding:'2px 8px', borderRadius:20 }}>Open to Work</span>}
                    </div>
                  </div>
                </div>
                {a.bio && <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6, marginBottom:14, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{a.bio}</div>}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {a.portfolioUrl && <a href={a.portfolioUrl} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm">Portfolio ↗</a>}
                  {a.githubUrl && <a href={a.githubUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">GitHub</a>}
                  {a.linkedInUrl && <a href={a.linkedInUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">LinkedIn</a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
