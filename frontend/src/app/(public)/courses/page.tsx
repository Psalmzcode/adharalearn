'use client';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { coursesApi } from '@/lib/api';
import type { PublicCourseListItem } from '@/lib/learn-pricing';
import { AdharaLearnTracksSection } from '@/components/public/AdharaLearnTracksSection';

const COHORT_TRACKS = [
  { badge:'badge-web', icon:'💻', title:'Full-Stack Web Development', level:'Cohort 4 · Target April 2026', price:'₦85,000', duration:'12 Weeks', spots:23, modules:['HTML & CSS Mastery','JavaScript & React','Node.js & Express','MongoDB & Databases','Full-Stack Project'], desc:'From zero to deploying a full-stack web application. Build 3 portfolio projects used in real job applications.', color:'#3B82F6', trackBadge:'badge-web' },
  { badge:'badge-data', icon:'📊', title:'Data Analytics with Python', level:'Cohort 4 · Target April 2026', price:'₦75,000', duration:'10 Weeks', spots:14, modules:['Python Fundamentals','Pandas & NumPy','SQL & Databases','Data Visualisation','Capstone Project'], desc:'Master data analysis with Python, SQL, and visualisation tools. Build dashboards and analytics reports.', color:'var(--teal)', trackBadge:'badge-data' },
  { badge:'badge-ai', icon:'🤖', title:'AI & Machine Learning', level:'Cohort 5 · July 2026', price:'₦95,000', duration:'12 Weeks', spots:0, modules:['Python for ML','Scikit-learn','Neural Networks','NLP Basics','AI Project'], desc:'Machine learning fundamentals with Python. Train models, build AI applications, and understand the future of tech.', color:'#8B5CF6', trackBadge:'badge-ai' },
];

export default function CoursesPage() {
  const router = useRouter();

  const { data: learnCourses = [], isLoading } = useQuery({
    queryKey: ['courses-public'],
    queryFn: () => coursesApi.listPublic() as Promise<PublicCourseListItem[]>,
    staleTime: 60_000,
  });

  return (
    <div style={{ background:'var(--bg)',minHeight:'100vh',paddingTop:64,fontFamily:'var(--font-body)' }}>
      <div className="section-inner" style={{ paddingTop: 24 }}>
        <button onClick={()=>router.push('/')} style={{ background:'none',border:'none',color:'var(--muted)',fontSize:13,fontFamily:'var(--font-mono)',cursor:'pointer',marginBottom:16 }}>← Back to Home</button>
      </div>

      <AdharaLearnTracksSection variant="courses" learnCourses={learnCourses} learnLoading={isLoading} />

      <div className="section-inner" style={{ paddingTop: 48, paddingBottom: 72 }}>
        <div className="section-label">Programs</div>
        <h2 style={{ fontSize:'clamp(28px,4vw,44px)',marginBottom:8,fontFamily:'var(--font-display)',fontWeight:900,color:'var(--text)',lineHeight:1.12 }}>
          Choose Your Track · <span style={{ color:'var(--gold)' }}>Cohort coming soon</span>
        </h2>
        <p style={{ color:'var(--muted)',marginBottom:14,maxWidth:640,lineHeight:1.65 }}>
          Start with Adhara Learn above, or explore live cohort plans here — enrollment opening after our next intake.
        </p>
        <div className="badge badge-soon" style={{ marginBottom: 18 }}>Cohort enrollment coming soon</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:22 }}>
          {['Student','School Leaver','NYSC','Job Seeker','Career Switcher'].map((t) => (
            <span key={t} className="badge" style={{ fontSize:11 }}>{t}</span>
          ))}
        </div>

        <div style={{ display:'flex',gap:10,flexWrap:'wrap',marginBottom:28 }}>
          {['All Tracks','💻 Web Dev','📊 Data Analytics','🤖 AI / ML','● Planned'].map(f=>(
            <button key={f} type="button" className="btn btn-ghost btn-sm" style={{ borderColor:f==='All Tracks'?'var(--gold)':'var(--border)',color:f==='All Tracks'?'var(--gold)':'var(--muted)' }}>{f}</button>
          ))}
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:24 }}>
          {COHORT_TRACKS.map((c,i)=>(
            <div key={i} className="card" style={{ borderLeft:`3px solid ${c.color}`,padding:32 }}>
              <div className="courses-cohort-layout">
                <div className="courses-cohort-main">
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap' }}>
                    <span className={`badge ${c.badge}`}>{c.icon} {c.title.split(' ')[0]}</span>
                    <span className={`badge ${c.spots>0?'badge-open':'badge-full'}`}>{c.spots>0?`● Planned — ${c.spots} spots`:'Coming July 2026'}</span>
                  </div>
                  <h3 style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:24,color:'var(--text)',marginBottom:8 }}>{c.title}</h3>
                  <p style={{ fontSize:14,color:'var(--muted)',marginBottom:20,lineHeight:1.7,maxWidth:600 }}>{c.desc}</p>
                  <div className="courses-metrics-grid">
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
                <div className="courses-cohort-side">
                  <div style={{ fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,color:'var(--text)',marginBottom:4 }}>{c.price}</div>
                  <div style={{ fontSize:12,color:'var(--muted)',marginBottom:16 }}>or 2 instalments (when open)</div>
                  <button className="btn btn-outline" style={{ width:'100%',justifyContent:'center',marginBottom:8, whiteSpace:'normal', textAlign:'center' }} onClick={()=>router.push('/apply')}>Cohort enrollment — Coming soon</button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ width:'100%',justifyContent:'center',fontSize:12, whiteSpace:'normal', textAlign:'center' }}
                    onClick={() => document.getElementById('adhara-learn-path')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    Browse Adhara Learn →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
