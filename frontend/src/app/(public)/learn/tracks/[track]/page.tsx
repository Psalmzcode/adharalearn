'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { coursesApi } from '@/lib/api';
import { learnPricingSummary, type PublicCourseListItem } from '@/lib/learn-pricing';
import { PublicNavbar } from '@/components/public/PublicNavbar';

type TrackKey = 'web' | 'data' | 'ai';

const TRACKS: Record<
  TrackKey,
  {
    key: TrackKey;
    badgeClass: string;
    icon: string;
    title: string;
    subtitle: string;
    heroLine: string;
    outcomeBullets: string[];
    projectsBullets: string[];
    slugHint: string[];
  }
> = {
  web: {
    key: 'web',
    badgeClass: 'badge-web',
    icon: '💻',
    title: 'Web Development Track',
    subtitle: 'From beginner to building real websites and earning with your skills',
    heroLine: 'No experience needed · Start free · Pay small small',
    outcomeBullets: [
      'Build real websites from scratch',
      'Create portfolio projects you can show',
      'Take freelance jobs and small gigs',
      'Apply for junior frontend roles',
    ],
    projectsBullets: [
      'Personal portfolio website',
      'Business landing page',
      'Interactive web app',
      'Final capstone project',
    ],
    slugHint: ['web', 'frontend', 'html', 'css', 'javascript', 'react'],
  },
  data: {
    key: 'data',
    badgeClass: 'badge-data',
    icon: '📊',
    title: 'Data Analysis Track',
    subtitle: 'Turn data into insight, reports, and dashboards',
    heroLine: 'No experience needed · Practical projects · Pay as you go',
    outcomeBullets: [
      'Clean and organize messy data',
      'Build dashboards and reports for decision-making',
      'Do simple analysis for businesses and teams',
      'Qualify for entry-level data roles and gigs',
    ],
    projectsBullets: [
      'Sales performance dashboard',
      'Data cleaning + reporting project',
      'Insights presentation for a real dataset',
      'Mini portfolio of dashboards',
    ],
    slugHint: ['data', 'analysis', 'analytics', 'excel', 'sql', 'powerbi', 'python'],
  },
  ai: {
    key: 'ai',
    badgeClass: 'badge-ai',
    icon: '🤖',
    title: 'AI Automation Track',
    subtitle: 'Automate tasks, build workflows, and deliver productivity wins',
    heroLine: 'Beginner-friendly · Real workflows · Paid skills you can sell',
    outcomeBullets: [
      'Build reusable ChatGPT workflows',
      'Automate repetitive tasks for yourself or clients',
      'Create simple no-code automations',
      'Deliver productivity upgrades to businesses',
    ],
    projectsBullets: [
      'Content + research workflow',
      'Lead capture + follow-up automation',
      'Customer support response assistant',
      'Automation portfolio you can demo',
    ],
    slugHint: ['ai', 'automation', 'chatgpt', 'workflow'],
  },
};

function normalizeTrackKey(track: string): TrackKey | null {
  if (track === 'web' || track === 'data' || track === 'ai') return track;
  if (track === 'web-development') return 'web';
  if (track === 'data-analysis') return 'data';
  if (track === 'ai-automation') return 'ai';
  return null;
}

function matchesTrack(track: TrackKey, c: PublicCourseListItem): boolean {
  const s = `${c.slug ?? ''} ${c.title ?? ''}`.toLowerCase();
  return TRACKS[track].slugHint.some((h) => s.includes(h));
}

function useScrollReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-reveal]')) as HTMLElement[];
    if (nodes.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) (e.target as HTMLElement).classList.add('is-revealed');
        }
      },
      { threshold: 0.12 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
}

export default function LearnTrackPage({ params }: { params: { track: string } }) {
  const router = useRouter();
  const key = normalizeTrackKey(params.track);
  const track = key ? TRACKS[key] : null;
  useScrollReveal();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses-public'],
    queryFn: () => coursesApi.listPublic() as Promise<PublicCourseListItem[]>,
    staleTime: 60_000,
  });

  const trackCourses = useMemo(() => {
    if (!key) return [];
    const list = (courses ?? []).filter((c) => matchesTrack(key, c));
    const score = (c: PublicCourseListItem) => {
      const s = `${c.slug} ${c.title}`.toLowerCase();
      const hasFree = c.modules?.some((m) => m.isFree) ? 1 : 0;
      const isIntro = s.includes('intro') || s.includes('introduction') ? 1 : 0;
      const isReact = s.includes('react') ? -1 : 0;
      return 100 * isIntro + 10 * hasFree + isReact;
    };
    return list.sort((a, b) => score(b) - score(a) || a.title.localeCompare(b.title));
  }, [courses, key]);

  const startFreeSlug = useMemo(() => {
    const freeish = trackCourses.find((c) => c.modules?.some((m) => m.isFree));
    return (freeish ?? trackCourses[0])?.slug ?? null;
  }, [trackCourses]);

  if (!track) {
    return (
      <div className="learn-landing">
        <PublicNavbar />
        <div className="section-inner" style={{ paddingTop: 64 }}>
          <button onClick={() => router.push('/learn')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-mono)', cursor: 'pointer', marginBottom: 16 }}>
            ← Back to Adhara Learn
          </button>
          <div className="card">Track not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="learn-landing learn-trackpage">
      <PublicNavbar />
      <div className="section-inner" style={{ paddingTop: 64 }}>
        <button onClick={() => router.push('/learn')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-mono)', cursor: 'pointer', marginBottom: 16 }}>
          ← Back to Adhara Learn
        </button>

        <div className="learn-track-hero" data-reveal>
          <div className="learn-track-hero-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={`badge ${track.badgeClass}`}>{track.icon} {track.title}</span>
              <span className="badge">Self‑paced · Live support · Community</span>
            </div>
            <div className="learn-track-hero-title">{track.subtitle}</div>
            <div className="learn-track-hero-sub">{track.heroLine}</div>
            <div className="learn-track-hero-cta">
              <button
                className="btn btn-gold btn-lg"
                disabled={!startFreeSlug}
                onClick={() => (startFreeSlug ? router.push(`/learn/${startFreeSlug}`) : null)}
              >
                Start free →
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth' })}>
                View curriculum
              </button>
            </div>
          </div>
          <div className="learn-track-hero-right">
            <div className="learn-track-hero-card">
              <div className="learn-track-hero-k">You’ll get</div>
              <div className="learn-track-hero-list">
                <div className="learn-track-hero-li">A clear roadmap (no confusion)</div>
                <div className="learn-track-hero-li">Projects that build your portfolio</div>
                <div className="learn-track-hero-li">Live help when you get stuck</div>
                <div className="learn-track-hero-li">Pay per course or buy bundles</div>
              </div>
            </div>
          </div>
        </div>

        <div className="learn-section" style={{ marginTop: 22 }}>
          <div className="learn-section-head" data-reveal>
            <div className="section-label">Outcome</div>
            <div className="learn-section-title">What you’ll be able to do</div>
            <div className="learn-section-sub">This is where the skill connects to money, confidence, and a real path forward.</div>
          </div>
          <div className="learn-track-bullets" data-reveal>
            {track.outcomeBullets.map((b) => (
              <div key={b} className="learn-track-bullet">
                <div className="learn-track-bullet-dot" />
                <div>{b}</div>
              </div>
            ))}
          </div>
        </div>

        <div id="curriculum" className="learn-section" style={{ marginTop: 22 }}>
          <div className="learn-section-head" data-reveal>
            <div className="section-label">Learning path</div>
            <div className="learn-section-title">Step‑by‑step journey</div>
            <div className="learn-section-sub">Follow the roadmap in order. Start free, then pay small small as you grow.</div>
          </div>

          {isLoading ? (
            <div className="card">Loading curriculum…</div>
          ) : trackCourses.length === 0 ? (
            <div className="card" style={{ color: 'var(--muted)' }}>No courses published for this track yet.</div>
          ) : (
            <div className="learn-roadmap" data-reveal>
              {trackCourses.map((c, idx) => (
                <div key={c.slug} className="learn-roadmap-step">
                  <div className="learn-roadmap-num">{String(idx + 1).padStart(2, '0')}</div>
                  <div className="learn-roadmap-body">
                    <div className="learn-roadmap-title">{c.title}</div>
                    <div className="learn-roadmap-desc">{c.description ?? '—'}</div>
                    <div className="learn-roadmap-meta">
                      {learnPricingSummary(c).slice(0, 3).map((line, i) => (
                        <span key={i} className="badge">{line}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                      <button className="btn btn-gold btn-sm" onClick={() => router.push(`/learn/${c.slug}`)}>
                        View details →
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => router.push('/signup')}>
                        Create account
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="learn-section" style={{ marginTop: 22 }}>
          <div className="learn-section-head" data-reveal>
            <div className="section-label">Projects</div>
            <div className="learn-section-title">Proof you’re learning</div>
            <div className="learn-section-sub">You won’t just “watch”. You’ll build real things you can show.</div>
          </div>
          <div className="learn-track-bullets" data-reveal>
            {track.projectsBullets.map((b) => (
              <div key={b} className="learn-track-bullet">
                <div className="learn-track-bullet-dot" />
                <div>{b}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="learn-section" style={{ marginTop: 22 }}>
          <div className="learn-section-head" data-reveal>
            <div className="section-label">How you’ll learn</div>
            <div className="learn-section-title">This is where we win</div>
            <div className="learn-section-sub">Beginners don’t fail because they’re not smart — they fail because they get stuck. We keep you moving.</div>
          </div>

          <div className="learn-proof-row learn-proof-row-lg" data-reveal>
            {[
              { k: 'Code while watching', v: 'Built-in practice tools so you learn by doing (no setup stress).', icon: '💻' },
              { k: 'Live tutor support', v: 'Ask questions when stuck and get help from real humans.', icon: '🧑‍🏫' },
              { k: 'Hands‑on projects', v: 'Projects that become your portfolio and proof of skill.', icon: '🧩' },
              { k: 'Community', v: 'Learn with others, stay motivated, and keep progressing.', icon: '👥' },
            ].map((x) => (
              <div key={x.k} className="learn-proof-card learn-proof-card-lg">
                <div className="learn-proof-icon">{x.icon}</div>
                <div className="learn-proof-k">{x.k}</div>
                <div className="learn-proof-v">{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="learn-section" style={{ marginTop: 22 }}>
          <div className="learn-section-head" data-reveal>
            <div className="section-label">Pricing</div>
            <div className="learn-section-title">Pay per course. Bundle when it’s smarter.</div>
            <div className="learn-section-sub">Each course page shows full track price, module pricing, and any bundle discounts available.</div>
          </div>

          {trackCourses.length > 0 && (
            <div className="learn-catalog" data-reveal>
              <div className="learn-catalog-grid">
                {trackCourses.map((c) => (
                  <div key={c.slug} className="card learn-catalog-card" onClick={() => router.push(`/learn/${c.slug}`)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="badge badge-open">ADHARA LEARN</span>
                      <span className="badge">Self‑paced</span>
                    </div>
                    <div className="learn-catalog-title">{c.title}</div>
                    <div className="learn-catalog-desc">{c.description ?? '—'}</div>
                    <div className="learn-catalog-price">
                      {learnPricingSummary(c).slice(0, 3).map((line, i) => (
                        <div key={i} style={{ color: 'var(--text)' }}>{line}</div>
                      ))}
                    </div>
                    <div className="learn-catalog-link">View pricing & bundles →</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="learn-section" style={{ marginTop: 22 }}>
          <div className="learn-section-head" data-reveal>
            <div className="section-label">Social proof</div>
            <div className="learn-section-title">Small wins that matter</div>
            <div className="learn-section-sub">You can replace these with real testimonials anytime.</div>
          </div>
          <div className="learn-testimonial-cards" data-reveal>
            {[
              { q: 'I built my first real project in 2 weeks. The steps were clear and the support helped me finish.', a: `Learner · ${track.title}` },
              { q: 'Paying per course made it easy to start. I didn’t need a big upfront payment.', a: `Learner · ${track.title}` },
              { q: 'I finally know what to do next. The roadmap removed the confusion.', a: `Learner · ${track.title}` },
            ].map((t) => (
              <div key={t.q} className="learn-testimonial-cardx">
                <div className="learn-testimonial-quote">“{t.q}”</div>
                <div className="learn-testimonial-author">{t.a}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="learn-footer-cta" data-reveal>
          <div className="learn-footer-cta-title">Start with the free course today</div>
          <div className="learn-footer-cta-sub">Choose a step, start free, and build toward real income.</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 }}>
            <button className="btn btn-gold btn-lg" disabled={!startFreeSlug} onClick={() => (startFreeSlug ? router.push(`/learn/${startFreeSlug}`) : null)}>
              Start free now →
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => router.push('/signup')}>
              Create account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

