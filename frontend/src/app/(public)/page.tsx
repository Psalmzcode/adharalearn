'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdharaLearnTracksSection } from '@/components/public/AdharaLearnTracksSection';

const COHORTS = [
  { title:'Full-Stack Web Development', badge:'badge-web', badgeText:'💻 Web Dev', status:'● OPEN', spots:23, duration:'12 Weeks', format:'Online + Live', price:'₦85,000', desc:'From HTML to React + Node.js. Build 3 portfolio projects and graduate job-ready.' },
  { title:'Data Analytics with Python', badge:'badge-data', badgeText:'📊 Data Analytics', status:'● OPEN', spots:14, duration:'10 Weeks', format:'Online + Live', price:'₦75,000', desc:'Python, pandas, SQL, and data visualisation. Land a data analyst role.' },
  { title:'AI & Machine Learning', badge:'badge-ai', badgeText:'🤖 AI/ML', status:'Coming July 2026', spots:0, duration:'12 Weeks', format:'Online', price:'₦95,000', desc:'Machine learning fundamentals, neural networks, and real-world AI projects.' },
];

const TESTIMONIALS = [
  { quote:"I got a frontend job offer 3 weeks after finishing the Web Dev cohort. The portfolio projects made all the difference.", name:'Emeka Chukwu', role:'Frontend Developer at TechCabal', initials:'EC' },
  { quote:"The data analytics bootcamp was intense but worth it. I went from zero Python knowledge to building dashboards at my company.", name:'Ngozi Bello', role:'Data Analyst at Stanbic IBTC', initials:'NB' },
  { quote:"Tobi is an incredible facilitator. The live sessions and Q&As made complex concepts click. Best investment I made.", name:'Aisha Okonkwo', role:'Full-Stack Developer (Freelance)', initials:'AO' },
];

const HERO_AUDIENCE_TAGS = ['Student', 'School Leaver', 'NYSC', 'Job Seeker', 'Career Switcher'] as const;

const FAQS = [
  { q:'Do I need prior coding experience?', a:'No. Our Web Dev and Data Analytics tracks start from absolute zero. Dedication and 15+ hours/week is what matters.' },
  { q:'What is the class schedule?', a:'Live sessions run 3x/week (Monday, Wednesday, Friday) at 9AM or 6PM. All sessions are recorded for learners who miss them.' },
  { q:'Is there a payment plan?', a:'Yes — a 2-instalment plan is available: pay 50% at enrolment and the remaining 50% at Week 5. Scholarships are also available for qualifying applicants.' },
  { q:'What happens after the bootcamp?', a:'Graduates get access to our job placement network, portfolio review, LinkedIn profile optimisation, and referrals to our hiring partner companies.' },
];

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

export default function BootcampHomePage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroAudienceIdx, setHeroAudienceIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHeroAudienceIdx((i) => (i + 1) % HERO_AUDIENCE_TAGS.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div style={{ background:'var(--bg)',minHeight:'100vh',color:'var(--text)',fontFamily:'var(--font-body)' }}>
      {/* Grid bg */}
      <div className="grid-bg" />
      {/* Nav */}
      <nav className="home-nav">
        <button onClick={()=>router.push('/')} className="home-nav-logo"><BootcampLogo /></button>

        <div className="home-nav-links">
          {[
            { label: 'Courses', href: '/courses' },
            { label: 'How It Works', href: '#how' },
            { label: 'Pricing', href: '/courses' },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="home-nav-link"
              onClick={(e) => {
                if (l.href.startsWith('/')) { e.preventDefault(); router.push(l.href); }
              }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="home-nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={()=>router.push('/login')}>Sign In</button>
          <button className="btn btn-gold btn-sm" onClick={()=>router.push('/learn')}>Adhara Learn</button>
          <button className="btn btn-outline btn-sm" onClick={()=>router.push('/signup')}>Sign up</button>
        </div>

        <button
          className="home-nav-hamburger"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((s) => !s)}
        >
          <span className={`ham ${mobileMenuOpen ? 'open' : ''}`} />
        </button>
      </nav>

      <div className={`home-nav-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
      <div className={`home-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="home-nav-drawer-inner">
          <a className="home-nav-drawer-link" href="/courses" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); router.push('/courses'); }}>Courses</a>
          <a className="home-nav-drawer-link" href="#how" onClick={() => setMobileMenuOpen(false)}>How it works</a>
          <a className="home-nav-drawer-link" href="/learn" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); router.push('/learn'); }}>Adhara Learn</a>
          <div className="home-nav-drawer-cta">
            <button className="btn btn-gold btn-full" onClick={() => { setMobileMenuOpen(false); router.push('/login'); }}>Sign in →</button>
            <button className="btn btn-ghost btn-full" onClick={() => { setMobileMenuOpen(false); router.push('/signup'); }}>Create account</button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section style={{ position:'relative',minHeight:'100vh',display:'flex',alignItems:'center',paddingTop:64,overflow:'hidden' }}>
        <div className="orb" style={{ width:600,height:600,background:'var(--teal)',top:-200,right:-100 }} />
        <div className="orb" style={{ width:500,height:500,background:'var(--gold)',bottom:-150,left:-100 }} />
        <div className="section-inner" style={{ width:'100%',position:'relative',zIndex:2 }}>
          <div className="home-hero-grid">
          <div style={{ maxWidth:760 }} className="motion-in">
            <div style={{ display:'flex',flexWrap:'wrap',alignItems:'center',columnGap:14,rowGap:8,marginBottom:28 }}>
              <p style={{ display:'inline-flex',alignItems:'center',gap:10,margin:0,fontSize:13,fontWeight:700,color:'var(--muted)',lineHeight:1.55,fontFamily:'var(--font-body)',letterSpacing:'0.06em',textTransform:'uppercase' }}>
                <span style={{ width:8,height:8,borderRadius:'50%',background:'var(--teal)',flexShrink:0,boxShadow:'0 0 10px rgba(0,212,170,0.55)' }} aria-hidden />
                Self-paced courses live now
              </p>
              <span style={{ color:'var(--muted)',opacity:0.45,userSelect:'none' }} aria-hidden>
                ·
              </span>
              <p style={{ margin:0,fontSize:13,fontWeight:700,color:'var(--gold)',lineHeight:1.55,fontFamily:'var(--font-body)',letterSpacing:'0.06em',textTransform:'uppercase' }}>
                Cohort waitlist opening soon
              </p>
            </div>
            <h1 style={{ fontSize:'clamp(32px,5vw,56px)',lineHeight:1.08,marginBottom:20,fontFamily:'var(--font-display)',fontWeight:900,color:'var(--text)' }}>
              <span style={{ color:'var(--text)' }}>Nigeria&apos;s Most </span>
              <span style={{ background:'linear-gradient(90deg,var(--gold),var(--teal))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>
                Practical Tech
              </span>
              <span style={{ color:'var(--text)' }}> Training Platform</span>
            </h1>
            <p style={{ fontSize:17,color:'var(--muted)',maxWidth:560,lineHeight:1.75,marginBottom:22 }}>
              Learn practical tech skills that can help you earn—through beginner-friendly courses in Web Development, Data Analysis, and AI. Start free, build real projects, and grow at your own pace.
            </p>
            <div style={{ marginBottom:28,fontSize:15,lineHeight:1.6 }}>
              <div className="home-hero-audience-row">
                <span className="home-hero-audience-label">This is for you if you&apos;re a</span>
                {HERO_AUDIENCE_TAGS.map((tag, i) => (
                  <span
                    key={tag}
                    className={`home-hero-audience-tag${i === heroAudienceIdx ? ' is-active' : ''}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display:'flex',gap:14,flexWrap:'wrap' }}>
              <button className="btn btn-gold btn-lg" onClick={()=>router.push('/learn')}>Start Learning Free</button>
              <button className="btn btn-outline btn-lg" onClick={()=>router.push('/apply')}>Join Cohort Waitlist</button>
            </div>
          </div>
          <div className="hero-visual motion-in">
            <div className="hero-visual-card">
              <div className="hero-visual-badge">Live Preview</div>
              <div className="hero-visual-title">Frontend + Data + AI</div>
              <div className="hero-visual-sub">Project-based tracks with capstones, certificates, and mentor feedback.</div>
              <div className="hero-visual-grid">
                <div className="hero-visual-tile">💻 HTML/CSS</div>
                <div className="hero-visual-tile">⚛️ React</div>
                <div className="hero-visual-tile">📊 Data Viz</div>
                <div className="hero-visual-tile">🤖 Automation</div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding:'60px 0',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)',background:'var(--bg2)' }}>
        <div className="section-inner">
          <div className="stats-grid home-stats-grid">
            {[{val:'1,240+',lbl:'Graduates'},{val:'84%',lbl:'Placement Rate'},{val:'3',lbl:'Tracks Available'},{val:'12 Weeks',lbl:'Average Duration'}].map(s=>(
              <div key={s.lbl} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--gold)',marginBottom:6 }}>{s.val}</div>
                <div style={{ fontSize:13,color:'var(--muted)' }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AdharaLearnTracksSection variant="home" />

      {/* Programs: live cohort tracks */}
      <section className="section">
        <div className="section-inner">
          <div style={{ marginBottom:28 }}>
            <div className="section-label">Our Programs</div>
            <h2 className="section-title">Choose Your Track · <span style={{ color:'var(--gold)' }}>Cohort coming soon</span></h2>
            <p className="section-sub">Live cohort tracks (Web, Data, AI) — enrollment opening after our next intake. Target April 7, 2026; limited spots per track when we open.</p>
          </div>

          <div style={{ display:'flex',flexDirection:'column',gap:24 }}>
            {COHORTS.map((c,i)=>(
              <div key={i} className="card motion-in" style={{ borderLeft:`3px solid ${i===0?'#3B82F6':i===1?'var(--teal)':'#8B5CF6'}`,padding:32 }}>
                <div className="home-cohort-card-grid">
                  <div>
                    <div className="program-thumb" data-track={i===0?'web':i===1?'data':'ai'}>
                      <span>{i===0 ? 'Build and deploy modern websites' : i===1 ? 'Analyze and visualize real datasets' : 'Design practical AI workflows'}</span>
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap' }}>
                      <span className={`badge ${c.badge}`}>{c.badgeText}</span>
                      <span className={`badge ${c.spots>0?'badge-open':'badge-full'}`}>{c.status}{c.spots>0?` — ${c.spots} spots planned`:''}</span>
                    </div>
                    <h3 style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:24,color:'var(--text)',marginBottom:8 }}>{c.title}</h3>
                    <p style={{ fontSize:14,color:'var(--muted)',marginBottom:20,lineHeight:1.7 }}>{c.desc}</p>
                    <div className="home-metrics-grid">
                      {[{lbl:'DURATION',val:c.duration},{lbl:'FORMAT',val:c.format},{lbl:'FEE',val:c.price}].map(m=>(
                        <div key={m.lbl} style={{ padding:14,background:'var(--surface2)',borderRadius:'var(--radius)' }}>
                          <div style={{ fontSize:11,color:'var(--muted)',fontFamily:'var(--font-mono)',marginBottom:4 }}>{m.lbl}</div>
                          <div style={{ fontWeight:700,fontSize:15,color:'var(--text)' }}>{m.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ minWidth:160,textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,color:'var(--text)',marginBottom:4 }}>{c.price}</div>
                    <div style={{ fontSize:12,color:'var(--muted)',marginBottom:16 }}>or 2 instalments (when open)</div>
                    <button className="btn btn-outline" style={{ width:'100%',justifyContent:'center',marginBottom:8 }} onClick={()=>router.push('/apply')}>Cohort enrollment — Coming soon</button>
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
      </section>

      {/* Testimonials */}
      <section className="section" style={{ background:'var(--bg2)' }}>
        <div className="section-inner">
          <div style={{ textAlign:'center',marginBottom:48 }}>
            <div className="section-label">Graduate Stories</div>
            <h2 className="section-title">Real results from real people</h2>
          </div>
          <div className="home-testi-grid">
            {TESTIMONIALS.map((t,i)=>(
              <div key={i} className="testi-card motion-in">
                <div style={{ color:'var(--gold)',fontSize:13,letterSpacing:2,marginBottom:12 }}>★★★★★</div>
                <div className="testi-quote">"{t.quote}"</div>
                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                  <div className="testi-av">{t.initials}</div>
                  <div><div className="testi-name">{t.name}</div><div className="testi-role">{t.role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq">
        <div className="section-inner" style={{ maxWidth:720 }}>
          <div style={{ textAlign:'center',marginBottom:40 }}>
            <div className="section-label">FAQ</div>
            <h2 className="section-title">Common Questions</h2>
          </div>
          {FAQS.map((f,i)=>(
            <div key={i} className="faq-item">
              <div className="faq-q" onClick={()=>setOpenFaq(openFaq===i?null:i)}>
                {f.q}
                <span className="faq-toggle">{openFaq===i?'−':'+'}</span>
              </div>
              {openFaq===i && <div className="faq-a">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ background:'var(--bg2)',textAlign:'center' }}>
        <div className="section-inner">
          <h2 className="section-title" style={{ textAlign:'center' }}>Ready to change your career?</h2>
          <p className="section-sub" style={{ margin:'0 auto 32px',textAlign:'center' }}>
            Learn at your own pace. Start today. Find paid courses at Adhara Learn: learn.adharaedu.com.
          </p>
          <div style={{ display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap' }}>
            <button className="btn btn-gold btn-lg" onClick={()=>router.push('/login')}>Adhara Learn →</button>
            <button className="btn btn-outline btn-lg" onClick={()=>router.push('/learn')}>View Paid Courses</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid var(--border)',padding:'48px 0 32px',background:'var(--bg2)' }}>
        <div className="section-inner" style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:20 }}>
          <BootcampLogo />
          <p style={{ fontSize:13,color:'var(--muted)' }}>© 2026 AdharaEdu Bootcamp · Lagos, Nigeria</p>
          <div className="home-footer-links">
            {['Privacy','Terms','Contact'].map(l=><a key={l} style={{ fontSize:13,color:'var(--muted)',cursor:'pointer' }}>{l}</a>)}
          </div>
        </div>
      </footer>
    </div>
  );
}
