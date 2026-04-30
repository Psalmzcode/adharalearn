'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { coursesApi } from '@/lib/api';
import { learnPricingSummary, type PublicCourseListItem } from '@/lib/learn-pricing';

const COHORT_TRACKS = [
  { badge:'badge-web', icon:'💻', title:'Full-Stack Web Development', level:'Cohort 4 · Target April 2026', price:'₦85,000', duration:'12 Weeks', spots:23, modules:['HTML & CSS Mastery','JavaScript & React','Node.js & Express','MongoDB & Databases','Full-Stack Project'], desc:'From zero to deploying a full-stack web application. Build 3 portfolio projects used in real job applications.', color:'#3B82F6', trackBadge:'badge-web' },
  { badge:'badge-data', icon:'📊', title:'Data Analytics with Python', level:'Cohort 4 · Target April 2026', price:'₦75,000', duration:'10 Weeks', spots:14, modules:['Python Fundamentals','Pandas & NumPy','SQL & Databases','Data Visualisation','Capstone Project'], desc:'Master data analysis with Python, SQL, and visualisation tools. Build dashboards and analytics reports.', color:'var(--teal)', trackBadge:'badge-data' },
  { badge:'badge-ai', icon:'🤖', title:'AI & Machine Learning', level:'Cohort 5 · July 2026', price:'₦95,000', duration:'12 Weeks', spots:0, modules:['Python for ML','Scikit-learn','Neural Networks','NLP Basics','AI Project'], desc:'Machine learning fundamentals with Python. Train models, build AI applications, and understand the future of tech.', color:'#8B5CF6', trackBadge:'badge-ai' },
];

export default function CoursesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'cohort' | 'learn'>('cohort');

  const { data: learnCourses = [], isLoading } = useQuery({
    queryKey: ['courses-public'],
    queryFn: () => coursesApi.listPublic() as Promise<PublicCourseListItem[]>,
    staleTime: 60_000,
  });

  const tabBtn = (active: boolean) => ({
    padding: '12px 20px',
    borderRadius: 10,
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
    background: active ? 'rgba(240,165,0,0.12)' : 'var(--surface2)',
    color: active ? 'var(--gold)' : 'var(--muted)',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  } as const);

  return (
    <div style={{ background:'var(--bg)',minHeight:'100vh',paddingTop:64,fontFamily:'var(--font-body)' }}>
      <div className="section-inner" style={{ paddingTop:64 }}>
        <button onClick={()=>router.push('/')} style={{ background:'none',border:'none',color:'var(--muted)',fontSize:13,fontFamily:'var(--font-mono)',cursor:'pointer',marginBottom:16 }}>← Back to Home</button>
        <div className="section-label">Programs</div>
        <h1 style={{ fontSize:'clamp(28px,4vw,44px)',marginBottom:8,fontFamily:'var(--font-display)',fontWeight:900,color:'var(--text)' }}>
          Choose Your Track · <span style={{ color:'var(--gold)' }}>Cohort coming soon</span>
        </h1>
        <p style={{ color:'var(--muted)',marginBottom:14,maxWidth:640,lineHeight:1.65 }}>Live cohort tracks below — enrollment opening after our next intake. Self-paced paid courses are on Adhara Learn today.</p>
        <div className="badge badge-soon" style={{ marginBottom: 18 }}>Cohort enrollment coming soon</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:22 }}>
          {['Student','School Leaver','NYSC','Job Seeker','Career Switcher'].map((t) => (
            <span key={t} className="badge" style={{ fontSize:11 }}>{t}</span>
          ))}
        </div>

        <div style={{ display:'flex',gap:10,marginBottom:28,flexWrap:'wrap' }}>
          <button type="button" style={tabBtn(tab === 'cohort')} onClick={() => setTab('cohort')}>Live cohort tracks</button>
          <button type="button" style={tabBtn(tab === 'learn')} onClick={() => setTab('learn')}>Adhara Learn (paid courses)</button>
        </div>

        {tab === 'cohort' ? (
          <>
            <div style={{ display:'flex',gap:10,flexWrap:'wrap',marginBottom:28 }}>
              {['All Tracks','💻 Web Dev','📊 Data Analytics','🤖 AI / ML','● Planned'].map(f=>(
                <button key={f} type="button" className="btn btn-ghost btn-sm" style={{ borderColor:f==='All Tracks'?'var(--gold)':'var(--border)',color:f==='All Tracks'?'var(--gold)':'var(--muted)' }}>{f}</button>
              ))}
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:24,marginBottom:64 }}>
              {COHORT_TRACKS.map((c,i)=>(
                <div key={i} className="card" style={{ borderLeft:`3px solid ${c.color}`,padding:32 }}>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:32,alignItems:'start' }}>
                    <div>
                      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap' }}>
                        <span className={`badge ${c.badge}`}>{c.icon} {c.title.split(' ')[0]}</span>
                        <span className={`badge ${c.spots>0?'badge-open':'badge-full'}`}>{c.spots>0?`● Planned — ${c.spots} spots`:'Coming July 2026'}</span>
                      </div>
                      <h3 style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:24,color:'var(--text)',marginBottom:8 }}>{c.title}</h3>
                      <p style={{ fontSize:14,color:'var(--muted)',marginBottom:20,lineHeight:1.7,maxWidth:600 }}>{c.desc}</p>
                      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20 }}>
                        {[{lbl:'DURATION',val:c.duration},{lbl:'FORMAT',val:'Online + Live'},{lbl:'FEE',val:c.price}].map(m=>(
                          <div key={m.lbl} style={{ padding:14,background:'var(--surface2)',borderRadius:'var(--radius)' }}>
                            <div style={{ fontSize:11,color:'var(--muted)',fontFamily:'var(--font-mono)',marginBottom:4 }}>{m.lbl}</div>
                            <div style={{ fontWeight:700,fontSize:15,color:'var(--text)' }}>{m.val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                        {c.modules.map(m=><span key={m} className="badge" style={{ fontSize:11 }}>{m}</span>)}
                      </div>
                    </div>
                    <div style={{ minWidth:160,textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,color:'var(--text)',marginBottom:4 }}>{c.price}</div>
                      <div style={{ fontSize:12,color:'var(--muted)',marginBottom:16 }}>or 2 instalments (when open)</div>
                      <button className="btn btn-outline" style={{ width:'100%',justifyContent:'center',marginBottom:8 }} onClick={()=>router.push('/apply')}>Cohort enrollment — Coming soon</button>
                      <button className="btn btn-ghost" style={{ width:'100%',justifyContent:'center',fontSize:12 }} onClick={()=>setTab('learn')}>Browse Adhara Learn →</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 64 }}>
            <p style={{ color:'var(--muted)',fontSize:14,marginBottom:20,maxWidth:640,lineHeight:1.7 }}>
              Pay for the <strong>full track</strong>, a <strong>bundle</strong>, or <strong>single modules</strong>. Open a course for outlines and checkout.
            </p>
            {isLoading ? (
              <div className="card">Loading courses…</div>
            ) : learnCourses.length === 0 ? (
              <div className="card">No published courses yet.</div>
            ) : (
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))',gap:16 }}>
                {learnCourses.map((course) => (
                  <div
                    key={course.slug}
                    className="card"
                    style={{ cursor:'pointer',display:'flex',flexDirection:'column',minHeight:200 }}
                    onClick={() => router.push(`/learn/${course.slug}`)}
                  >
                    <span className="badge badge-open" style={{ alignSelf:'flex-start',marginBottom:10 }}>ADHARA LEARN</span>
                    <h3 style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:18,color:'var(--text)',marginBottom:8 }}>{course.title}</h3>
                    <p style={{ fontSize:13,color:'var(--muted)',lineHeight:1.65,marginBottom:14,flex:1 }}>{course.description ?? '—'}</p>
                    <div style={{ display:'flex',flexDirection:'column',gap:6,fontSize:12,fontFamily:'var(--font-mono)' }}>
                      {learnPricingSummary(course).map((line, idx) => (
                        <div key={idx} style={{ color:'var(--text)' }}>{line}</div>
                      ))}
                    </div>
                    <div style={{ marginTop:14,fontSize:12,color:'var(--gold)',fontWeight:700 }}>View details →</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
