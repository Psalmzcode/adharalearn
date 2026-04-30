'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  learnersApi, enrollmentsApi, assignmentsApi, sessionsApi,
  gradesApi, certificatesApi, announcementsApi, messagesApi,
  cbtApi, notificationsApi, supportTicketsApi, coursesApi, practicalsApi,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { PageLoader, ErrorState, EmptyState, StatusBadge, Avatar, Modal, Field } from '@/components/ui';

dayjs.extend(relativeTime);

// ── LEARNER HOME ──────────────────────────────────────────────────────────────
export function LearnerHome() {
  const { user } = useAuthStore();
  const { data: profile, isLoading } = useQuery({ queryKey: ['learner-me'], queryFn: learnersApi.me });

  // Auto-increment streak on daily login
  useEffect(() => {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('adhara_last_visit');
    if (lastVisit !== today) {
      localStorage.setItem('adhara_last_visit', today);
      learnersApi.incrementStreak().catch(() => {});
    }
  }, []);
  const { data: enrollments = [] } = useQuery({ queryKey: ['enrollments-me'], queryFn: enrollmentsApi.me });
  const activeEnrollment = (enrollments as any[]).find((e: any) => e.status === 'ACTIVE');
  const pendingEnrollment = (enrollments as any[]).find((e: any) => e.status === 'PENDING');
  const { data: tasks = [] } = useQuery({
    queryKey: ['assignments', activeEnrollment?.cohortId],
    queryFn: () => assignmentsApi.byCohort(activeEnrollment!.cohortId),
    enabled: !!activeEnrollment?.cohortId,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', activeEnrollment?.cohortId],
    queryFn: () => sessionsApi.byCohort(activeEnrollment!.cohortId),
    enabled: !!activeEnrollment?.cohortId,
  });
  const { data: mySubmissions = [] } = useQuery({
    queryKey: ['my-submissions', activeEnrollment?.cohortId],
    queryFn: () => assignmentsApi.mySubmissions(activeEnrollment?.cohortId),
    enabled: !!activeEnrollment?.cohortId,
  });

  if (isLoading) return <PageLoader />;
  if (!profile) return <ErrorState message="Could not load your profile." />;

  const submittedIds = new Set((mySubmissions as any[]).map((s: any) => s.assignment?.id));
  const pendingTasks = (tasks as any[]).filter((t: any) => !submittedIds.has(t.id));
  const upcomingSessions = (sessions as any[]).filter((s: any) => new Date(s.scheduledAt) > new Date()).slice(0, 3);
  const liveSessions = (sessions as any[]).filter((s: any) => {
    const t = new Date(s.scheduledAt).getTime();
    const now = Date.now();
    return now >= t && now <= t + s.durationMins * 60000;
  });

  const cohort = activeEnrollment?.cohort;

  return (
    <div>
      {/* Welcome banner */}
      <div style={{ background: 'linear-gradient(135deg,rgba(240,165,0,0.1),rgba(0,212,170,0.06))', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <Avatar name={`${user?.firstName} ${user?.lastName}`} size={52} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })()}, {user?.firstName}! 👋
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>
            {cohort ? `${cohort.track?.name} · ${cohort.name}` : 'No active enrollment'}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            {cohort && <span className="badge badge-data">{cohort.track?.name}</span>}
            {(profile as any).streak > 0 && (
              <span style={{ background: 'rgba(240,165,0,0.1)', border: '1px solid rgba(240,165,0,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>
                🔥 {(profile as any).streak}-day streak
              </span>
            )}
          </div>
        </div>
        {activeEnrollment && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>TRACK PROGRESS</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--gold)' }}>
              {activeEnrollment.progress ?? 0}%
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { icon: '📈', val: `${activeEnrollment?.progress ?? 0}%`, lbl: 'Progress', variant: 'stat-gold' },
          { icon: '📝', val: pendingTasks.length, lbl: 'Pending Tasks', variant: pendingTasks.length > 0 ? 'stat-teal' : '' },
          { icon: '🎥', val: liveSessions.length > 0 ? '● Live' : upcomingSessions.length, lbl: liveSessions.length > 0 ? 'Session Live' : 'Upcoming Sessions', variant: liveSessions.length > 0 ? 'stat-teal' : '' },
          { icon: '🔥', val: (profile as any).streak ?? 0, lbl: 'Day Streak', variant: '' },
        ].map((s) => (
          <div key={s.lbl} className={`stat-card ${s.variant}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.val}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Live session alert */}
      {liveSessions.length > 0 && (
        <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.25)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 1.5s infinite' }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>Live now: {liveSessions[0].title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {liveSessions[0].facilitator?.user
                  ? `${liveSessions[0].facilitator.user.firstName} ${liveSessions[0].facilitator.user.lastName}`
                  : ''} · {liveSessions[0]._count?.attendance ?? 0} participants
              </div>
            </div>
          </div>
          {liveSessions[0].zoomLink && (
            <a href={liveSessions[0].zoomLink} target="_blank" rel="noreferrer" className="btn btn-teal btn-sm">🎥 Join Session</a>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Pending tasks */}
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>
            Pending Tasks {pendingTasks.length > 0 && <span className="badge badge-soon" style={{ marginLeft: 8 }}>{pendingTasks.length}</span>}
          </div>
          {pendingTasks.length === 0
            ? <EmptyState icon="✅" title="All caught up!" message="No pending assignments." />
            : pendingTasks.slice(0, 5).map((t: any) => (
              <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: '1px solid var(--border)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {t.dueAt ? `Due ${dayjs(t.dueAt).fromNow()}` : 'No deadline'}
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* No-enrollment CTA */}
      {!activeEnrollment && !pendingEnrollment && (
        <div style={{ background: 'linear-gradient(135deg,rgba(0,212,170,0.08),rgba(240,165,0,0.05))', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 'var(--radius-lg)', padding: '32px 28px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>You're not enrolled in a cohort yet</div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>Apply for one of our tracks to get access to the full curriculum, live sessions, and your cohort community.</div>
          <a href="/apply" className="btn btn-gold">Apply Now →</a>
        </div>
      )}
      {pendingEnrollment && !activeEnrollment && (
        <div style={{ background: 'rgba(240,165,0,0.06)', border: '1px solid rgba(240,165,0,0.25)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 32, flexShrink: 0 }}>⏳</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>Enrollment under review</div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Your application for {pendingEnrollment.cohort?.track?.name} has been received. Our team will review it within 1–2 business days.</div>
          </div>
        </div>
      )}
      {/* Upcoming sessions */}
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>
            Upcoming Sessions
          </div>
          {upcomingSessions.length === 0
            ? <EmptyState icon="📅" title="No upcoming sessions" message="Check back later." />
            : upcomingSessions.map((s: any) => (
              <div key={s.id} className="session-card">
                <div className="session-time">{dayjs(s.scheduledAt).format('ddd D MMM · HH:mm')}</div>
                <div className="session-dot dot-upcoming" />
                <div className="session-info">
                  <div className="session-title">{s.title}</div>
                  <div className="session-host">
                    {s.facilitator?.user ? `${s.facilitator.user.firstName} ${s.facilitator.user.lastName}` : ''}
                  </div>
                </div>
                {s.zoomLink && (
                  <a href={s.zoomLink} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Join</a>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ── LEARNER TASKS ─────────────────────────────────────────────────────────────
export function LearnerTasks() {
  const [submitModal, setSubmitModal] = useState<any>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ repoUrl: string; deployedUrl: string; notes: string }>();
  const { data: enrollments = [] } = useQuery({ queryKey: ['enrollments-me'], queryFn: enrollmentsApi.me });
  const activeEnrollment = (enrollments as any[]).find((e: any) => e.status === 'ACTIVE');
  const qc = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', activeEnrollment?.cohortId],
    queryFn: () => assignmentsApi.byCohort(activeEnrollment!.cohortId),
    enabled: !!activeEnrollment?.cohortId,
  });
  const { data: mySubmissions = [] } = useQuery({
    queryKey: ['my-submissions', activeEnrollment?.cohortId],
    queryFn: () => assignmentsApi.mySubmissions(activeEnrollment?.cohortId),
    enabled: !!activeEnrollment?.cohortId,
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => assignmentsApi.submit(data),
    onSuccess: () => {
      toast.success('Assignment submitted!');
      qc.invalidateQueries({ queryKey: ['my-submissions'] });
      setSubmitModal(null);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Submission failed'),
  });

  if (isLoading) return <PageLoader />;

  const submissionMap = Object.fromEntries((mySubmissions as any[]).map((s: any) => [s.assignment?.id, s]));

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>Assignments</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
        {(assignments as any[]).filter((a: any) => !submissionMap[a.id]).length} pending ·{' '}
        {(mySubmissions as any[]).length} submitted
      </div>

      {(assignments as any[]).length === 0 ? (
        <EmptyState icon="📝" title="No assignments yet" message="Your facilitator hasn't posted any assignments yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(assignments as any[]).map((a: any) => {
            const sub = submissionMap[a.id];
            const isGraded = sub?.grade;
            const isSubmitted = !!sub;
            const isOverdue = a.dueAt && new Date(a.dueAt) < new Date() && !isSubmitted;

            return (
              <div key={a.id} style={{
                padding: 20, borderRadius: 'var(--radius)',
                border: `1px solid ${isOverdue ? 'rgba(255,77,77,0.3)' : isSubmitted ? 'rgba(0,212,170,0.2)' : 'rgba(240,165,0,0.25)'}`,
                ...(isOverdue ? { background: 'rgba(255,77,77,0.04)' } : isSubmitted ? { background: 'rgba(0,212,170,0.03)' } : { background: 'rgba(240,165,0,0.04)' }),
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{a.title}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isGraded && <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--teal)' }}>{sub.grade.score}/{a.maxScore}</span>}
                    <StatusBadge status={isGraded ? 'GRADED' : isSubmitted ? 'SUBMITTED' : isOverdue ? 'FAILED' : 'PENDING'} />
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>{a.description}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 12, color: isOverdue ? 'var(--red)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {a.dueAt ? (isOverdue ? `⚠ Overdue · was due ${dayjs(a.dueAt).fromNow()}` : `Due ${dayjs(a.dueAt).fromNow()}`) : 'No deadline'}
                  </span>
                  {!isSubmitted && (
                    <button className="btn btn-gold btn-sm" onClick={() => setSubmitModal(a)}>Submit Work</button>
                  )}
                  {isSubmitted && sub.repoUrl && (
                    <a href={sub.repoUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">View Submission ↗</a>
                  )}
                  {isGraded && sub.grade.feedback && (
                    <div style={{ width: '100%', marginTop: 8, padding: '8px 12px', background: 'rgba(0,212,170,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
                      💬 <strong style={{ color: 'var(--text)' }}>Feedback:</strong> {sub.grade.feedback}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Modal */}
      <Modal open={!!submitModal} onClose={() => { setSubmitModal(null); reset(); }} title={`Submit: ${submitModal?.title}`} size="sm">
        <form onSubmit={handleSubmit((data) => submitMutation.mutate({ assignmentId: submitModal.id, ...data }))}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="GitHub / Repo URL" error={errors.repoUrl?.message}>
              <input {...register('repoUrl')} type="url" placeholder="https://github.com/you/project" />
            </Field>
            <Field label="Deployed URL (optional)">
              <input {...register('deployedUrl')} type="url" placeholder="https://your-project.netlify.app" />
            </Field>
            <Field label="Notes (optional)">
              <textarea {...register('notes')} rows={3} placeholder="Any notes for your facilitator..." style={{ resize: 'vertical' }} />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSubmitModal(null); reset(); }}>Cancel</button>
              <button type="submit" className="btn btn-gold btn-sm" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? 'Submitting...' : '📤 Submit'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── LEARNER SESSIONS ──────────────────────────────────────────────────────────
export function LearnerSessions() {
  const { data: enrollments = [] } = useQuery({ queryKey: ['enrollments-me'], queryFn: enrollmentsApi.me });
  const activeEnrollment = (enrollments as any[]).find((e: any) => e.status === 'ACTIVE');
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', activeEnrollment?.cohortId],
    queryFn: () => sessionsApi.byCohort(activeEnrollment!.cohortId),
    enabled: !!activeEnrollment?.cohortId,
  });
  const { data: attendance = [] } = useQuery({ queryKey: ['my-attendance'], queryFn: sessionsApi.myAttendance });

  if (isLoading) return <PageLoader />;

  const attendedIds = new Set((attendance as any[]).filter((a: any) => a.present).map((a: any) => a.session?.id));
  const now = Date.now();
  const upcoming = (sessions as any[]).filter((s: any) => new Date(s.scheduledAt).getTime() > now);
  const past = (sessions as any[]).filter((s: any) => new Date(s.scheduledAt).getTime() <= now);
  const live = upcoming.filter((s: any) => new Date(s.scheduledAt).getTime() <= now + s.durationMins * 60000);

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>Live Sessions</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>All sessions for your cohort</div>

      {live.length > 0 && (
        <div className="card" style={{ border: '1px solid rgba(255,77,77,0.3)', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>LIVE NOW</span>
          </div>
          {live.map((s: any) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text)', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {s.facilitator?.user ? `${s.facilitator.user.firstName} ${s.facilitator.user.lastName}` : ''} · {s._count?.attendance ?? 0} joined
                </div>
              </div>
              {s.zoomLink && (
                <a href={s.zoomLink} target="_blank" rel="noreferrer" className="btn btn-teal">🎥 Join Session</a>
              )}
            </div>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>Upcoming</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {upcoming.map((s: any) => (
              <div key={s.id} className="session-card">
                <div className="session-time">{dayjs(s.scheduledAt).format('ddd D MMM · HH:mm')}</div>
                <div className="session-dot dot-upcoming" />
                <div className="session-info">
                  <div className="session-title">{s.title}</div>
                  <div className="session-host">{s.durationMins} mins</div>
                </div>
                {s.zoomLink && <a href={s.zoomLink} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Add to Cal</a>}
              </div>
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>Past Sessions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {past.slice(0, 10).map((s: any) => (
              <div key={s.id} className="session-card">
                <div className="session-time">{dayjs(s.scheduledAt).format('ddd D MMM')}</div>
                <div className={`session-dot ${attendedIds.has(s.id) ? 'dot-done' : 'dot-upcoming'}`} />
                <div className="session-info">
                  <div className="session-title">{s.title}</div>
                  <div className="session-host">{attendedIds.has(s.id) ? '✓ Attended' : '✗ Missed'}</div>
                </div>
                {s.recordingUrl && <a href={s.recordingUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">▶ Recording</a>}
              </div>
            ))}
          </div>
        </>
      )}

      {(sessions as any[]).length === 0 && <EmptyState icon="📅" title="No sessions scheduled yet" message="Your facilitator will add sessions soon." />}
    </div>
  );
}

// ── LEARNER RESULTS ───────────────────────────────────────────────────────────
export function LearnerResults() {
  const { data: grades = [], isLoading } = useQuery({ queryKey: ['my-grades'], queryFn: gradesApi.mine });

  if (isLoading) return <PageLoader />;

  const graded = (grades as any[]).filter((g: any) => g.grade);
  const avgScore = graded.length
    ? Math.round(graded.reduce((s: number, g: any) => s + (g.grade.score / g.assignment.maxScore) * 100, 0) / graded.length)
    : 0;

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 24 }}>My Results</div>
      <div className="stats-grid">
        {[
          { icon: '🏆', val: `${avgScore}%`, lbl: 'Average Score', variant: 'stat-gold' },
          { icon: '📋', val: graded.length, lbl: 'Assessments Graded', variant: 'stat-teal' },
          { icon: '📝', val: (grades as any[]).length - graded.length, lbl: 'Awaiting Grade', variant: '' },
          { icon: '✅', val: (grades as any[]).filter((g: any) => g.status === 'SUBMITTED').length, lbl: 'Submitted', variant: '' },
        ].map((s) => (
          <div key={s.lbl} className={`stat-card ${s.variant}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.val}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>
      {(grades as any[]).length === 0
        ? <EmptyState icon="📊" title="No results yet" message="Grades will appear here once your assignments are graded." />
        : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr><th>Assignment</th><th>Submitted</th><th>Score</th><th>Grade</th><th>Feedback</th></tr>
              </thead>
              <tbody>
                {(grades as any[]).map((g: any) => {
                  const pct = g.grade ? Math.round((g.grade.score / g.assignment.maxScore) * 100) : null;
                  const gradeLetter = pct !== null ? (pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : 'F') : '—';
                  return (
                    <tr key={g.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{g.assignment?.title}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        {g.submittedAt ? dayjs(g.submittedAt).format('MMM D') : '—'}
                      </td>
                      <td>
                        {pct !== null
                          ? <strong style={{ color: pct >= 75 ? 'var(--teal)' : pct >= 60 ? 'var(--gold)' : 'var(--red)' }}>{pct}%</strong>
                          : <StatusBadge status={g.status} />}
                      </td>
                      <td>{pct !== null && <StatusBadge status={gradeLetter === 'A' || gradeLetter === 'B' ? 'APPROVED' : gradeLetter === 'C' ? 'PENDING' : 'REJECTED'} />}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 200 }}>
                        {g.grade?.feedback ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

// ── LEARNER CERTIFICATES ──────────────────────────────────────────────────────
export function LearnerCertificates() {
  const { data: certs = [], isLoading } = useQuery({ queryKey: ['my-certs'], queryFn: certificatesApi.mine });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 24 }}>My Certificates</div>
      {(certs as any[]).length === 0
        ? <EmptyState icon="🎓" title="No certificates yet" message="Complete a bootcamp track to earn your certificate." />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(certs as any[]).map((c: any) => (
              <div key={c.id} style={{ padding: 24, background: 'linear-gradient(135deg,rgba(240,165,0,0.08),rgba(0,212,170,0.05))', border: '1px solid rgba(240,165,0,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ fontSize: 48 }}>🎓</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 4 }}>
                    {c.trackName} Certificate
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.cohortName} · Issued {dayjs(c.issuedAt).format('MMMM D, YYYY')}</div>
                </div>
                {c.fileUrl && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <a href={c.fileUrl} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm">⬇ Download PDF</a>
                    <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(c.fileUrl); toast.success('Link copied!'); }}>Share Link</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ── LEARNER MESSAGES ──────────────────────────────────────────────────────────
export function LearnerMessages() {
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<any>(null);
  const [text, setText] = useState('');
  const qc = useQueryClient();

  const { data: convos = [], isLoading } = useQuery({ queryKey: ['conversations'], queryFn: messagesApi.conversations });
  const { data: messages = [] } = useQuery({
    queryKey: ['conversation', selected?.facilitatorProfile?.user?.id],
    queryFn: () => messagesApi.conversation(selected.facilitatorProfile.user.id),
    enabled: !!selected?.facilitatorProfile?.user?.id,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: ({ recipientId, text }: { recipientId: string; text: string }) =>
      messagesApi.send(recipientId, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversation'] });
      setText('');
    },
    onError: () => toast.error('Failed to send message'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, height: '72vh' }}>
      {/* Conversation list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)' }}>Messages</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {(convos as any[]).length === 0
            ? <div style={{ padding: 20, fontSize: 13, color: 'var(--muted)' }}>No conversations yet.</div>
            : (convos as any[]).map((c: any) => {
              const other = c.facilitatorProfile?.user;
              if (!other) return null;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{ display: 'flex', gap: 10, padding: '12px 16px', cursor: 'pointer', background: selected?.facilitatorProfile?.user?.id === other.id ? 'rgba(240,165,0,0.06)' : 'transparent', borderBottom: '1px solid var(--border)' }}
                >
                  <Avatar name={`${other.firstName} ${other.lastName}`} url={other.avatarUrl} size={36} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{other.firstName} {other.lastName}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.text?.slice(0, 40)}…</div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Chat panel */}
      {selected ? (
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={`${selected.facilitatorProfile?.user?.firstName} ${selected.facilitatorProfile?.user?.lastName}`} size={34} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
                {selected.facilitatorProfile?.user?.firstName} {selected.facilitatorProfile?.user?.lastName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--teal)' }}>Facilitator</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(messages as any[]).map((m: any) => {
              const isMe = m.senderId === user?.id;
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? 'var(--gold)' : 'var(--surface2)', color: isMe ? '#060A12' : 'var(--text)', fontSize: 13, lineHeight: 1.5 }}>
                    {m.text}
                    <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: 'right' }}>{dayjs(m.sentAt).format('HH:mm')}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) sendMutation.mutate({ recipientId: selected.facilitatorProfile.user.id, text }); } }}
              placeholder="Type a message…"
              style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)', fontSize: 13 }}
            />
            <button className="btn btn-gold btn-sm" disabled={!text.trim() || sendMutation.isPending} onClick={() => { if (text.trim()) sendMutation.mutate({ recipientId: selected.facilitatorProfile.user.id, text }); }}>
              Send
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState icon="💬" title="Select a conversation" message="Choose a contact from the left to start messaging." />
        </div>
      )}
    </div>
  );
}

// ── LEARNER NOTIFICATIONS ─────────────────────────────────────────────────────
export function LearnerNotifications() {
  const { data: notifs = [], isLoading } = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.mine });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>Notifications</div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{(notifs as any[]).length} total</div>
        </div>
      </div>
      {(notifs as any[]).length === 0
        ? <EmptyState icon="🔔" title="All quiet" message="No notifications yet." />
        : (
          <div className="card">
            {(notifs as any[]).map((n: any) => (
              <div key={n.id} style={{ display: 'flex', gap: 14, padding: 16, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>📢</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{dayjs(n.createdAt).fromNow()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ── LEARNER SUPPORT TICKETS ───────────────────────────────────────────────────
export function LearnerSupportTickets() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-tickets-me'],
    queryFn: supportTicketsApi.mineOrAll,
  });

  if (isLoading) return <PageLoader />;

  const rows = tickets as any[];
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
        Support Tickets
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
        Questions sent from your modules and replies from the team.
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="🆘" title="No support tickets yet" message="Open a ticket from My Courses → Ask a question." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((t: any) => (
            <div key={t.id} className="card" style={{ background: 'var(--surface2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 800, color: 'var(--text)' }}>{t.subject}</div>
                <StatusBadge status={t.status ?? 'OPEN'} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                Module: {t.module?.title ?? '—'} · {dayjs(t.createdAt).fromNow()}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {t.body}
              </div>
              {t.reply ? (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Team reply</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{t.reply}</div>
                </div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
                  Awaiting reply.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LearnerPracticals() {
  const [slug, setSlug] = useState<string>('');
  const [moduleId, setModuleId] = useState<string>('');
  const [repoUrl, setRepoUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [submissionText, setSubmissionText] = useState('');
  const qc = useQueryClient();

  const { data: mine = [], isLoading } = useQuery({ queryKey: ['my-courses'], queryFn: coursesApi.mine, retry: false });
  useEffect(() => {
    if (!slug && (mine as any[]).length > 0) {
      const first = (mine as any[])[0];
      setSlug(first?.slug ?? first?.course?.slug ?? '');
    }
  }, [mine, slug]);
  const { data: course } = useQuery({
    queryKey: ['my-course', slug],
    queryFn: () => coursesApi.myCourseOutline(slug),
    enabled: !!slug,
    retry: false,
  });
  const modules = ((course as any)?.modules ?? []) as any[];
  useEffect(() => {
    if (!moduleId && modules.length > 0) setModuleId(modules[0].id);
  }, [moduleId, modules]);

  const { data: practicalData } = useQuery({
    queryKey: ['module-practical', moduleId],
    queryFn: () => practicalsApi.moduleForLearner(moduleId),
    enabled: !!moduleId,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      practicalsApi.submitForModule(moduleId, {
        repoUrl: repoUrl || undefined,
        liveUrl: liveUrl || undefined,
        fileUrl: fileUrl || undefined,
        submissionText: submissionText || undefined,
      }),
    onSuccess: () => {
      toast.success('Practical submitted.');
      qc.invalidateQueries({ queryKey: ['module-practical', moduleId] });
      setSubmissionText('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to submit practical'),
  });

  if (isLoading) return <PageLoader />;
  if ((mine as any[]).length === 0) return <EmptyState icon="🧪" title="No courses yet" message="Buy a course to access practicals." />;

  const template = (practicalData as any)?.template;
  const latest = (practicalData as any)?.latestSubmission;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>Practicals</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 12 }}>
        <div className="card">
          <Field label="Course">
            <select value={slug} onChange={(e) => { setSlug(e.target.value); setModuleId(''); }}>
              {(mine as any[]).map((p: any) => {
                const s = p?.slug ?? p?.course?.slug;
                const t = p?.title ?? p?.course?.title;
                return <option key={s} value={s}>{t}</option>;
              })}
            </select>
          </Field>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {modules.map((m) => (
              <button key={m.id} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', background: moduleId === m.id ? 'var(--surface2)' : undefined }} onClick={() => setModuleId(m.id)}>
                M{String(m.order).padStart(2, '0')} · {m.title}
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Status</div>
          <div style={{ marginTop: 8 }}><StatusBadge status={latest?.status ?? 'PENDING'} /></div>
          {latest?.feedback ? <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>{latest.feedback}</div> : null}
        </div>
      </div>
      <div className="card">
        {!template ? (
          <EmptyState icon="🧪" title="No practical template yet for this module" />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 800, color: 'var(--text)' }}>{template.title}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{template.briefMd}</div>
            <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="GitHub repo URL (optional)" />
            <input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="Live project URL (optional)" />
            <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="File/drive URL (optional)" />
            <textarea value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} placeholder="What you built, challenges, and notes..." rows={5} />
            <button className="btn btn-gold" style={{ justifyContent: 'center' }} onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Submitting…' : 'Submit practical →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── LEARNER SETTINGS ──────────────────────────────────────────────────────────
export function LearnerSettings() {
  const { user, setUser } = useAuthStore();
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    defaultValues: {
      portfolioUrl: '',
      linkedInUrl: '',
      githubUrl: '',
    },
  });
  // Password form uses separate useForm
  const pwForm = useForm<{ oldPassword: string; newPassword: string; confirmPassword: string }>();
  const qc = useQueryClient();

  const { data: profile } = useQuery({ queryKey: ['learner-me'], queryFn: learnersApi.me });

  const updateMutation = useMutation({
    mutationFn: (data: any) => learnersApi.updateMe(data),
    onSuccess: () => { toast.success('Profile updated!'); qc.invalidateQueries({ queryKey: ['learner-me'] }); },
    onError: () => toast.error('Update failed'),
  });

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 24 }}>Settings</div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>Profile</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <Avatar name={`${user?.firstName} ${user?.lastName}`} url={user?.avatarUrl} size={56} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{user?.email} · Learner</div>
          </div>
        </div>
        <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Portfolio URL">
              <input {...register('portfolioUrl')} type="url" placeholder="https://yourportfolio.com" />
            </Field>
            <Field label="LinkedIn URL">
              <input {...register('linkedInUrl')} type="url" placeholder="https://linkedin.com/in/you" />
            </Field>
            <Field label="GitHub URL">
              <input {...register('githubUrl')} type="url" placeholder="https://github.com/you" />
            </Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-gold btn-sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
