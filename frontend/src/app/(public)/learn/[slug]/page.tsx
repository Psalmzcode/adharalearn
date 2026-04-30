'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { bundlePurchasesApi, coursesApi, coursePurchasesApi, modulePurchasesApi } from '@/lib/api';

function PreviewPlayer({ title, url, onEnded }: { title: string; url: string; onEnded?: () => void }) {
  const isYT = url.includes('youtube.com') || url.includes('youtu.be');
  const isVimeo = url.includes('vimeo.com');
  const ytId = isYT ? url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] : null;
  const vimeoId = isVimeo ? url.match(/vimeo\.com\/(\d+)/)?.[1] : null;
  const e = { position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', border: 'none' };
  const w = { position: 'relative' as const, width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: 'var(--radius)', overflow: 'hidden', background: '#000' };

  if (ytId) {
    const embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`;
    return (
      <div style={w}>
        <iframe
          src={embedUrl}
          title={title}
          style={e}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (vimeoId) return <div style={w}><iframe src={`https://player.vimeo.com/video/${vimeoId}`} title={title} style={e} allowFullScreen /></div>;
  return (
    <video
      controls
      onEnded={() => onEnded?.()}
      style={{ width: '100%', borderRadius: 'var(--radius)', background: '#000', maxHeight: 420 }}
    >
      <source src={url} />
    </video>
  );
}

export default function LearnCoursePage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const sp = useSearchParams();
  const slug = params.slug;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<any | null>(null);
  const [previewGate, setPreviewGate] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-public', slug],
    queryFn: () => coursesApi.getPublic(slug),
  });

  const callbackUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/learn/${slug}?paid=1`;
  }, [slug]);

  const buyMutation = useMutation({
    mutationFn: () => coursePurchasesApi.initiate({ courseId: (course as any).id, callbackUrl }),
    onSuccess: (data: any) => {
      if (data?.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }
      toast.success(data?.message ?? 'Purchase created. Configure Paystack to complete payment.');
    },
    onError: () => toast.error('Failed to initiate purchase (are you logged in?)'),
  });

  // If Paystack redirects back to callbackUrl, show a success hint.
  const paid = sp.get('paid');

  useEffect(() => {
    if (!previewOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewOpen]);

  useEffect(() => {
    if (!previewOpen) return;
    setPreviewGate(false);
  }, [previewOpen, previewLesson?.id]);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: 64, fontFamily: 'var(--font-body)' }}>
      <div className="section-inner" style={{ paddingTop: 64, maxWidth: 920 }}>
        <button onClick={() => router.push('/learn')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-mono)', cursor: 'pointer', marginBottom: 16 }}>
          ← Back to Courses
        </button>

        {isLoading ? (
          <div className="card">Loading…</div>
        ) : !course ? (
          <div className="card">Course not found.</div>
        ) : (
          <div className="learn-course-layout">
            <div>
              <div className="section-label">Adhara Learn Course</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px,4vw,44px)', color: 'var(--text)', marginBottom: 8 }}>
                {(course as any).title}
              </h1>
              <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 14 }}>
                {(course as any).description ?? '—'}
              </p>

              <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 10 }}>OVERVIEW</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, fontSize: 13 }}>
                  <div>
                    <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 4 }}>Delivery</div>
                    <div style={{ fontWeight: 700 }}>{String((course as any).mode ?? 'SELF_PACED').replace(/_/g, ' ')}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 4 }}>Modules</div>
                    <div style={{ fontWeight: 700 }}>{((course as any).modules ?? []).length} published</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 4 }}>Bundles</div>
                    <div style={{ fontWeight: 700 }}>{((course as any).bundles ?? []).length} published</div>
                  </div>
                </div>
                <p style={{ marginTop: 14, marginBottom: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>
                  You can pay for the <strong>entire track</strong> (sidebar), unlock a <strong>bundle</strong> of modules at a package price, or buy <strong>single modules</strong> below. Lessons and quizzes unlock after payment.
                </p>
              </div>

              {paid && (
                <div className="card" style={{ border: '1px solid rgba(0,212,170,0.25)', background: 'rgba(0,212,170,0.06)', marginBottom: 16 }}>
                  Payment received. You can now open this course inside your learner dashboard.
                </div>
              )}

              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 10 }}>Bundles</div>
                {((course as any).bundles ?? []).length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>No bundles yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {((course as any).bundles ?? []).map((b: any) => (
                      <div key={b.id} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface2)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>{b.name}</div>
                          {b.description ? <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{b.description}</div> : null}
                          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>{(b.moduleIds ?? []).length} modules</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold)' }}>₦{Number(b.price ?? 0).toLocaleString()}</div>
                          <button
                            className="btn btn-gold"
                            style={{ padding: '8px 10px', fontSize: 12 }}
                            onClick={async () => {
                              try {
                                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                const cb = `${origin}/learn/${slug}?paid=1`;
                                const data = await bundlePurchasesApi.initiate({ bundleId: b.id, callbackUrl: cb });
                                if (data?.authorizationUrl) window.location.href = data.authorizationUrl;
                                else toast.success(data?.message ?? 'Purchase created. Configure Paystack to complete payment.');
                              } catch {
                                toast.error('Failed to initiate bundle purchase (are you logged in?)');
                              }
                            }}
                          >
                            Buy bundle →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 10 }}>Modules</div>
                {((course as any).modules ?? []).length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>No modules published yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {((course as any).modules ?? []).map((m: any) => (
                      <div key={m.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>
                              Module {String(m.order).padStart(2, '0')} · {m.title}
                            </div>
                            {m.description && (
                              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginTop: 4 }}>
                                {m.description}
                              </div>
                            )}
                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {((m.lessons ?? []) as any[]).slice(0, 5).map((l: any) => (
                                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}>
                                  <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 650, minWidth: 0 }}>
                                    {l.order}. {l.title}
                                  </div>
                                  {l.access === 'PREVIEW' ? (
                                    <button
                                      className="badge badge-open"
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => {
                                        setPreviewLesson(l);
                                        setPreviewOpen(true);
                                      }}
                                    >
                                      Watch preview
                                    </button>
                                  ) : l.access === 'FREE_SIGNUP' ? (
                                    <button
                                      className="badge"
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => router.push(`/signup?next=${encodeURIComponent(`/learn/${slug}`)}`)}
                                    >
                                      Free (sign up)
                                    </button>
                                  ) : (
                                    <span className="badge badge-soon">Locked</span>
                                  )}
                                </div>
                              ))}
                              {(m.lessons?.length ?? 0) > 5 && (
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>+ {m.lessons.length - 5} more lessons</div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                            {m.isFree ? (
                              <span className="badge badge-open">Free</span>
                            ) : (
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold)' }}>
                                ₦{Number(m.price ?? 0).toLocaleString()}
                              </div>
                            )}

                            {!m.isFree && (
                              <button
                                className="btn btn-gold"
                                style={{ padding: '8px 10px', fontSize: 12 }}
                                onClick={async () => {
                                  try {
                                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                    const cb = `${origin}/learn/${slug}?paid=1`;
                                    const data = await modulePurchasesApi.initiate({ moduleId: m.id, callbackUrl: cb });
                                    if (data?.authorizationUrl) window.location.href = data.authorizationUrl;
                                    else toast.success(data?.message ?? 'Purchase created. Configure Paystack to complete payment.');
                                  } catch {
                                    toast.error('Failed to initiate module purchase (are you logged in?)');
                                  }
                                }}
                              >
                                Buy module →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>Full track</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--gold)', marginBottom: 8 }}>
                ₦{Number((course as any).price ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.55 }}>
                Unlocks the whole published curriculum for this course. Bundles and per-module prices are listed on the left if you prefer to pay in parts.
              </div>
              <button className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }} onClick={() => buyMutation.mutate()} disabled={buyMutation.isPending}>
                {buyMutation.isPending ? 'Starting payment…' : 'Buy full track →'}
              </button>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                After payment, sign in and open <strong>Dashboard → My Courses</strong>.
              </div>
            </div>
          </div>
        )}
      </div>

      {previewOpen && previewLesson?.videoUrl && (
        <div className="learn-modal-overlay" role="dialog" aria-modal="true" aria-label="Lesson preview">
          <button className="learn-modal-backdrop" aria-label="Close" onClick={() => setPreviewOpen(false)} />
          <div className="learn-modal" style={{ width: 'min(920px, calc(100vw - 22px))' }}>
            <div className="learn-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span className="badge badge-open">FREE PREVIEW</span>
                <div className="learn-modal-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {previewLesson?.order}. {previewLesson?.title}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewOpen(false)}>Close</button>
            </div>
            <div style={{ padding: 12 }}>
              {previewGate && Number(previewLesson?.order) === 2 ? (
                <div className="card" style={{ padding: 18, border: '1px solid rgba(240,165,0,0.22)', background: 'linear-gradient(135deg, rgba(240,165,0,0.10), rgba(0,212,170,0.06))' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
                    Nice — you’ve finished the free preview.
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
                    Sign up to continue the free Intro module, track your progress, and unlock the next paid modules when you’re ready.
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                    <button className="btn btn-gold btn-sm" onClick={() => router.push(`/signup?next=${encodeURIComponent(`/learn/${slug}`)}`)}>
                      Sign up to continue →
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPreviewGate(false)}>
                      Replay lesson
                    </button>
                  </div>
                </div>
              ) : (
                <PreviewPlayer
                  title={previewLesson?.title ?? 'Lesson preview'}
                  url={previewLesson.videoUrl}
                  onEnded={() => {
                    if (Number(previewLesson?.order) === 2) setPreviewGate(true);
                  }}
                />
              )}
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                  After preview lesson 2, sign up to continue the free intro module and track your progress.
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      if (Number(previewLesson?.order) === 2) setPreviewGate(true);
                      else router.push(`/signup?next=${encodeURIComponent(`/learn/${slug}`)}`);
                    }}
                  >
                    {Number(previewLesson?.order) === 2 ? 'Continue →' : 'Create account'}
                  </button>
                  <button className="btn btn-gold btn-sm" onClick={() => router.push(`/signup?next=${encodeURIComponent(`/learn/${slug}`)}`)}>
                    Sign up to continue →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

