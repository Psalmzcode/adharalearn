'use client';

import { useRouter } from 'next/navigation';
import { learnPricingSummary, type PublicCourseListItem } from '@/lib/learn-pricing';

type TrackKey = 'web' | 'data' | 'ai';

type CompactTrack = {
  key: TrackKey;
  icon: string;
  title: string;
  description: string;
  tags: string;
  /** digits + grouping only, e.g. "12,000" → shown as From ₦12,000 */
  fromAmount: string;
};

const COMPACT_TRACKS: CompactTrack[] = [
  {
    key: 'web',
    icon: '💻',
    title: 'Web Development',
    description: 'Go from beginner to building real websites and earning with your skills.',
    tags: 'Portfolio • Freelancing • Junior roles',
    fromAmount: '12,000',
  },
  {
    key: 'data',
    icon: '📊',
    title: 'Data Analysis',
    description: 'Learn how to analyze data and create insights businesses need',
    tags: 'Excel • Dashboards • Reports',
    fromAmount: '10,000',
  },
  {
    key: 'ai',
    icon: '🤖',
    title: 'AI & Automation',
    description: 'Learn how to use AI to automate tasks and boost productivity',
    tags: 'ChatGPT • Workflows • Tools',
    fromAmount: '10,000',
  },
];

export type AdharaLearnTracksSectionProps = {
  id?: string;
  variant: 'home' | 'courses';
  /** Homepage omits these. `/courses` passes them to show the published course grid under the three track cards. */
  learnCourses?: PublicCourseListItem[];
  learnLoading?: boolean;
};

export function AdharaLearnTracksSection({
  id = 'adhara-learn-path',
  variant,
  learnCourses,
  learnLoading,
}: AdharaLearnTracksSectionProps) {
  const router = useRouter();
  const isHome = variant === 'home';

  const inner = (
    <>
      <div style={{ marginBottom: isHome ? 28 : 24 }}>
        <div className="section-label">Adhara Learn</div>
        {isHome ? (
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            Start Free. Learn a Tech Skill. Build Your Future.
          </h2>
        ) : (
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 40px)', marginBottom: 12, fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.15 }}>
            Start Free. Learn a Tech Skill. Build Your Future.
          </h1>
        )}
        <p className="section-sub" style={{ marginTop: 0, maxWidth: 640 }}>
          No experience needed. Pay little by little as you grow.
        </p>
      </div>

      <div className="adhara-courses-subgrid adhara-compact-tracks-row">
        {COMPACT_TRACKS.map((t) => (
          <div
            key={t.key}
            className={`card adhara-compact-track-card ${isHome ? 'motion-in' : ''}`}
            style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.25 }}>
              <span aria-hidden style={{ marginRight: 6 }}>
                {t.icon}
              </span>
              {t.title}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, margin: '0 0 10px', flex: 1 }}>{t.description}</p>
            <p className="adhara-compact-track-tags">{t.tags}</p>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text)', fontWeight: 700, marginBottom: 12 }}>From ₦{t.fromAmount}</div>
            <button type="button" className="btn btn-gold btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => router.push('/signup')}>
              👉 Start Free →
            </button>
          </div>
        ))}
      </div>

      {variant === 'courses' && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, maxWidth: 640, lineHeight: 1.65 }}>
            Pay for the <strong>full track</strong>, a <strong>bundle</strong>, or <strong>single modules</strong>. Open any course for outlines and checkout.
          </p>
          {learnLoading ? (
            <div className="card">Loading courses…</div>
          ) : (learnCourses ?? []).length === 0 ? (
            <div className="card">No published courses yet. Check back soon.</div>
          ) : (
            <div className="adhara-courses-subgrid">
              {(learnCourses ?? []).map((course) => (
                <div
                  key={course.slug}
                  className="card"
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', minHeight: 180 }}
                  onClick={() => router.push(`/learn/${course.slug}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/learn/${course.slug}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="badge badge-open" style={{ alignSelf: 'flex-start', marginBottom: 10 }}>
                    ADHARA LEARN
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 8 }}>
                    {course.title}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 12, flex: 1 }}>{course.description ?? '—'}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    {learnPricingSummary(course).map((line, idx) => (
                      <div key={idx} style={{ color: 'var(--text)' }}>
                        {line}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>View details →</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );

  if (isHome) {
    return (
      <section className="section adhara-learn-section" id={id} style={{ background: 'var(--bg2)', scrollMarginTop: 80 }}>
        <div className="section-inner">{inner}</div>
      </section>
    );
  }

  return (
    <section className="adhara-learn-section adhara-learn-section--courses" id={id} style={{ scrollMarginTop: 80 }}>
      <div className="section-inner" style={{ paddingTop: 48, paddingBottom: 8 }}>
        {inner}
      </div>
    </section>
  );
}
