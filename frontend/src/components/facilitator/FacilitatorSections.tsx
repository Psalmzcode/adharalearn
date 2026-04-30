'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  learnersApi, sessionsApi, assignmentsApi, gradesApi,
  announcementsApi, messagesApi, reportsApi, facilitatorsApi,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  PageLoader, ErrorState, EmptyState, StatusBadge, Avatar,
  Modal, ConfirmDialog, Field,
} from '@/components/ui';

dayjs.extend(relativeTime);

// ── FACILITATOR HOME ──────────────────────────────────────────────────────────
export function FacilitatorHome() {
  const { data: fac, isLoading } = useQuery({ queryKey: ['fac-me'], queryFn: () => facilitatorsApi.me() });
  const activeCohort = (fac as any)?.cohorts?.find((c: any) => c.status === 'ACTIVE');

  const { data: atRisk = [] } = useQuery({
    queryKey: ['at-risk', activeCohort?.id],
    queryFn: () => learnersApi.atRisk(activeCohort!.id),
    enabled: !!activeCohort?.id,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', activeCohort?.id],
    queryFn: () => sessionsApi.byCohort(activeCohort!.id),
    enabled: !!activeCohort?.id,
  });

  if (isLoading) return <PageLoader />;

  const now = Date.now();
  const todaySessions = (sessions as any[]).filter((s: any) => {
    const d = new Date(s.scheduledAt);
    return d.toDateString() === new Date().toDateString();
  });

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
        {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })()}, {(fac as any)?.user?.firstName} 👋
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
        {activeCohort ? `${activeCohort.track?.name} · ${activeCohort.name}` : 'No active cohort'}
      </p>

      <div className="stats-grid">
        {[
          { icon: '👥', val: activeCohort?._count?.enrollments ?? 0, lbl: 'Enrolled Learners', variant: 'stat-teal' },
          { icon: '⚠️', val: (atRisk as any[]).length, lbl: 'At Risk', variant: (atRisk as any[]).length > 0 ? 'stat-gold' : '' },
          { icon: '🎥', val: (sessions as any[]).length, lbl: 'Total Sessions', variant: '' },
          { icon: '📅', val: todaySessions.length, lbl: 'Today\'s Sessions', variant: '' },
        ].map((s) => (
          <div key={s.lbl} className={`stat-card ${s.variant}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.val}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>
            At-Risk Learners ⚠️
          </div>
          {(atRisk as any[]).length === 0
            ? <EmptyState icon="✅" title="No at-risk learners" message="All learners are on track." />
            : (atRisk as any[]).slice(0, 5).map((l: any) => (
              <div key={l.learnerId} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <Avatar name={l.name} url={l.avatarUrl} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--red)' }}>{l.issues.join(' · ')}</div>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{l.attendancePct}% att.</div>
              </div>
            ))}
        </div>

        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>Today's Sessions</div>
          {todaySessions.length === 0
            ? <EmptyState icon="📅" title="No sessions today" />
            : todaySessions.map((s: any) => {
              const t = new Date(s.scheduledAt).getTime();
              const isLive = now >= t && now <= t + s.durationMins * 60000;
              return (
                <div key={s.id} className="session-card">
                  <div className="session-time">{dayjs(s.scheduledAt).format('HH:mm')}</div>
                  <div className={`session-dot ${isLive ? 'dot-live' : 'dot-upcoming'}`} />
                  <div className="session-info">
                    <div className="session-title">{s.title}</div>
                    <div className="session-host">{s.durationMins} mins</div>
                  </div>
                  {s.zoomLink && <a href={s.zoomLink} target="_blank" rel="noreferrer" className={`btn ${isLive ? 'btn-teal' : 'btn-ghost'} btn-sm`}>{isLive ? '● Live' : 'Start'}</a>}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ── FACILITATOR LEARNERS ──────────────────────────────────────────────────────
export function FacilitatorLearners() {
  const [search, setSearch] = useState('');
  const { data: fac } = useQuery({ queryKey: ['fac-me'], queryFn: () => facilitatorsApi.me() });
  const activeCohortId = (fac as any)?.cohorts?.find((c: any) => c.status === 'ACTIVE')?.id;

  const { data: learners = [], isLoading } = useQuery({
    queryKey: ['learners', activeCohortId],
    queryFn: () => learnersApi.list({ cohortId: activeCohortId }),
    enabled: !!activeCohortId,
  });
  const { data: atRisk = [] } = useQuery({
    queryKey: ['at-risk', activeCohortId],
    queryFn: () => learnersApi.atRisk(activeCohortId!),
    enabled: !!activeCohortId,
  });
  const atRiskIds = new Set((atRisk as any[]).map((l: any) => l.learnerId));

  if (isLoading) return <PageLoader />;

  const filtered = (learners as any[]).filter((l: any) => {
    const name = `${l.user.firstName} ${l.user.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>My Learners</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
        {(learners as any[]).length} enrolled · {(atRisk as any[]).length} at risk
      </div>
      <div style={{ marginBottom: 20 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search learners..." style={{ width: '100%', maxWidth: 360, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)', fontSize: 13 }} />
      </div>
      {filtered.length === 0
        ? <EmptyState icon="👥" title="No learners found" />
        : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr><th>Learner</th><th>Progress</th><th>Status</th><th>Risk</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((l: any) => {
                  const enrollment = l.enrollments?.[0];
                  const risk = atRiskIds.has(l.id);
                  return (
                    <tr key={l.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={`${l.user.firstName} ${l.user.lastName}`} url={l.user.avatarUrl} size={32} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{l.user.firstName} {l.user.lastName}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div className="progress-fill" style={{ width: `${enrollment?.progress ?? 0}%` }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{enrollment?.progress ?? 0}%</span>
                        </div>
                      </td>
                      <td><StatusBadge status={enrollment?.status ?? 'PENDING'} /></td>
                      <td>
                        {risk
                          ? <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', background: 'rgba(255,77,77,0.1)', padding: '2px 8px', borderRadius: 20 }}>⚠ At Risk</span>
                          : <span style={{ fontSize: 11, color: 'var(--teal)' }}>On Track</span>}
                      </td>
                      <td><button className="btn btn-ghost btn-sm">Message</button></td>
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

// ── FACILITATOR SUBMISSIONS ───────────────────────────────────────────────────
export function FacilitatorSubmissions() {
  const [gradeModal, setGradeModal] = useState<any>(null);
  const { register, handleSubmit, reset, setValue } = useForm<{ score: number; feedback: string }>();
  const { data: fac } = useQuery({ queryKey: ['fac-me'], queryFn: () => facilitatorsApi.me() });
  const activeCohortId = (fac as any)?.cohorts?.find((c: any) => c.status === 'ACTIVE')?.id;
  const qc = useQueryClient();

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', activeCohortId],
    queryFn: () => assignmentsApi.byCohort(activeCohortId!),
    enabled: !!activeCohortId,
  });
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['submissions', selectedAssignment || (assignments as any[])[0]?.id],
    queryFn: () => gradesApi.byAssignment(selectedAssignment || (assignments as any[])[0]?.id),
    enabled: !!(selectedAssignment || (assignments as any[])[0]?.id),
  });

  const gradeMutation = useMutation({
    mutationFn: (data: { submissionId: string; score: number; feedback: string }) =>
      gradesApi.grade({ ...data, facilitatorId: (fac as any)?.id }),
    onSuccess: () => {
      toast.success('Grade saved!');
      qc.invalidateQueries({ queryKey: ['submissions'] });
      setGradeModal(null);
      reset();
    },
    onError: () => toast.error('Failed to save grade'),
  });

  if (isLoading && selectedAssignment) return <PageLoader />;

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 20 }}>Submissions</div>
      <div style={{ marginBottom: 20 }}>
        <select
          value={selectedAssignment || (assignments as any[])[0]?.id || ''}
          onChange={(e) => setSelectedAssignment(e.target.value)}
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)', fontSize: 13, minWidth: 280 }}
        >
          {(assignments as any[]).map((a: any) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
      </div>

      {(submissions as any[]).length === 0
        ? <EmptyState icon="📋" title="No submissions yet" message="Learners haven't submitted this assignment yet." />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(submissions as any[]).map((s: any) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Avatar name={`${s.learner?.user?.firstName} ${s.learner?.user?.lastName}`} url={s.learner?.user?.avatarUrl} size={34} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{s.learner?.user?.firstName} {s.learner?.user?.lastName}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.submittedAt ? dayjs(s.submittedAt).fromNow() : 'Not submitted'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {s.grade ? (
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--teal)' }}>
                      {s.grade.score}/{(assignments as any[]).find((a: any) => a.id === (selectedAssignment || (assignments as any[])[0]?.id))?.maxScore ?? 100}
                    </span>
                  ) : null}
                  <StatusBadge status={s.status} />
                  {s.repoUrl && <a href={s.repoUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">View ↗</a>}
                  <button
                    className="btn btn-gold btn-sm"
                    onClick={() => { setGradeModal(s); setValue('score', s.grade?.score ?? 0); setValue('feedback', s.grade?.feedback ?? ''); }}
                  >
                    {s.grade ? 'Edit Grade' : 'Grade'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      <Modal open={!!gradeModal} onClose={() => { setGradeModal(null); reset(); }} title="Grade Submission" size="sm">
        {gradeModal && (
          <form onSubmit={handleSubmit((data) => gradeMutation.mutate({ submissionId: gradeModal.id, score: Number(data.score), feedback: data.feedback }))}>
            <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{gradeModal.learner?.user?.firstName} {gradeModal.learner?.user?.lastName}</strong>
              {gradeModal.repoUrl && <> · <a href={gradeModal.repoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>View submission ↗</a></>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Score (out of 100)" required>
                <input {...register('score', { required: true, min: 0, max: 100 })} type="number" min={0} max={100} />
              </Field>
              <Field label="Feedback (optional)">
                <textarea {...register('feedback')} rows={3} placeholder="Constructive feedback for the learner..." style={{ resize: 'vertical' }} />
              </Field>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setGradeModal(null); reset(); }}>Cancel</button>
                <button type="submit" className="btn btn-gold btn-sm" disabled={gradeMutation.isPending}>
                  {gradeMutation.isPending ? 'Saving...' : 'Save Grade'}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

// ── FACILITATOR SESSIONS ──────────────────────────────────────────────────────
export function FacilitatorSessions() {
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const { register, handleSubmit, reset, setValue } = useForm<any>();
  const { data: fac } = useQuery({ queryKey: ['fac-me'], queryFn: () => facilitatorsApi.me() });
  const activeCohort = (fac as any)?.cohorts?.find((c: any) => c.status === 'ACTIVE');
  const qc = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', activeCohort?.id],
    queryFn: () => sessionsApi.byCohort(activeCohort!.id),
    enabled: !!activeCohort?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => sessionsApi.create({ ...data, cohortId: activeCohort!.id, facilitatorId: (fac as any)?.id }),
    onSuccess: () => { toast.success('Session created!'); qc.invalidateQueries({ queryKey: ['sessions'] }); setCreateModal(false); reset(); },
    onError: () => toast.error('Failed to create session'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => sessionsApi.update(id, data),
    onSuccess: () => { toast.success('Session updated!'); qc.invalidateQueries({ queryKey: ['sessions'] }); setEditModal(null); reset(); },
    onError: () => toast.error('Failed to update session'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sessionsApi.remove(id),
    onSuccess: () => { toast.success('Session deleted'); qc.invalidateQueries({ queryKey: ['sessions'] }); setDeleteConfirm(null); },
    onError: () => toast.error('Failed to delete session'),
  });

  if (isLoading) return <PageLoader />;

  const SessionForm = ({ isEdit }: { isEdit?: boolean }) => (
    <form onSubmit={handleSubmit((data) => isEdit ? updateMutation.mutate({ id: editModal.id, ...data }) : createMutation.mutate(data))}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Session Title" required>
          <input {...register('title', { required: true })} placeholder="e.g. JavaScript Functions Deep Dive" />
        </Field>
        <Field label="Date & Time" required>
          <input {...register('scheduledAt', { required: true })} type="datetime-local" />
        </Field>
        <Field label="Duration (minutes)">
          <input {...register('durationMins')} type="number" min={15} defaultValue={90} />
        </Field>
        <Field label="Zoom / Meeting Link">
          <input {...register('zoomLink')} type="url" placeholder="https://zoom.us/j/..." />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { isEdit ? setEditModal(null) : setCreateModal(false); reset(); }}>Cancel</button>
          <button type="submit" className="btn btn-gold btn-sm" disabled={createMutation.isPending || updateMutation.isPending}>
            {isEdit ? 'Update Session' : 'Create Session'}
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>Sessions</div>
        <button className="btn btn-gold btn-sm" onClick={() => setCreateModal(true)}>+ Schedule Session</button>
      </div>

      {(sessions as any[]).length === 0
        ? <EmptyState icon="🎥" title="No sessions yet" message="Schedule your first session." />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(sessions as any[]).map((s: any) => {
              const t = new Date(s.scheduledAt).getTime();
              const now = Date.now();
              const isLive = now >= t && now <= t + s.durationMins * 60000;
              const isPast = now > t + s.durationMins * 60000;
              return (
                <div key={s.id} className="session-card" style={{ border: `1px solid ${isLive ? 'rgba(255,77,77,0.3)' : 'var(--border)'}` }}>
                  <div className="session-time">{dayjs(s.scheduledAt).format('ddd D MMM · HH:mm')}</div>
                  <div className={`session-dot ${isLive ? 'dot-live' : isPast ? 'dot-done' : 'dot-upcoming'}`} />
                  <div className="session-info">
                    <div className="session-title">{s.title}</div>
                    <div className="session-host">{s.durationMins} mins · {s._count?.attendance ?? 0} attended</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!isPast && s.zoomLink && <a href={s.zoomLink} target="_blank" rel="noreferrer" className={`btn ${isLive ? 'btn-teal' : 'btn-ghost'} btn-sm`}>{isLive ? '● Live' : 'Share'}</a>}
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditModal(s); setValue('title', s.title); setValue('scheduledAt', dayjs(s.scheduledAt).format('YYYY-MM-DDTHH:mm')); setValue('durationMins', s.durationMins); setValue('zoomLink', s.zoomLink ?? ''); }}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteConfirm(s)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      <Modal open={createModal} onClose={() => { setCreateModal(false); reset(); }} title="Schedule Session" size="sm">
        <SessionForm />
      </Modal>
      <Modal open={!!editModal} onClose={() => { setEditModal(null); reset(); }} title="Edit Session" size="sm">
        <SessionForm isEdit />
      </Modal>
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
        title="Delete Session"
        message={`Delete "${deleteConfirm?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ── FACILITATOR REPORT ────────────────────────────────────────────────────────
export function FacilitatorReport() {
  const { data: fac } = useQuery({ queryKey: ['fac-me'], queryFn: () => facilitatorsApi.me() });
  const activeCohort = (fac as any)?.cohorts?.find((c: any) => c.status === 'ACTIVE');
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>();
  const { data: pastReports = [] } = useQuery({
    queryKey: ['reports', activeCohort?.id],
    queryFn: () => reportsApi.weekly(activeCohort?.id),
    enabled: !!activeCohort?.id,
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => reportsApi.submitWeekly({ ...data, cohortId: activeCohort!.id }),
    onSuccess: () => { toast.success('Report submitted!'); qc.invalidateQueries({ queryKey: ['reports'] }); reset(); },
    onError: () => toast.error('Failed to submit report'),
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>Weekly Report</div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Submit by Friday · Required for payroll</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 20 }}>Submit This Week's Report</div>
        <form onSubmit={handleSubmit((d) => submitMutation.mutate(d))}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Field label="Week" required>
              <input {...register('week', { required: true })} placeholder="e.g. Week 7 · Feb 24–28" />
            </Field>
            <Field label="Sessions Held">
              <input {...register('sessionCount')} type="number" min={0} defaultValue={3} />
            </Field>
            <Field label="Average Attendance">
              <input {...register('avgAttendance')} placeholder="e.g. 91%" />
            </Field>
          </div>
          <Field label="Weekly Summary" required>
            <textarea {...register('summary', { required: true })} rows={4} placeholder="What was covered, learner progress, any challenges..." style={{ resize: 'vertical' }} />
          </Field>
          <div style={{ marginTop: 14 }} />
          <Field label="Flagged Learners">
            <textarea {...register('flaggedLearners')} rows={2} placeholder="Names and reasons for any at-risk learners..." style={{ resize: 'vertical' }} />
          </Field>
          <div style={{ marginTop: 14 }} />
          <Field label="Plan for Next Week">
            <textarea {...register('nextWeekPlan')} rows={2} style={{ resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => reset()}>Clear</button>
            <button type="submit" className="btn btn-gold btn-sm" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Submitting...' : '📤 Submit Report'}
            </button>
          </div>
        </form>
      </div>

      {(pastReports as any[]).length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>Past Reports</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(pastReports as any[]).map((r: any) => (
              <div key={r.id} className="card-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)' }}>{r.week}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{dayjs(r.submittedAt).fromNow()}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{r.summary.slice(0, 120)}…</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── FACILITATOR ANNOUNCEMENTS ─────────────────────────────────────────────────
export function FacilitatorAnnouncements() {
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const { register, handleSubmit, reset } = useForm<{ title: string; body: string; audience: string }>();
  const { data: fac } = useQuery({ queryKey: ['fac-me'], queryFn: () => facilitatorsApi.me() });
  const activeCohortId = (fac as any)?.cohorts?.find((c: any) => c.status === 'ACTIVE')?.id;
  const qc = useQueryClient();

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements', activeCohortId],
    queryFn: () => announcementsApi.list({ cohortId: activeCohortId }),
    enabled: !!activeCohortId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => announcementsApi.create({ ...data, cohortId: activeCohortId }),
    onSuccess: () => { toast.success('Announcement posted!'); qc.invalidateQueries({ queryKey: ['announcements'] }); reset(); },
    onError: () => toast.error('Failed to post'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementsApi.remove(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['announcements'] }); setDeleteConfirm(null); },
    onError: () => toast.error('Failed to delete'),
  });

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 20 }}>Announcements</div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>Post to Cohort</div>
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Field label="Title" required>
              <input {...register('title', { required: true })} placeholder="e.g. Week 7 Materials Released" />
            </Field>
            <Field label="Audience">
              <select {...register('audience')}>
                <option value="ALL">Everyone</option>
                <option value="LEARNERS">Learners Only</option>
                <option value="FACILITATORS">Facilitators Only</option>
              </select>
            </Field>
          </div>
          <Field label="Message" required>
            <textarea {...register('body', { required: true })} rows={3} placeholder="Write your announcement..." style={{ resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="submit" className="btn btn-gold btn-sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Posting...' : '📣 Post'}
            </button>
          </div>
        </form>
      </div>

      {isLoading ? <PageLoader /> : (announcements as any[]).length === 0
        ? <EmptyState icon="📢" title="No announcements yet" />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(announcements as any[]).map((a: any) => (
              <div key={a.id} className="card-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)' }}>{a.title}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="badge badge-data" style={{ fontSize: 10 }}>{a.audience}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{dayjs(a.createdAt).fromNow()}</span>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', padding: '2px 8px' }} onClick={() => setDeleteConfirm(a)}>×</button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{a.body}</div>
              </div>
            ))}
          </div>
        )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
        title="Delete Announcement"
        message={`Delete "${deleteConfirm?.title}"?`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ── FACILITATOR MESSAGES ──────────────────────────────────────────────────────
export function FacilitatorMessages() {
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<any>(null);
  const [text, setText] = useState('');
  const qc = useQueryClient();

  const { data: convos = [] } = useQuery({ queryKey: ['conversations'], queryFn: messagesApi.conversations });
  const { data: messages = [] } = useQuery({
    queryKey: ['conversation', selected?.learnerProfile?.user?.id],
    queryFn: () => messagesApi.conversation(selected.learnerProfile.user.id),
    enabled: !!selected?.learnerProfile?.user?.id,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: ({ recipientId, text }: { recipientId: string; text: string }) => messagesApi.send(recipientId, text),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conversation'] }); setText(''); },
    onError: () => toast.error('Failed to send'),
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, height: '72vh' }}>
      <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)' }}>Messages</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {(convos as any[]).length === 0
            ? <div style={{ padding: 20, fontSize: 13, color: 'var(--muted)' }}>No conversations yet.</div>
            : (convos as any[]).map((c: any) => {
              const other = c.learnerProfile?.user;
              if (!other) return null;
              return (
                <div key={c.id} onClick={() => setSelected(c)} style={{ display: 'flex', gap: 10, padding: '12px 16px', cursor: 'pointer', background: selected?.learnerProfile?.user?.id === other.id ? 'rgba(240,165,0,0.06)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                  <Avatar name={`${other.firstName} ${other.lastName}`} url={other.avatarUrl} size={36} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{other.firstName} {other.lastName}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.text?.slice(0, 35)}…</div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {selected ? (
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={`${selected.learnerProfile?.user?.firstName} ${selected.learnerProfile?.user?.lastName}`} size={34} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{selected.learnerProfile?.user?.firstName} {selected.learnerProfile?.user?.lastName}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Learner</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(messages as any[]).map((m: any) => {
              const isMe = m.senderId === user?.id;
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? 'var(--teal)' : 'var(--surface2)', color: isMe ? '#060A12' : 'var(--text)', fontSize: 13 }}>
                    {m.text}
                    <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: 'right' }}>{dayjs(m.sentAt).format('HH:mm')}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && text.trim()) { e.preventDefault(); sendMutation.mutate({ recipientId: selected.learnerProfile.user.id, text }); } }} placeholder="Type a message…" style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)', fontSize: 13 }} />
            <button className="btn btn-teal btn-sm" disabled={!text.trim() || sendMutation.isPending} onClick={() => { if (text.trim()) sendMutation.mutate({ recipientId: selected.learnerProfile.user.id, text }); }}>Send</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState icon="💬" title="Select a conversation" />
        </div>
      )}
    </div>
  );
}
