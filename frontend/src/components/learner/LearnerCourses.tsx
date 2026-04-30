'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  coursesApi,
  downloadLearnModuleCertificatePdf,
  learnStatsApi,
  lessonProgressApi,
  moduleCompletionsApi,
  moduleQuizzesApi,
  practicalsApi,
  supportTicketsApi,
} from '@/lib/api';
import { PageLoader, EmptyState } from '@/components/ui';

function getPracticeTemplate(moduleTitle?: string) {
  const t = String(moduleTitle ?? '').toLowerCase();
  if (t.includes('javascript') || t.includes('js')) {
    return {
      html: `<h1 id="title">JavaScript Practice</h1>\n<button id="btn">Click me</button>\n<p id="out"></p>`,
      css: `body { font-family: Arial, sans-serif; padding: 16px; }\nbutton { padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; }`,
      js: `const btn = document.getElementById('btn');\nconst out = document.getElementById('out');\nlet count = 0;\nbtn?.addEventListener('click', () => {\n  count += 1;\n  if (out) out.textContent = \`Clicked \${count} time(s)\`;\n});`,
    };
  }
  if (t.includes('react')) {
    return {
      html: `<h1>React Module Practice</h1>\n<p>This mini playground runs plain HTML/CSS. Submit your React app link from the Practicals page.</p>`,
      css: `body { font-family: Arial, sans-serif; padding: 16px; }\nh1 { color: #0f172a; }`,
      js: ``,
    };
  }
  if (t.includes('css')) {
    return {
      html: `<h1>CSS Practice</h1>\n<div class="card">Style this card</div>`,
      css: `body { font-family: Arial, sans-serif; padding: 16px; }\n.card { padding: 16px; border: 1px solid #cbd5e1; border-radius: 12px; }`,
      js: ``,
    };
  }
  return {
    html: `<h1>Hello Adhara!</h1>\n<p>Start building here...</p>`,
    css: `body { font-family: Arial, sans-serif; padding: 16px; }\nh1 { color: #0f172a; }`,
    js: ``,
  };
}

function practicalStatusLabel(status?: string) {
  if (!status) return 'Not submitted';
  if (status === 'SUBMITTED') return 'Pending capstone review';
  if (status === 'CHANGES_REQUESTED') return 'Changes requested';
  if (status === 'APPROVED') return 'Approved - eligible for certificate';
  if (status === 'REJECTED') return 'Not approved';
  return status;
}

function VideoPlayer({
  lessonId,
  url,
  title,
  onProgressSeconds,
}: {
  lessonId: string;
  url: string;
  title: string;
  onProgressSeconds?: (sec: number) => void;
}) {
  const isYT = url.includes('youtube.com') || url.includes('youtu.be');
  const isVimeo = url.includes('vimeo.com');
  const ytId = isYT ? url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] : null;
  const vimeoId = isVimeo ? url.match(/vimeo\.com\/(\d+)/)?.[1] : null;
  const e = { position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', border: 'none' };
  const w = { position: 'relative' as const, width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: 'var(--radius)', overflow: 'hidden' };
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedRef = useRef<number>(0);

  // HTML5 resume + autosave every ~30s
  useEffect(() => {
    if (ytId || vimeoId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await lessonProgressApi.get(lessonId);
        if (cancelled) return;
        const sec = Number((data as any)?.positionSeconds ?? 0);
        if (videoRef.current && sec > 0) {
          videoRef.current.currentTime = sec;
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, ytId, vimeoId]);

  const save = async (sec: number, force?: boolean) => {
    const now = Date.now();
    if (!force && now - lastSavedRef.current < 30_000) return;
    lastSavedRef.current = now;
    try {
      await lessonProgressApi.save(lessonId, Math.floor(sec));
    } catch {
      // ignore
    }
  };

  if (ytId) {
    const embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`;
    const watchUrl = `https://www.youtube.com/watch?v=${ytId}`;
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
        <div
          style={{
            position: 'absolute',
            left: 10,
            right: 10,
            bottom: 10,
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            pointerEvents: 'none',
          }}
        >
          <a
            className="btn btn-ghost btn-sm"
            href={watchUrl}
            target="_blank"
            rel="noreferrer"
            style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,.35)', borderColor: 'rgba(255,255,255,.2)', color: '#fff' }}
          >
            Open on YouTube
          </a>
        </div>
      </div>
    );
  }
  if (vimeoId) return <div style={w}><iframe src={`https://player.vimeo.com/video/${vimeoId}`} title={title} style={e} allowFullScreen /></div>;
  return (
    <video
      ref={videoRef}
      controls
      onTimeUpdate={(ev) => {
        const sec = (ev.target as HTMLVideoElement).currentTime;
        onProgressSeconds?.(sec);
        save(sec);
      }}
      onEnded={(ev) => {
        const v = ev.target as HTMLVideoElement;
        const sec = Number(v.duration || v.currentTime || 0);
        if (sec > 0) {
          onProgressSeconds?.(sec);
          save(sec, true);
        }
      }}
      style={{ width: '100%', borderRadius: 'var(--radius)', background: '#000', maxHeight: 420 }}
    >
      <source src={url} />
    </video>
  );
}

export function LearnerCourses({ onOpenPracticals }: { onOpenPracticals?: () => void } = {}) {
  const qc = useQueryClient();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const { data: mine = [], isLoading } = useQuery({ queryKey: ['my-courses'], queryFn: coursesApi.mine, retry: false });
  const { data: streak } = useQuery({ queryKey: ['learn-streak'], queryFn: learnStatsApi.streak, retry: false });
  const { data: badges = [] } = useQuery({ queryKey: ['learn-badges'], queryFn: learnStatsApi.badges, retry: false });
  const slug = selectedSlug;

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ['my-course', slug],
    queryFn: () => coursesApi.myCourseOutline(slug as string),
    enabled: !!slug,
    retry: false,
  });

  const modules = (course as any)?.modules ?? [];
  const defaultLesson = useMemo(() => {
    const firstUnlockedModule = (modules as any[]).find((m) => m.unlocked);
    const ls = firstUnlockedModule?.lessons ?? [];
    return ls.find((l: any) => l.videoUrl) ?? ls[0] ?? null;
  }, [modules]);

  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [tab, setTab] = useState<'video' | 'notes' | 'quiz' | 'practice' | 'ask'>('video');
  const [askSubject, setAskSubject] = useState('');
  const [askBody, setAskBody] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [submissionText, setSubmissionText] = useState('');
  const [practiceHtml, setPracticeHtml] = useState('<h1>Hello Adhara!</h1>\n<p>Start building here...</p>');
  const [practiceCss, setPracticeCss] = useState('body { font-family: Arial, sans-serif; padding: 16px; }\nh1 { color: #0f172a; }');
  const [practiceJs, setPracticeJs] = useState('');

  useEffect(() => {
    setActiveModuleId(null);
    setExpandedModuleId(null);
    setActiveLessonId(null);
    setTab('video');
  }, [selectedSlug]);

  const selectedModule = (modules as any[]).find((m) => m.id === activeModuleId) ?? (modules as any[]).find((m) => m.unlocked) ?? null;
  const selectedModuleId = selectedModule?.id ?? null;
  const selectedModuleTitle = selectedModule?.title ?? '';

  useEffect(() => {
    if (!selectedModuleId) return;
    const key = `practice:${selectedModuleId}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        const tpl = getPracticeTemplate(selectedModuleTitle);
        setPracticeHtml(tpl.html);
        setPracticeCss(tpl.css);
        setPracticeJs(tpl.js);
        return;
      }
      const parsed = JSON.parse(raw);
      setPracticeHtml(String(parsed?.html ?? ''));
      setPracticeCss(String(parsed?.css ?? ''));
      setPracticeJs(String(parsed?.js ?? ''));
    } catch {
      // ignore
    }
  }, [selectedModuleId, selectedModuleTitle]);

  useEffect(() => {
    if (!selectedModuleId) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          `practice:${selectedModuleId}`,
          JSON.stringify({ html: practiceHtml, css: practiceCss, js: practiceJs, updatedAt: Date.now() }),
        );
      } catch {
        // ignore autosave errors
      }
    }, 1200);
    return () => window.clearTimeout(t);
  }, [selectedModuleId, practiceHtml, practiceCss, practiceJs]);

  const savePracticeDraft = () => {
    if (!selectedModuleId) return;
    const key = `practice:${selectedModuleId}`;
    try {
      localStorage.setItem(key, JSON.stringify({ html: practiceHtml, css: practiceCss, js: practiceJs, updatedAt: Date.now() }));
      toast.success('Practice draft saved');
    } catch {
      toast.error('Could not save draft');
    }
  };

  const pushPracticeToSubmission = () => {
    const text = [
      'Playground submission',
      '',
      'HTML:',
      '```html',
      practiceHtml,
      '```',
      '',
      'JavaScript:',
      '```js',
      practiceJs,
      '```',
      '',
      'CSS:',
      '```css',
      practiceCss,
      '```',
    ].join('\n');
    setSubmissionText(text);
    setTab('ask');
    toast.success('Draft copied. Open Practicals page to submit.');
  };

  const resetPracticeTemplate = () => {
    const tpl = getPracticeTemplate(active.mod?.title);
    setPracticeHtml(tpl.html);
    setPracticeCss(tpl.css);
    setPracticeJs(tpl.js);
    toast.success('Template reset');
  };

  const active = useMemo(() => {
    const mod = (modules as any[]).find((m) => m.id === activeModuleId) ?? (modules as any[]).find((m) => m.unlocked) ?? null;
    const lessons = mod?.lessons ?? [];
    const lesson = lessons.find((l: any) => l.id === activeLessonId) ?? lessons.find((l: any) => l.videoUrl) ?? lessons[0] ?? defaultLesson;
    return { mod, lesson };
  }, [modules, activeModuleId, activeLessonId, defaultLesson]);

  const progress = useMemo(() => {
    const total = (modules as any[]).length || 1;
    const done = (modules as any[]).filter((m) => m.completed).length;
    const pct = Math.round((done / total) * 100);
    const watchedMinutes = Math.round(
      (modules as any[])
        .flatMap((m: any) => (m.unlocked ? (m.lessons ?? []) : []))
        .reduce((acc: number, l: any) => {
          const durSec = Math.max(0, Math.floor(Number(l.durationMins ?? 0) * 60));
          const posSec = Math.max(0, Math.floor(Number(l.positionSeconds ?? 0)));
          return acc + Math.min(posSec, durSec || posSec);
        }, 0) / 60,
    );
    return { total, done, pct, watchedMinutes };
  }, [modules]);

  const handleProgressSeconds = (lessonId: string, sec: number) => {
    if (!slug) return;
    qc.setQueryData(['my-course', slug], (prev: any) => {
      if (!prev?.modules) return prev;
      const next = { ...prev };
      next.modules = (prev.modules as any[]).map((m) => {
        if (!m?.lessons) return m;
        const lessons = (m.lessons as any[]).map((l) => {
          if (l?.id !== lessonId) return l;
          const pos = Math.max(0, Math.floor(Number(sec || 0)));
          const durSec = Math.max(0, Math.floor(Number(l.durationMins ?? 0) * 60));
          const watched = durSec ? pos >= Math.floor(durSec * 0.9) : false;
          return { ...l, positionSeconds: pos, watched };
        });
        const totalLessons = (lessons as any[]).length;
        const watchedCount = (lessons as any[]).filter((l: any) => !!l.watched).length;
        const watchedPct = totalLessons > 0 ? Math.round((watchedCount / totalLessons) * 100) : 0;
        return { ...m, lessons, watch: { watchedCount, totalLessons, watchedPct } };
      });
      return next;
    });
  };

  const completeMutation = useMutation({
    mutationFn: (moduleId: string) => moduleCompletionsApi.complete(moduleId, {}),
    onSuccess: (res: any) => {
      toast.success(res?.certificate ? 'Module completed. Certificate issued.' : 'Module completed.');
      qc.invalidateQueries({ queryKey: ['learn-streak'] });
      qc.invalidateQueries({ queryKey: ['learn-badges'] });
      qc.invalidateQueries({ queryKey: ['my-course', selectedSlug] });
    },
    onError: () => toast.error('Failed to complete module'),
  });

  const { data: quizQuestions = [] } = useQuery({
    queryKey: ['module-quiz-questions', active.mod?.id],
    queryFn: () => moduleQuizzesApi.questions(active.mod.id),
    enabled: !!active.mod?.id && tab === 'quiz',
    retry: false,
  });

  const [quizAnswers, setQuizAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const quizSubmit = useMutation({
    mutationFn: () =>
      moduleQuizzesApi.submit(
        active.mod.id,
        Object.entries(quizAnswers).map(([questionId, answer]) => ({ questionId, answer })),
      ),
    onSuccess: (res: any) => {
      toast.success(res?.passed ? `Passed (${res.percent}%). Next module unlocked.` : `Score ${res.percent}%. You need 70% to pass.`);
      qc.invalidateQueries({ queryKey: ['learn-streak'] });
      qc.invalidateQueries({ queryKey: ['learn-badges'] });
      qc.invalidateQueries({ queryKey: ['my-course', selectedSlug] });
    },
    onError: () => toast.error('Quiz submit failed'),
  });

  const askMutation = useMutation({
    mutationFn: () => supportTicketsApi.create({ moduleId: active.mod.id, subject: askSubject, body: askBody }),
    onSuccess: () => {
      setAskSubject('');
      setAskBody('');
      toast.success('Question sent. You’ll get a reply within 24 hours.');
    },
    onError: () => toast.error('Failed to send question'),
  });
  const { data: practicalData } = useQuery({
    queryKey: ['module-practical', active.mod?.id],
    queryFn: () => practicalsApi.moduleForLearner(active.mod.id),
    enabled: !!active.mod?.id && active.mod?.unlocked,
    retry: false,
  });
  const practicalSubmit = useMutation({
    mutationFn: () =>
      practicalsApi.submitForModule(active.mod.id, {
        repoUrl: repoUrl || undefined,
        liveUrl: liveUrl || undefined,
        fileUrl: fileUrl || undefined,
        submissionText: submissionText || undefined,
      }),
    onSuccess: () => {
      toast.success('Practical submitted. Waiting for review.');
      setSubmissionText('');
      qc.invalidateQueries({ queryKey: ['module-practical', active.mod?.id] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to submit practical'),
  });
  const practicalTemplate = (practicalData as any)?.template;
  const practicalSubmission = (practicalData as any)?.latestSubmission;
  const practicalApproved = practicalSubmission?.status === 'APPROVED';
  const practicalRequired = !!practicalTemplate?.requiredForCompletion;
  const relatedBundles = useMemo(
    () =>
      (((course as any)?.bundles ?? []) as any[]).filter(
        (b) => b?.purchased && Array.isArray(b?.moduleIds) && active.mod?.id && b.moduleIds.includes(active.mod.id),
      ),
    [course, active.mod?.id],
  );
  const activeBundle = relatedBundles[0] ?? null;
  const { data: bundlePracticalData } = useQuery({
    queryKey: ['bundle-practical', activeBundle?.id],
    queryFn: () => practicalsApi.bundleForLearner(activeBundle.id),
    enabled: !!activeBundle?.id,
    retry: false,
  });
  const { data: trackPracticalData } = useQuery({
    queryKey: ['track-practical', (course as any)?.id],
    queryFn: () => practicalsApi.trackForLearner((course as any).id),
    enabled: !!(course as any)?.id,
    retry: false,
  });
  const bundleSubmit = useMutation({
    mutationFn: () =>
      practicalsApi.submitForBundle(activeBundle.id, {
        repoUrl: repoUrl || undefined,
        liveUrl: liveUrl || undefined,
        fileUrl: fileUrl || undefined,
        submissionText: submissionText || undefined,
      }),
    onSuccess: () => {
      toast.success('Bundle practical submitted.');
      qc.invalidateQueries({ queryKey: ['bundle-practical', activeBundle?.id] });
      qc.invalidateQueries({ queryKey: ['my-course', selectedSlug] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to submit bundle practical'),
  });
  const trackSubmit = useMutation({
    mutationFn: () =>
      practicalsApi.submitForTrack((course as any).id, {
        repoUrl: repoUrl || undefined,
        liveUrl: liveUrl || undefined,
        fileUrl: fileUrl || undefined,
        submissionText: submissionText || undefined,
      }),
    onSuccess: () => {
      toast.success('Track capstone submitted.');
      qc.invalidateQueries({ queryKey: ['track-practical', (course as any)?.id] });
      qc.invalidateQueries({ queryKey: ['my-course', selectedSlug] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to submit track capstone'),
  });

  if (isLoading) return <PageLoader />;
  if ((mine as any[]).length === 0) {
    return <EmptyState icon="🎬" title="No courses yet" message="Buy a course on Adhara Learn to start learning. Visit /learn." />;
  }
  if (!selectedSlug) {
    return (
      <div className="card learner-courses-sidebar-card" style={{ padding: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--text)', marginBottom: 12 }}>
          My Courses
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {(mine as any[]).map((p: any) => {
            const itemSlug = p.slug ?? p.course?.slug;
            const itemTitle = p.title ?? p.course?.title ?? 'Untitled course';
            return (
              <button
                key={p.id ?? p.course?.id ?? itemSlug}
                onClick={() => setSelectedSlug(itemSlug)}
                className="learner-module-card"
                style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)' }}
              >
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{itemTitle}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{itemSlug}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="learner-courses-shell" style={{ minWidth: 0 }}>
      <div style={{ minWidth: 0 }}>
        {loadingCourse ? (
          <PageLoader />
        ) : !course ? (
          <EmptyState icon="🔒" title="Course locked" message="If you just paid, refresh. Otherwise, you may not have access." />
        ) : (
          <>
            <div className="learnx-breadcrumb">
              <button className="learnx-breadcrumb-link" onClick={() => setSelectedSlug(null)}>My Courses</button>
              <span className="learnx-breadcrumb-sep">›</span>
              <span className="learnx-breadcrumb-current">{(course as any).title}</span>
            </div>
            <div className="learnx-hero">
              <div>
                <div className="learnx-kicker">{(course as any).title}</div>
                <div className="learnx-title">{(course as any).title}</div>
                <div className="learnx-desc">{(course as any).description ?? '—'}</div>
              </div>
              <div className="learnx-ring-wrap">
                <div className="learnx-ring">{progress.pct}%</div>
                <div className="learnx-ring-sub">{progress.done} of {progress.total} done</div>
              </div>
            </div>
            {!!(course as any)?.whatsappLink && (
              <div style={{ marginBottom: 12 }}>
                <a
                  href={(course as any).whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-teal"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  💬 Join WhatsApp Community
                </a>
              </div>
            )}
            <div className="learnx-stats">
              <div className="learnx-stat"><span>📚</span><div><strong>{progress.total}</strong><small>Modules</small></div></div>
              <div className="learnx-stat"><span>🔥</span><div><strong>{streak?.count ?? 0}</strong><small>Day streak</small></div></div>
              <div className="learnx-stat"><span>✅</span><div><strong>{progress.pct}%</strong><small>Complete</small></div></div>
              <div className="learnx-stat"><span>⏱</span><div><strong>{progress.watchedMinutes ?? 0} min</strong><small>Watched</small></div></div>
            </div>

            {modules.length === 0 ? (
              <EmptyState icon="📦" title="No modules yet" message="This course has no published modules." />
            ) : (
              <div className="learnx-content">
                <div className="learnx-viewer-panel">
                  <div className="lesson-viewer" style={{ minWidth: 0 }}>
                    <div className="video-area">
                      {active.lesson?.videoUrl ? (
                        <VideoPlayer
                          lessonId={active.lesson.id}
                          url={active.lesson.videoUrl}
                          title={active.lesson.title}
                          onProgressSeconds={(sec) => handleProgressSeconds(active.lesson.id, sec)}
                        />
                      ) : (
                        <div className="video-thumb"><div className="video-label">No video for selected lesson</div></div>
                      )}
                    </div>
                    <div className="lesson-tabs">
                      <button className={`lesson-tab${tab === 'video' ? ' active' : ''}`} onClick={() => setTab('video')}>Video</button>
                      <button className={`lesson-tab${tab === 'notes' ? ' active' : ''}`} onClick={() => setTab('notes')}>Notes</button>
                      <button className={`lesson-tab${tab === 'quiz' ? ' active' : ''}`} onClick={() => setTab('quiz')}>Quiz</button>
                      <button className={`lesson-tab${tab === 'practice' ? ' active' : ''}`} onClick={() => setTab('practice')}>Practice</button>
                      <button className={`lesson-tab${tab === 'ask' ? ' active' : ''}`} onClick={() => setTab('ask')}>Ask</button>
                    </div>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => onOpenPracticals?.()}>
                        Open Practicals page
                      </button>
                    </div>

                    {!active.mod ? (
                      <EmptyState icon="📦" title="Pick a module" message="Select an unlocked module to start." />
                    ) : (
                      <>
                        {tab === 'video' && (
                          <div className="tab-content active">
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                              {active.lesson?.order}. {active.lesson?.title}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                              Module {String(active.mod?.order ?? '').padStart(2, '0')} · {Number(active.lesson?.durationMins ?? 0)} min
                            </div>
                          </div>
                        )}
                        {tab === 'notes' && (
                          <div className="tab-content active" style={{ color: 'var(--muted)', lineHeight: 1.8, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                            {active.mod.notesMd ?? 'No notes/cheat sheet added yet for this module.'}
                          </div>
                        )}
                        {tab === 'quiz' && (
                          <div className="tab-content active">
                            {(quizQuestions as any[]).length === 0 ? (
                              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No quiz questions yet for this module.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {(quizQuestions as any[]).map((q) => (
                                  <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--surface2)' }}>
                                    <div style={{ fontWeight: 850, color: 'var(--text)', fontSize: 13, marginBottom: 8 }}>
                                      {q.order}. {q.prompt}
                                    </div>
                                    <div style={{ display: 'grid', gap: 6 }}>
                                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                                        const label = q[`option${opt}`];
                                        return (
                                          <label key={opt} style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text)', fontSize: 13 }}>
                                            <input type="radio" name={q.id} checked={quizAnswers[q.id] === opt} onChange={() => setQuizAnswers((s) => ({ ...s, [q.id]: opt }))} />
                                            <span><strong>{opt}.</strong> {label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                                <button className="btn btn-gold" style={{ justifyContent: 'center' }} onClick={() => quizSubmit.mutate()} disabled={quizSubmit.isPending}>
                                  {quizSubmit.isPending ? 'Submitting…' : 'Submit quiz →'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {tab === 'practice' && (
                          <div className="tab-content active" style={{ display: 'grid', gap: 10 }}>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Test what you just learned in real time.</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>HTML</div>
                                <textarea value={practiceHtml} onChange={(e) => setPracticeHtml(e.target.value)} rows={12} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>CSS</div>
                                <textarea value={practiceCss} onChange={(e) => setPracticeCss(e.target.value)} rows={12} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }} />
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>JavaScript (optional)</div>
                              <textarea value={practiceJs} onChange={(e) => setPracticeJs(e.target.value)} rows={10} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button type="button" className="btn btn-teal" onClick={savePracticeDraft}>Save Draft</button>
                              <button type="button" className="btn" onClick={resetPracticeTemplate}>Reset Template</button>
                              <button type="button" className="btn btn-gold" onClick={pushPracticeToSubmission}>Copy for Practical Submission</button>
                            </div>
                            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                              <iframe title="Practice Preview" sandbox="allow-scripts" style={{ width: '100%', height: 320, border: 'none', background: '#fff' }} srcDoc={`<!doctype html><html><head><style>${practiceCss}</style></head><body>${practiceHtml}<script>${practiceJs}<\/script></body></html>`} />
                            </div>
                          </div>
                        )}
                        {tab === 'ask' && (
                          <div className="tab-content active" style={{ display: 'grid', gap: 10 }}>
                            <input value={askSubject} onChange={(e) => setAskSubject(e.target.value)} placeholder="Subject (e.g., I'm confused about flexbox)" style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }} />
                            <textarea value={askBody} onChange={(e) => setAskBody(e.target.value)} placeholder="Explain what you tried and where you're stuck…" rows={6} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }} />
                            <button className="btn btn-gold" style={{ justifyContent: 'center' }} onClick={() => askMutation.mutate()} disabled={askMutation.isPending || !askSubject || !askBody}>
                              {askMutation.isPending ? 'Sending…' : 'Send question →'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="learnx-modules-panel">
                  <div className="bundle-card" style={{ marginBottom: 12 }}>
                    <div className="bundle-head">
                      <div className="bundle-name">{activeBundle?.name ?? 'Starter Bundle'}</div>
                      <div className="bundle-badge">{(activeBundle?.completionEligible || (course as any)?.track?.completionEligible) ? 'Eligible' : 'In progress'}</div>
                    </div>
                    {relatedBundles.length > 0 ? (
                      relatedBundles.slice(0, 1).map((b: any) => (
                        <div className="bundle-step" key={b.id}>
                          <div className={`step-check ${b.completionEligible ? 'done' : 'active'}`}>{b.completionEligible ? '✓' : '→'}</div>
                          <div className={`step-label ${b.completionEligible ? 'done' : 'active'}`}>{b.name}</div>
                        </div>
                      ))
                    ) : (
                      <div className="bundle-step">
                        <div className={`step-check ${(course as any)?.track?.completionEligible ? 'done' : 'active'}`}>{(course as any)?.track?.completionEligible ? '✓' : '→'}</div>
                        <div className={`step-label ${(course as any)?.track?.completionEligible ? 'done' : 'active'}`}>Complete modules + capstone</div>
                      </div>
                    )}
                  </div>
                  <div className="learnx-panel-head">
                    <div className="learnx-panel-title">Modules</div>
                    <div className="learnx-panel-count">{progress.total} modules · {progress.done} completed</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(modules as any[]).map((m) => (
                      <div key={m.id} className={`learnx-module-card${m.id === active.mod?.id ? ' active' : ''}${!m.unlocked ? ' locked' : ''}`}>
                        <button
                          className="learnx-module-head"
                          onClick={() => {
                            if (!m.unlocked) return;
                            setActiveModuleId(m.id);
                            setExpandedModuleId(expandedModuleId === m.id ? null : m.id);
                            setActiveLessonId(null);
                            setTab('video');
                          }}
                          disabled={!m.unlocked}
                        >
                          <div className={`learnx-module-num${m.completed ? ' done' : m.id === active.mod?.id ? ' active' : !m.unlocked ? ' locked' : ''}`}>
                            {String(m.order).padStart(2, '0')}
                          </div>
                          <div className="learnx-module-info">
                            <div className="learnx-module-label">Module {String(m.order).padStart(2, '0')}</div>
                            <div className="learnx-module-name">{m.title}</div>
                          </div>
                          <div className="learnx-module-status" style={{ textAlign: 'right' }}>
                            {m.completed ? <span className="learnx-pill complete">Complete</span> : m.id === active.mod?.id ? <span className="learnx-pill active">Now Playing</span> : m.unlocked ? <span className="learnx-pill unlocked">Unlocked</span> : <span className="learnx-pill locked">Locked</span>}
                            {!!m?.watch?.totalLessons && (
                              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
                                {m.watch.watchedCount}/{m.watch.totalLessons} watched
                              </div>
                            )}
                          </div>
                        </button>
                        <div className="learnx-module-progress">
                          <div className="learnx-module-progress-fill" style={{ width: `${m.completed ? 100 : Number(m?.watch?.watchedPct ?? 0)}%` }} />
                        </div>
                        {!!(m.lessons?.length) && expandedModuleId === m.id && (
                          <div className="learnx-module-lessons">
                            {(m.lessons as any[]).map((ls: any) => (
                              <div
                                key={ls.id}
                                onClick={() => {
                                  if (!m.unlocked) return;
                                  setActiveModuleId(m.id);
                                  setActiveLessonId(ls.id);
                                  setTab('video');
                                }}
                                className={`learnx-lesson-item${active.lesson?.id === ls.id ? ' playing' : ''}`}
                              >
                                <span className={`learnx-lesson-icon${active.lesson?.id === ls.id ? ' play' : ''}`}>{active.lesson?.id === ls.id ? '●' : '▶'}</span>
                                <span className="learnx-lesson-name">{ls.order}. {ls.title}</span>
                                <span className="learnx-lesson-dur">{Number(ls.durationMins ?? 0)} min</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {active.mod?.unlocked && !active.mod?.completed && (
                    <button
                      className="mark-complete-btn"
                      style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                      onClick={() => completeMutation.mutate(active.mod.id)}
                      disabled={completeMutation.isPending || (practicalRequired && !practicalApproved)}
                    >
                      {completeMutation.isPending ? 'Completing…' : 'Mark module complete →'}
                    </button>
                  )}
                  {practicalRequired && !practicalApproved && active.mod?.unlocked && !active.mod?.completed && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                      Practical must be approved before completion.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

