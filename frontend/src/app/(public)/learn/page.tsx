'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { coursesApi } from '@/lib/api';
import { learnPricingSummary, type PublicCourseListItem } from '@/lib/learn-pricing';

type TrackKey = 'web' | 'data' | 'ai';

const TRACKS: Array<{
  key: TrackKey;
  badgeClass: string;
  icon: string;
  title: string;
  subtitle: string;
  outcome: string;
  image: string;
  slugHint: string[];
}> = [
  {
    key: 'web',
    badgeClass: 'badge-web',
    icon: '💻',
    title: 'Web Development',
    subtitle: 'From beginner to building real websites',
    outcome: 'Portfolio websites • Freelancing • Junior frontend roles',
    image: '/images/learn/track-web.png',
    slugHint: ['web', 'frontend', 'html', 'css', 'javascript', 'react'],
  },
  {
    key: 'data',
    badgeClass: 'badge-data',
    icon: '📊',
    title: 'Data Analysis',
    subtitle: 'Turn data into insight and dashboards',
    outcome: 'Entry data roles • Remote gigs • Reporting & dashboards',
    image: '/images/learn/track-data.png',
    slugHint: ['data', 'analysis', 'analytics', 'excel', 'sql', 'powerbi', 'python'],
  },
  {
    key: 'ai',
    badgeClass: 'badge-ai',
    icon: '🤖',
    title: 'AI Automation',
    subtitle: 'Automate tasks and build workflows',
    outcome: 'Automation freelancing • Business ops • Productivity consulting',
    image: '/images/learn/track-ai.png',
    slugHint: ['ai', 'automation', 'chatgpt', 'workflow'],
  },
];

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

function TrackCoursesModal(props: {
  open: boolean;
  onClose: () => void;
  track: (typeof TRACKS)[number];
  courses: PublicCourseListItem[];
  onOpenCourse: (slug: string) => void;
}) {
  const { open, onClose, track, courses, onOpenCourse } = props;
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedSlug(courses[0]?.slug ?? null);
  }, [open, courses]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const selected = courses.find((c) => c.slug === selectedSlug) ?? courses[0];

  return (
    <div className="learn-modal-overlay" role="dialog" aria-modal="true" aria-label={`${track.title} courses`}>
      <button className="learn-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className="learn-modal">
        <div className="learn-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span className={`badge ${track.badgeClass}`}>{track.icon} {track.title}</span>
            <div className="learn-modal-title">Courses in this track</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>

        {courses.length === 0 ? (
          <div className="card" style={{ marginTop: 12, color: 'var(--muted)' }}>No courses published for this track yet.</div>
        ) : (
          <div className="learn-modal-grid">
            <div className="learn-modal-list">
              {courses.map((c) => (
                <button
                  key={c.slug}
                  className={`learn-modal-item ${c.slug === selectedSlug ? 'is-active' : ''}`}
                  onClick={() => setSelectedSlug(c.slug)}
                >
                  <div className="learn-modal-item-title">{c.title}</div>
                  <div className="learn-modal-item-sub">{(c.description ?? '—').slice(0, 92)}{(c.description ?? '').length > 92 ? '…' : ''}</div>
                </button>
              ))}
            </div>

            <div className="learn-modal-detail">
              {!selected ? null : (
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="badge badge-open">ADHARA LEARN</span>
                    <span className="badge">Self‑paced</span>
                  </div>
                  <div className="learn-modal-detail-title">{selected.title}</div>
                  <div className="learn-modal-detail-desc">{selected.description ?? '—'}</div>
                  <div className="learn-modal-detail-price">
                    {learnPricingSummary(selected).map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                  <div className="learn-modal-detail-actions">
                    <button className="btn btn-gold btn-sm" onClick={() => onOpenCourse(selected.slug)}>
                      View course →
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onOpenCourse(`/learn/tracks/${track.key}`)}>
                      View track page →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LearnLandingPage() {
  const router = useRouter();
  useScrollReveal();
  const [trackModal, setTrackModal] = useState<TrackKey | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses-public'],
    queryFn: () => coursesApi.listPublic() as Promise<PublicCourseListItem[]>,
    staleTime: 60_000,
  });

  const grouped = useMemo(() => {
    const list = (courses ?? []) as PublicCourseListItem[];
    const byKey: Record<TrackKey, PublicCourseListItem[]> = { web: [], data: [], ai: [] };
    for (const c of list) {
      const s = `${c.slug ?? ''} ${c.title ?? ''}`.toLowerCase();
      const match =
        TRACKS.find((t) => t.slugHint.some((h) => s.includes(h)))?.key ??
        'web';
      byKey[match].push(c);
    }
    return byKey;
  }, [courses]);

  const modalTrack = TRACKS.find((t) => t.key === trackModal) ?? null;

  return (
    <div className="learn-landing">
      <div className="section-inner" style={{ paddingTop: 64 }}>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-mono)', cursor: 'pointer', marginBottom: 16 }}
        >
          ← Back to Home
        </button>

        <div className="learn-hero" data-reveal>
          <div className="learn-hero-left">
            <div className="section-label">Adhara Learn</div>
            <h1 className="learn-hero-title">
              Learn a digital skill.
              <br />
              Build real projects.
              <br />
              Start earning.
            </h1>
            <p className="learn-hero-sub">
              Structured career paths for beginners in <strong>Web Development</strong>, <strong>Data Analysis</strong>, and <strong>AI Automation</strong>.
              Start free, pay as you go, and get live support when stuck.
            </p>

            <div className="learn-hero-cta">
              <button className="btn btn-gold btn-lg" onClick={() => document.getElementById('tracks')?.scrollIntoView({ behavior: 'smooth' })}>
                Choose your path →
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}>
                Browse courses
              </button>
            </div>

          </div>

          <div className="learn-hero-right">
            <div className="learn-image-card">
              <div className="learn-image" style={{ backgroundImage: `url(/images/learn/hero.png)` }} />
              <div className="learn-image-overlay">
                <div className="badge badge-open">NEW</div>
                <div className="learn-image-title">Career paths built for Nigeria</div>
                <div className="learn-image-sub">Support • community • affordability</div>
              </div>
            </div>
            <div className="learn-floating">
              <div className="learn-floating-card">
                <div className="learn-floating-title">No setup stress</div>
                <div className="learn-floating-sub">Learn and practice in one place</div>
              </div>
              <div className="learn-floating-card">
                <div className="learn-floating-title">Bundle & save</div>
                <div className="learn-floating-sub">Track bundles for smart buyers</div>
              </div>
            </div>
          </div>
        </div>

        <div className="learn-section" style={{ marginTop: 22 }}>
          <div className="learn-section-head" data-reveal>
            <div className="section-label">Why it works</div>
            <div className="learn-section-title">Built for beginners. Designed for real progress.</div>
            <div className="learn-section-sub">Start small, stay supported, and build projects you can show.</div>
          </div>
          <div className="learn-proof-row learn-proof-row-lg" data-reveal>
            {[
              {
                k: 'Start Completely Free',
                v: 'No credit card. No upfront fee. Just create an account and start learning right now. You only pay when you decide to go deeper.',
                icon: '✅',
              },
              {
                k: 'Pay small small',
                v: 'No big upfront cost. Pay per course or bundle as you go.',
                icon: '💳',
              },
              {
                k: 'Live help',
                v: 'Stuck on something? Our tutors are real humans who actually help. Ask questions, get answers, keep moving. You never have to get stuck alone.',
                icon: '🧑‍🏫',
              },
              {
                k: 'Graduate with a portfolio',
                v: 'Complete your track, graduate with a real portfolio, and start freelancing, applying, or launching your career.',
                icon: '🧩',
              },
            ].map((x) => (
              <div key={x.k} className="learn-proof-card learn-proof-card-lg">
                <div className="learn-proof-icon">{x.icon}</div>
                <div className="learn-proof-k">{x.k}</div>
                <div className="learn-proof-v">{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div id="tracks" className="learn-section" style={{ marginTop: 22 }}>
          <div className="learn-section-head" data-reveal>
            <div className="section-label">Choose your path</div>
            <div className="learn-section-title">Pick one track. We’ll guide you step‑by‑step.</div>
            <div className="learn-section-sub">Each track is modular: pay per course or save with bundles.</div>
          </div>

          <div className="learn-tracks" data-reveal>
            {TRACKS.map((t) => (
              <div key={t.key} className="learn-track-card">
                <div className="learn-track-media" style={{ backgroundImage: `url(${t.image})` }} />
                <div className="learn-track-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`badge ${t.badgeClass}`}>{t.icon} {t.title}</span>
                    <span className="badge">Pay per course · Bundle discount</span>
                  </div>
                  <div className="learn-track-title">{t.subtitle}</div>
                  <div className="learn-track-outcome">{t.outcome}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                    <button className="btn btn-gold btn-sm" onClick={() => router.push(`/learn/tracks/${t.key}`)}>
                      View track →
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setTrackModal(t.key)}>
                      Browse courses
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="learn-section" style={{ marginTop: 26 }}>
          <div className="learn-grid-2" data-reveal>
            <div className="card learn-feature-card">
              <div className="section-label">What makes it different</div>
              <div className="learn-feature-title">Support beats YouTube.</div>
              <div className="learn-feature-sub">
                Learners don’t fail because they’re not smart — they fail because they get stuck.
                Adhara Learn is built to keep you moving with support + community + structure.
              </div>
              <div className="learn-feature-list">
                {[
                  { t: 'Free entry', d: 'Start with beginner-friendly introductions.' },
                  { t: 'Modular payment', d: 'Pay per course or buy bundles at a discount.' },
                  { t: 'Practical projects', d: 'Build real things you can show clients/employers.' },
                  { t: 'Live help', d: 'Ask questions when stuck.' },
                ].map((x) => (
                  <div key={x.t} className="learn-feature-item">
                    <div className="learn-feature-bullet" />
                    <div>
                      <div className="learn-feature-item-title">{x.t}</div>
                      <div className="learn-feature-item-sub">{x.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card learn-testimonial-card">
              <div className="section-label">Testimonials</div>
              <div className="learn-testimonial-title">What learners say</div>
              <div className="learn-testimonial-sub">
                Short, clear wins. This is what we’re building the experience around.
              </div>
              <div className="learn-testimonial-cards">
                {[
                  { q: 'I finally understand what to do next. The roadmap is clear and the support keeps me moving.', a: 'Learner · Web Dev track' },
                  { q: 'Paying per course made it easy to start. The bundle discount helped me commit to the full track.', a: 'Learner · Data track' },
                  { q: 'The projects are practical. I can actually show what I built — not just watch videos.', a: 'Learner · AI Automation track' },
                ].map((t) => (
                  <div key={t.a} className="learn-testimonial-cardx">
                    <div className="learn-testimonial-quote">“{t.q}”</div>
                    <div className="learn-testimonial-author">{t.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div id="catalog" className="learn-section" style={{ marginTop: 26 }}>
          <div className="learn-section-head" data-reveal>
            <div className="section-label">Browse</div>
            <div className="learn-section-title">Courses & pricing</div>
            <div className="learn-section-sub">Open a course to see bundles, modules, lessons, and checkout options.</div>
          </div>

          {isLoading ? (
            <div className="card">Loading courses…</div>
          ) : courses.length === 0 ? (
            <div className="card">No courses published yet.</div>
          ) : (
            <div className="learn-catalog" data-reveal>
              {(['web', 'data', 'ai'] as const).map((k) => (
                <div key={k} id={`track-${k}`} className="learn-catalog-group">
                  <div className="learn-catalog-head">
                    <span className={`badge ${TRACKS.find((t) => t.key === k)!.badgeClass}`}>
                      {TRACKS.find((t) => t.key === k)!.icon} {TRACKS.find((t) => t.key === k)!.title}
                    </span>
                    <span className="badge">{grouped[k].length} course(s)</span>
                  </div>
                  <div className="learn-catalog-grid">
                    {grouped[k].map((c) => (
                      <div
                        key={c.slug}
                        className="card learn-catalog-card"
                        onClick={() => router.push(`/learn/${c.slug}`)}
                      >
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
                        <div className="learn-catalog-link">View details →</div>
                      </div>
                    ))}
                    {grouped[k].length === 0 && (
                      <div className="card" style={{ color: 'var(--muted)' }}>No courses published for this track yet.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="learn-footer-cta" data-reveal>
          <div className="learn-footer-cta-title">Ready to start?</div>
          <div className="learn-footer-cta-sub">Pick a path, start free, and build towards real income.</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 }}>
            <button className="btn btn-gold btn-lg" onClick={() => document.getElementById('tracks')?.scrollIntoView({ behavior: 'smooth' })}>
              Choose your path →
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => router.push('/login')}>
              Log in
            </button>
          </div>
        </div>
      </div>

      <TrackCoursesModal
        open={!!modalTrack}
        track={modalTrack ?? TRACKS[0]}
        courses={modalTrack ? grouped[modalTrack.key] : []}
        onClose={() => setTrackModal(null)}
        onOpenCourse={(slugOrPath) => {
          setTrackModal(null);
          if (slugOrPath.startsWith('/')) router.push(slugOrPath);
          else router.push(`/learn/${slugOrPath}`);
        }}
      />
    </div>
  );
}

