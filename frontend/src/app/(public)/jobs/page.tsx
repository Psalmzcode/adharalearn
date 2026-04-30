'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api';
import { PageLoader, EmptyState } from '@/components/ui';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

function BootcampLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 50" height="40" width="200">
      <rect x="1" y="4" width="38" height="40" rx="12" ry="14" fill="#1E7FD4"/>
      <polygon points="20,10 23.5,18.5 33,18.5 25.5,24 28.5,33 20,27.5 11.5,33 14.5,24 7,18.5 16.5,18.5" fill="#F5C518"/>
      <text x="46" y="33" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="26" fill="#F2F4F8">Adhara</text>
      <text x="153" y="14" fontFamily="Arial, sans-serif" fontWeight="700" fontStyle="italic" fontSize="12" fill="#1E7FD4">Edu</text>
      <text x="46" y="46" fontFamily="Georgia, serif" fontStyle="italic" fontSize="9.5" fill="#A0B9DC" letterSpacing="0.3">Jobs</text>
    </svg>
  );
}

export default function JobsPage() {
  const [typeFilter, setTypeFilter] = useState('');

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs-public'],
    queryFn: () => jobsApi.list(),
  });

  const filtered = typeFilter ? (jobs as any[]).filter((j: any) => j.type === typeFilter) : (jobs as any[]);
  const typeCounts = { REMOTE: 0, HYBRID: 0, ONSITE: 0 };
  (jobs as any[]).forEach((j: any) => { if (typeCounts[j.type as keyof typeof typeCounts] !== undefined) typeCounts[j.type as keyof typeof typeCounts]++; });

  const typeColor: Record<string, string> = { REMOTE: 'var(--teal)', HYBRID: 'var(--gold)', ONSITE: '#3B82F6' };
  const typeBg: Record<string, string> = { REMOTE: 'rgba(0,212,170,0.1)', HYBRID: 'rgba(240,165,0,0.1)', ONSITE: 'rgba(59,130,246,0.1)' };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', fontFamily:'var(--font-body)' }}>
      <div className="orb" style={{ width:400, height:400, background:'var(--gold)', top:-150, left:-100 }} />
      <div className="grid-bg" />

      <header style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 48px', borderBottom:'1px solid var(--border)', background:'rgba(6,10,18,0.8)', backdropFilter:'blur(12px)' }}>
        <BootcampLogo />
        <nav style={{ display:'flex', gap:24, fontSize:13, fontWeight:700 }}>
          <a href="/" style={{ color:'var(--muted)', textDecoration:'none' }}>Home</a>
          <a href="/courses" style={{ color:'var(--muted)', textDecoration:'none' }}>Courses</a>
          <a href="/jobs" style={{ color:'var(--text)', textDecoration:'none' }}>Jobs</a>
          <a href="/alumni" style={{ color:'var(--muted)', textDecoration:'none' }}>Alumni</a>
        </nav>
      </header>

      <div style={{ position:'relative', zIndex:2, maxWidth:900, margin:'0 auto', padding:'60px 24px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:11, color:'var(--gold)', fontWeight:700, fontFamily:'var(--font-mono)', letterSpacing:'0.12em', marginBottom:12, textTransform:'uppercase' }}>For Our Graduates</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:44, color:'var(--text)', marginBottom:12 }}>Job Opportunities</h1>
          <p style={{ color:'var(--muted)', fontSize:15, maxWidth:440, margin:'0 auto' }}>
            Curated roles from our hiring partners, matched to AdharaEdu graduates.
          </p>
        </div>

        {/* Type filter pills */}
        <div style={{ display:'flex', gap:10, marginBottom:32, flexWrap:'wrap', justifyContent:'center' }}>
          <button onClick={() => setTypeFilter('')} style={{ padding:'6px 16px', borderRadius:100, border:`1px solid ${!typeFilter?'var(--gold)':'var(--border)'}`, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'var(--font-display)', background:!typeFilter?'rgba(240,165,0,0.1)':'transparent', color:!typeFilter?'var(--gold)':'var(--muted)' }}>
            All ({(jobs as any[]).length})
          </button>
          {Object.entries(typeCounts).map(([type, count]) => count > 0 && (
            <button key={type} onClick={() => setTypeFilter(t => t === type ? '' : type)} style={{ padding:'6px 16px', borderRadius:100, border:`1px solid ${typeFilter===type?typeColor[type]:'var(--border)'}`, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'var(--font-display)', background:typeFilter===type?typeBg[type]:'transparent', color:typeFilter===type?typeColor[type]:'var(--muted)' }}>
              {type} ({count})
            </button>
          ))}
        </div>

        {isLoading ? <PageLoader /> : filtered.length === 0 ? (
          <EmptyState icon="💼" title="No jobs posted yet" message="Check back soon — we add new opportunities regularly." />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {filtered.map((j: any) => (
              <div key={j.id} style={{ padding:24, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:20, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:240 }}>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8, flexWrap:'wrap' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, color:'var(--text)' }}>{j.title}</div>
                    <span style={{ fontSize:11, fontWeight:700, background:typeBg[j.type]??'var(--surface2)', color:typeColor[j.type]??'var(--muted)', padding:'3px 10px', borderRadius:20, flexShrink:0 }}>{j.type}</span>
                  </div>
                  <div style={{ fontSize:13, color:'var(--muted)', marginBottom:10 }}>
                    <strong style={{ color:'var(--text)' }}>{j.company}</strong> · {j.location}
                    {j.salary && <span style={{ color:'var(--gold)', fontWeight:700, marginLeft:8 }}>{j.salary}</span>}
                  </div>
                  <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:12, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{j.description}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {(j.skills ?? []).map((s: string) => <span key={s} style={{ fontSize:10, fontWeight:700, background:'rgba(0,212,170,0.08)', color:'var(--teal)', padding:'2px 8px', borderRadius:20 }}>{s}</span>)}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end', flexShrink:0 }}>
                  <a href={j.applyUrl} target="_blank" rel="noreferrer" className="btn btn-gold">Apply Now →</a>
                  <div style={{ fontSize:11, color:'var(--muted)', textAlign:'right' }}>Posted {dayjs(j.postedAt).fromNow()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
