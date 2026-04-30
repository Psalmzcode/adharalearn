'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  cohortsApi, enrollmentsApi, learnersApi, facilitatorsApi,
  paymentsApi, reportsApi, scholarshipsApi, announcementsApi,
  tracksApi, certificatesApi, jobsApi, alumniApi, coursesApi, practicalsApi,
} from '@/lib/api';
import {
  PageLoader, ErrorState, EmptyState, StatusBadge, Avatar,
  Modal, ConfirmDialog, Field,
} from '@/components/ui';

dayjs.extend(relativeTime);

// ── ADMIN HOME ────────────────────────────────────────────────────────────────
export function AdminHome() {
  const { data: analytics, isLoading } = useQuery({ queryKey: ['platform-analytics'], queryFn: reportsApi.platform });
  const { data: payments } = useQuery({ queryKey: ['payment-summary'], queryFn: paymentsApi.summary });

  if (isLoading) return <PageLoader />;

  const a = analytics as any;
  const p = payments as any;

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>Platform Overview</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>AdharaEdu Bootcamp · Live dashboard</div>

      <div className="stats-grid">
        {[
          { icon: '👥', val: a?.learners?.total ?? 0, lbl: 'Total Graduates', variant: 'stat-teal' },
          { icon: '🎓', val: a?.learners?.active ?? 0, lbl: 'Active Learners', variant: 'stat-gold' },
          { icon: '👩‍🏫', val: a?.facilitators ?? 0, lbl: 'Facilitators', variant: '' },
          { icon: '💰', val: `₦${Number(p?.totalRevenue ?? 0).toLocaleString()}`, lbl: 'Total Revenue', variant: '' },
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
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>Track Breakdown</div>
          {(a?.tracks ?? []).map((t: any) => (
            <div key={t.name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{t.name}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t.enrollments} learners</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: a?.learners?.active ? `${Math.min(100, (t.enrollments / a.learners.active) * 100)}%` : '0%' }} /></div>
            </div>
          ))}
          <div style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>
              Learner Segments
            </div>
            {(a?.learnerTypes ?? []).length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>No segment data yet.</div>
            ) : (
              (a?.learnerTypes ?? []).map((x: any) => (
                <div key={x.type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', padding: '3px 0' }}>
                  <span>{String(x.type).replaceAll('_', ' ')}</span>
                  <strong style={{ color: 'var(--text)' }}>{x.count}</strong>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>Revenue Summary</div>
          {[
            { label: 'Total Revenue', val: `₦${Number(p?.totalRevenue ?? 0).toLocaleString()}`, color: 'var(--gold)' },
            { label: 'Successful Payments', val: p?.successful ?? 0, color: 'var(--teal)' },
            { label: 'Pending Payments', val: p?.pending ?? 0, color: 'var(--gold)' },
            { label: 'Failed Payments', val: p?.failed ?? 0, color: 'var(--red)' },
            { label: 'Certificates Issued', val: a?.certificates ?? 0, color: 'var(--text)' },
            { label: 'Scholarships Disbursed', val: `₦${Number(a?.scholarships?.total ?? 0).toLocaleString()}`, color: '#A78BFA' },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>{row.label}</span>
              <span style={{ color: row.color, fontWeight: 700 }}>{row.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ADMIN COHORTS ─────────────────────────────────────────────────────────────
export function AdminCohorts() {
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const { register, handleSubmit, reset, setValue } = useForm<any>();
  const qc = useQueryClient();

  const { data: cohorts = [], isLoading } = useQuery({ queryKey: ['cohorts'], queryFn: () => cohortsApi.list() });
  const { data: tracks = [] } = useQuery({ queryKey: ['tracks'], queryFn: () => tracksApi.list() });
  const { data: facilitators = [] } = useQuery({ queryKey: ['facilitators'], queryFn: facilitatorsApi.list });

  const createMutation = useMutation({
    mutationFn: cohortsApi.create,
    onSuccess: () => { toast.success('Cohort created!'); qc.invalidateQueries({ queryKey: ['cohorts'] }); setCreateModal(false); reset(); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create cohort'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => cohortsApi.update(id, data),
    onSuccess: () => { toast.success('Cohort updated!'); qc.invalidateQueries({ queryKey: ['cohorts'] }); setEditModal(null); reset(); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update'),
  });
  const deleteMutation = useMutation({
    mutationFn: cohortsApi.remove,
    onSuccess: () => { toast.success('Cohort deleted'); qc.invalidateQueries({ queryKey: ['cohorts'] }); setDeleteConfirm(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to delete'),
  });

  const CohortForm = ({ isEdit }: { isEdit?: boolean }) => (
    <form onSubmit={handleSubmit((d) => isEdit ? updateMutation.mutate({ id: editModal.id, ...d }) : createMutation.mutate(d))}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Cohort Name" required><input {...register('name', { required: true })} placeholder="e.g. Cohort 5" /></Field>
        <Field label="Track" required>
          <select {...register('trackId', { required: true })}>
            <option value="">Select track...</option>
            {(tracks as any[]).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Facilitator">
          <select {...register('facilitatorId')}>
            <option value="">None (assign later)</option>
            {(facilitators as any[]).map((f: any) => <option key={f.id} value={f.id}>{f.user.firstName} {f.user.lastName}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Start Date" required><input {...register('startDate', { required: true })} type="date" /></Field>
          <Field label="End Date" required><input {...register('endDate', { required: true })} type="date" /></Field>
        </div>
        <Field label="Max Learners"><input {...register('maxLearners')} type="number" min={1} defaultValue={30} /></Field>
        <Field label="Zoom Link"><input {...register('zoomLink')} type="url" placeholder="https://zoom.us/j/..." /></Field>
        {isEdit && (
          <Field label="Status">
            <select {...register('status')}>
              <option value="UPCOMING">Upcoming</option><option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
            </select>
          </Field>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { isEdit ? setEditModal(null) : setCreateModal(false); reset(); }}>Cancel</button>
          <button type="submit" className="btn btn-gold btn-sm" disabled={createMutation.isPending || updateMutation.isPending}>
            {isEdit ? 'Update' : 'Create Cohort'}
          </button>
        </div>
      </div>
    </form>
  );

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>Cohorts</div>
        <button className="btn btn-gold btn-sm" onClick={() => setCreateModal(true)}>+ New Cohort</button>
      </div>

      {(cohorts as any[]).length === 0 ? <EmptyState icon="🎓" title="No cohorts yet" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {(cohorts as any[]).map((c: any) => (
            <div key={c.id} className={`cohort-card ${c.track?.slug?.includes('web') ? 'cohort-web' : c.track?.slug?.includes('data') ? 'cohort-data' : 'cohort-ai'}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <StatusBadge status={c.status} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.name}</span>
              </div>
              <div className="cohort-title">{c.track?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                {c._count?.enrollments ?? 0} learners · {c.facilitator?.user ? `${c.facilitator.user.firstName} ${c.facilitator.user.lastName}` : 'No facilitator'} · {dayjs(c.startDate).format('MMM D')} – {dayjs(c.endDate).format('MMM D, YYYY')}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  setEditModal(c);
                  ['name', 'trackId', 'facilitatorId', 'maxLearners', 'zoomLink', 'status'].forEach((k) => setValue(k, (c as any)[k] ?? ''));
                  setValue('startDate', dayjs(c.startDate).format('YYYY-MM-DD'));
                  setValue('endDate', dayjs(c.endDate).format('YYYY-MM-DD'));
                }}>Edit</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteConfirm(c)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={createModal} onClose={() => { setCreateModal(false); reset(); }} title="Create New Cohort"><CohortForm /></Modal>
      <Modal open={!!editModal} onClose={() => { setEditModal(null); reset(); }} title="Edit Cohort"><CohortForm isEdit /></Modal>
      <ConfirmDialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteMutation.mutate(deleteConfirm.id)} title="Delete Cohort" message={`Delete "${deleteConfirm?.name}"? This cannot be undone.`} confirmLabel="Delete" danger loading={deleteMutation.isPending} />
    </div>
  );
}

// ── ADMIN ENROLLMENTS ─────────────────────────────────────────────────────────
export function AdminEnrollments() {
  const [filter, setFilter] = useState<string>('');
  const [cohortFilter, setCohortFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const qc = useQueryClient();

  const { data: cohorts = [] } = useQuery({ queryKey: ['cohorts'], queryFn: () => cohortsApi.list() });
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['enrollments', cohortFilter, filter],
    queryFn: () => enrollmentsApi.list({ cohortId: cohortFilter || undefined, status: filter || undefined }),
  });

  const approveMutation = useMutation({
    mutationFn: enrollmentsApi.approve,
    onSuccess: () => { toast.success('Enrollment approved!'); qc.invalidateQueries({ queryKey: ['enrollments'] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed'),
  });
  const withdrawMutation = useMutation({
    mutationFn: enrollmentsApi.withdraw,
    onSuccess: () => { toast.success('Learner withdrawn'); qc.invalidateQueries({ queryKey: ['enrollments'] }); },
    onError: () => toast.error('Failed'),
  });
  const deleteMutation = useMutation({
    mutationFn: enrollmentsApi.remove,
    onSuccess: () => { toast.success('Enrollment deleted'); qc.invalidateQueries({ queryKey: ['enrollments'] }); setDeleteConfirm(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 20 }}>Enrollments</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={cohortFilter} onChange={(e) => setCohortFilter(e.target.value)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13 }}>
          <option value="">All Cohorts</option>
          {(cohorts as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.track?.name} · {c.name}</option>)}
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13 }}>
          <option value="">All Statuses</option>
          {['PENDING', 'ACTIVE', 'COMPLETED', 'WITHDRAWN'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--muted)', alignSelf: 'center' }}>{(enrollments as any[]).length} records</span>
      </div>

      {(enrollments as any[]).length === 0 ? <EmptyState icon="👥" title="No enrollments found" /> : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr><th>Learner</th><th>Cohort</th><th>Progress</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {(enrollments as any[]).map((e: any) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={`${e.learner?.user?.firstName} ${e.learner?.user?.lastName}`} url={e.learner?.user?.avatarUrl} size={30} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{e.learner?.user?.firstName} {e.learner?.user?.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.learner?.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{e.cohort?.track?.name} · {e.cohort?.name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="progress-bar" style={{ width: 60 }}><div className="progress-fill" style={{ width: `${e.progress ?? 0}%` }} /></div>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{e.progress ?? 0}%</span>
                    </div>
                  </td>
                  <td><StatusBadge status={e.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {e.status === 'PENDING' && (
                        <button className="btn btn-teal btn-sm" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => approveMutation.mutate(e.id)} disabled={approveMutation.isPending}>Approve</button>
                      )}
                      {e.status === 'ACTIVE' && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--gold)', fontSize: 11, padding: '4px 10px' }} onClick={() => withdrawMutation.mutate(e.id)} disabled={withdrawMutation.isPending}>Withdraw</button>
                      )}
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', fontSize: 11, padding: '4px 10px' }} onClick={() => setDeleteConfirm(e)}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteMutation.mutate(deleteConfirm.id)} title="Remove Enrollment" message={`Permanently remove ${deleteConfirm?.learner?.user?.firstName}'s enrollment?`} confirmLabel="Remove" danger loading={deleteMutation.isPending} />
    </div>
  );
}

// ── ADMIN REVENUE ─────────────────────────────────────────────────────────────
export function AdminRevenue() {
  const { data: summary } = useQuery({ queryKey: ['payment-summary'], queryFn: paymentsApi.summary });
  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => paymentsApi.list() });

  const s = summary as any;

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 20 }}>Revenue</div>
      <div className="stats-grid">
        {[
          { icon: '💰', val: `₦${Number(s?.totalRevenue ?? 0).toLocaleString()}`, lbl: 'Total Revenue', variant: 'stat-gold' },
          { icon: '✅', val: s?.successful ?? 0, lbl: 'Successful Payments', variant: 'stat-teal' },
          { icon: '⏳', val: s?.pending ?? 0, lbl: 'Pending', variant: '' },
          { icon: '❌', val: s?.failed ?? 0, lbl: 'Failed', variant: '' },
        ].map((st) => (
          <div key={st.lbl} className={`stat-card ${st.variant}`}>
            <div className="stat-icon">{st.icon}</div>
            <div className="stat-value">{st.val}</div>
            <div className="stat-label">{st.lbl}</div>
          </div>
        ))}
      </div>
      {isLoading ? <PageLoader /> : (payments as any[]).length === 0 ? <EmptyState icon="💳" title="No payments yet" /> : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Learner</th><th>Track</th><th>Amount</th><th>Type</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {(payments as any[]).map((p: any) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{p.enrollment?.learner?.user?.firstName} {p.enrollment?.learner?.user?.lastName}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.enrollment?.cohort?.track?.name}</td>
                  <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--gold)' }}>₦{Number(p.amount).toLocaleString()}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.type.replace('_', ' ')}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.paidAt ? dayjs(p.paidAt).format('MMM D, YYYY') : '—'}</td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── ADMIN FACILITATORS ────────────────────────────────────────────────────────
export function AdminFacilitators() {
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const qc = useQueryClient();
  const { data: facilitators = [], isLoading } = useQuery({ queryKey: ['facilitators'], queryFn: facilitatorsApi.list });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => facilitatorsApi.remove(id),
    onSuccess: () => { toast.success('Facilitator removed'); qc.invalidateQueries({ queryKey: ['facilitators'] }); setDeleteConfirm(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>Facilitators</div>
      </div>
      {(facilitators as any[]).length === 0 ? <EmptyState icon="👩‍🏫" title="No facilitators yet" /> : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Facilitator</th><th>Track</th><th>Learners</th><th>Reports</th><th>Actions</th></tr></thead>
            <tbody>
              {(facilitators as any[]).map((f: any) => {
                const activeCohort = f.cohorts?.find((c: any) => c.status === 'ACTIVE');
                return (
                  <tr key={f.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={`${f.user.firstName} ${f.user.lastName}`} url={f.user.avatarUrl} size={34} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{f.user.firstName} {f.user.lastName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{f.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{activeCohort ? <span className="badge badge-web">{activeCohort.track?.name}</span> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>No active cohort</span>}</td>
                    <td>{activeCohort?._count?.enrollments ?? 0}</td>
                    <td>{f._count?.reports ?? 0}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', fontSize: 11 }} onClick={() => setDeleteConfirm(f)}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteMutation.mutate(deleteConfirm.id)} title="Remove Facilitator" message={`Remove ${deleteConfirm?.user?.firstName} ${deleteConfirm?.user?.lastName} as facilitator? Their cohort assignments will be cleared.`} confirmLabel="Remove" danger loading={deleteMutation.isPending} />
    </div>
  );
}

// ── ADMIN SCHOLARSHIPS ────────────────────────────────────────────────────────
export function AdminScholarships() {
  const [reviewConfirm, setReviewConfirm] = useState<{ s: any; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [disburseConfirm, setDisburseConfirm] = useState<any>(null);
  const qc = useQueryClient();
  const { data: scholarships = [], isLoading } = useQuery({ queryKey: ['scholarships'], queryFn: scholarshipsApi.list });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) => scholarshipsApi.review(id, status),
    onSuccess: (_, v) => { toast.success(`Scholarship ${v.status.toLowerCase()}!`); qc.invalidateQueries({ queryKey: ['scholarships'] }); setReviewConfirm(null); },
    onError: () => toast.error('Failed to update scholarship'),
  });
  const disburseMutation = useMutation({
    mutationFn: scholarshipsApi.disburse,
    onSuccess: () => { toast.success('Scholarship disbursed!'); qc.invalidateQueries({ queryKey: ['scholarships'] }); setDisburseConfirm(null); },
    onError: () => toast.error('Failed to disburse'),
  });

  if (isLoading) return <PageLoader />;

  const pending = (scholarships as any[]).filter((s: any) => s.status === 'PENDING');
  const approved = (scholarships as any[]).filter((s: any) => s.status === 'APPROVED');
  const rest = (scholarships as any[]).filter((s: any) => !['PENDING', 'APPROVED'].includes(s.status));

  const ScholarshipCard = ({ s }: { s: any }) => (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            {s.learner?.user?.firstName} {s.learner?.user?.lastName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{s.learner?.user?.email} · {dayjs(s.appliedAt).fromNow()}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{s.reason}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--gold)', marginBottom: 8 }}>₦{Number(s.amount).toLocaleString()}</div>
          <StatusBadge status={s.status} />
        </div>
      </div>
      {s.status === 'PENDING' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn-teal btn-sm" onClick={() => setReviewConfirm({ s, action: 'APPROVED' })}>✅ Approve</button>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setReviewConfirm({ s, action: 'REJECTED' })}>Reject</button>
        </div>
      )}
      {s.status === 'APPROVED' && (
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-gold btn-sm" onClick={() => setDisburseConfirm(s)}>💰 Disburse</button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 20 }}>Scholarships</div>
      {pending.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Pending Review ({pending.length})</div>
          {pending.map((s: any) => <ScholarshipCard key={s.id} s={s} />)}
        </>
      )}
      {approved.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 24 }}>Approved — Awaiting Disbursement ({approved.length})</div>
          {approved.map((s: any) => <ScholarshipCard key={s.id} s={s} />)}
        </>
      )}
      {rest.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 24 }}>History</div>
          {rest.map((s: any) => <ScholarshipCard key={s.id} s={s} />)}
        </>
      )}
      {(scholarships as any[]).length === 0 && <EmptyState icon="🏅" title="No scholarship applications" />}

      <ConfirmDialog open={!!reviewConfirm} onClose={() => setReviewConfirm(null)} onConfirm={() => reviewMutation.mutate({ id: reviewConfirm!.s.id, status: reviewConfirm!.action })} title={reviewConfirm?.action === 'APPROVED' ? 'Approve Scholarship' : 'Reject Scholarship'} message={`${reviewConfirm?.action === 'APPROVED' ? 'Approve' : 'Reject'} scholarship of ₦${Number(reviewConfirm?.s?.amount ?? 0).toLocaleString()} for ${reviewConfirm?.s?.learner?.user?.firstName}?`} confirmLabel={reviewConfirm?.action === 'APPROVED' ? 'Approve' : 'Reject'} danger={reviewConfirm?.action === 'REJECTED'} loading={reviewMutation.isPending} />
      <ConfirmDialog open={!!disburseConfirm} onClose={() => setDisburseConfirm(null)} onConfirm={() => disburseMutation.mutate(disburseConfirm.id)} title="Disburse Scholarship" message={`Confirm disbursement of ₦${Number(disburseConfirm?.amount ?? 0).toLocaleString()} to ${disburseConfirm?.learner?.user?.firstName}? This marks the scholarship as paid.`} confirmLabel="Disburse" loading={disburseMutation.isPending} />
    </div>
  );
}

// ── ADMIN ANNOUNCEMENTS ───────────────────────────────────────────────────────
export function AdminAnnouncements() {
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const { register, handleSubmit, reset } = useForm<{ title: string; body: string; audience: string; cohortId: string }>();
  const { data: cohorts = [] } = useQuery({ queryKey: ['cohorts'], queryFn: () => cohortsApi.list() });
  const { data: announcements = [], isLoading } = useQuery({ queryKey: ['announcements-all'], queryFn: () => announcementsApi.list() });
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => announcementsApi.create({ ...data, cohortId: data.cohortId || undefined }),
    onSuccess: () => { toast.success('Announcement published!'); qc.invalidateQueries({ queryKey: ['announcements-all'] }); reset(); },
    onError: () => toast.error('Failed to post'),
  });
  const deleteMutation = useMutation({
    mutationFn: announcementsApi.remove,
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['announcements-all'] }); setDeleteConfirm(null); },
    onError: () => toast.error('Failed to delete'),
  });

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 20 }}>Announcements</div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>Post Platform Announcement</div>
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1 / 3' }}>
              <Field label="Title" required><input {...register('title', { required: true })} placeholder="e.g. Demo Day — April 5, 2026" /></Field>
            </div>
            <Field label="Audience">
              <select {...register('audience')}>
                <option value="ALL">Everyone</option>
                <option value="LEARNERS">Learners Only</option>
                <option value="FACILITATORS">Facilitators Only</option>
              </select>
            </Field>
          </div>
          <div style={{ marginBottom: 12 }}>
            <Field label="Cohort (optional — leave blank for platform-wide)">
              <select {...register('cohortId')}>
                <option value="">All Cohorts (Platform-wide)</option>
                {(cohorts as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.track?.name} · {c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Message" required>
            <textarea {...register('body', { required: true })} rows={3} placeholder="Write your announcement..." style={{ resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="submit" className="btn btn-gold btn-sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Posting...' : '📣 Publish'}
            </button>
          </div>
        </form>
      </div>

      {isLoading ? <PageLoader /> : (announcements as any[]).length === 0 ? <EmptyState icon="📢" title="No announcements" /> : (
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

      <ConfirmDialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteMutation.mutate(deleteConfirm.id)} title="Delete Announcement" message={`Delete "${deleteConfirm?.title}"?`} confirmLabel="Delete" danger loading={deleteMutation.isPending} />
    </div>
  );
}

// ── ADMIN SETTINGS ────────────────────────────────────────────────────────────
export function AdminSettings() {
  const { data: analytics } = useQuery({ queryKey: ['platform-analytics'], queryFn: reportsApi.platform });
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      platformName: 'AdharaEdu Bootcamp',
      supportEmail: 'support@adhara.edu.ng',
      maxCohortSize: 30,
      paystackPublicKey: '',
      zoomDefaultLink: '',
    },
  });

  const onSave = (data: any) => {
    // In production this would call a config API
    localStorage.setItem('adhara_config', JSON.stringify(data));
    setSaved(true);
    toast.success('Settings saved!');
    setTimeout(() => setSaved(false), 3000);
  };

  const p = analytics as any;

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 24 }}>Platform Settings</div>

      {/* Platform stats summary */}
      {p && (
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          {[
            { icon: '👥', val: p.learners?.total ?? 0, lbl: 'Total Learners' },
            { icon: '🎓', val: p.cohorts?.active ?? 0, lbl: 'Active Cohorts' },
            { icon: '💰', val: `₦${((p.revenue?.total ?? 0) / 1000).toFixed(0)}k`, lbl: 'Total Revenue' },
            { icon: '📈', val: `${p.learners?.avgProgress ?? 0}%`, lbl: 'Avg Progress' },
          ].map(s => (
            <div key={s.lbl} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.lbl}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(onSave)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* General */}
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>General</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Platform Name"><input {...register('platformName')} /></Field>
              <Field label="Support Email"><input {...register('supportEmail')} type="email" /></Field>
              <Field label="Default Max Cohort Size"><input {...register('maxCohortSize')} type="number" min={5} max={100} /></Field>
            </div>
          </div>

          {/* Integrations */}
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>Integrations</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Paystack Public Key"><input {...register('paystackPublicKey')} placeholder="pk_live_..." style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} /></Field>
              <Field label="Default Zoom / Meet Link"><input {...register('zoomDefaultLink')} type="url" placeholder="https://zoom.us/j/..." /></Field>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="submit" className="btn btn-gold btn-sm">Save Settings</button>
            {saved && <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700 }}>✓ Saved</span>}
          </div>
        </div>
      </form>
    </div>
  );
}

// ── ADMIN JOBS ────────────────────────────────────────────────────────────────
export function AdminJobs() {
  const [createModal, setCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const { register, handleSubmit, reset } = useForm<any>();
  const qc = useQueryClient();
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ['jobs'], queryFn: () => jobsApi.list() });
  const createM = useMutation({ mutationFn: (d: any) => jobsApi.create(d), onSuccess: () => { toast.success('Job posted!'); qc.invalidateQueries({ queryKey:['jobs'] }); setCreateModal(false); reset(); }, onError: () => toast.error('Failed to post job') });
  const deleteM = useMutation({ mutationFn: (id: string) => jobsApi.remove(id), onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey:['jobs'] }); setDeleteConfirm(null); }, onError: () => toast.error('Failed to remove') });
  if (isLoading) return <PageLoader />;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'var(--text)' }}>Job Board</div>
        <button className="btn btn-gold btn-sm" onClick={() => setCreateModal(true)}>+ Post Job</button>
      </div>
      {(jobs as any[]).length === 0 ? <EmptyState icon="💼" title="No jobs posted" message="Post opportunities for your graduates." /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {(jobs as any[]).map((j: any) => (
            <div key={j.id} style={{ padding:20, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:4 }}>{j.title}</div>
                <div style={{ fontSize:13, color:'var(--muted)', marginBottom:8 }}>{j.company} · {j.location} · {j.type}</div>
                {j.salary && <div style={{ fontSize:12, color:'var(--gold)', fontWeight:700, marginBottom:8 }}>{j.salary}</div>}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {(j.skills ?? []).slice(0, 5).map((s: string) => <span key={s} style={{ fontSize:10, fontWeight:700, background:'rgba(0,212,170,0.1)', color:'var(--teal)', padding:'2px 8px', borderRadius:20 }}>{s}</span>)}
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <a href={j.applyUrl} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm">Apply ↗</a>
                <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)' }} onClick={() => setDeleteConfirm(j)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={createModal} onClose={() => { setCreateModal(false); reset(); }} title="Post a Job">
        <form onSubmit={handleSubmit(d => createM.mutate(d))}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <Field label="Job Title" required><input {...register('title', { required: true })} placeholder="Frontend Developer" /></Field>
              <Field label="Company" required><input {...register('company', { required: true })} placeholder="Flutterwave" /></Field>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <Field label="Location" required><input {...register('location', { required: true })} placeholder="Lagos / Remote" /></Field>
              <Field label="Type"><select {...register('type')}><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">Onsite</option></select></Field>
            </div>
            <Field label="Salary Range"><input {...register('salary')} placeholder="₦200k–₦350k/month" /></Field>
            <Field label="Apply URL" required><input {...register('applyUrl', { required: true })} type="url" placeholder="https://careers.company.com/..." /></Field>
            <Field label="Skills (comma-separated)"><input {...register('skills')} placeholder="React, Node.js, TypeScript" /></Field>
            <Field label="Description" required><textarea {...register('description', { required: true })} rows={4} style={{ resize:'vertical' }} placeholder="Brief description of the role..." /></Field>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCreateModal(false); reset(); }}>Cancel</button>
              <button type="submit" className="btn btn-gold btn-sm" disabled={createM.isPending}>{createM.isPending ? 'Posting...' : 'Post Job'}</button>
            </div>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteM.mutate(deleteConfirm.id)} title="Remove Job" message={`Remove "${deleteConfirm?.title}" from the job board?`} confirmLabel="Remove" danger loading={deleteM.isPending} />
    </div>
  );
}

// ── ADMIN ALUMNI ──────────────────────────────────────────────────────────────
export function AdminAlumni() {
  const { data: alumni = [], isLoading } = useQuery({ queryKey: ['alumni'], queryFn: () => alumniApi.list() });
  if (isLoading) return <PageLoader />;
  const hireable = (alumni as any[]).filter((a: any) => a.isHireable).length;
  return (
    <div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'var(--text)', marginBottom:4 }}>Alumni Network</div>
      <div style={{ color:'var(--muted)', fontSize:13, marginBottom:20 }}>{(alumni as any[]).length} total graduates · {hireable} open to work</div>
      <div className="stats-grid" style={{ marginBottom:24 }}>
        {[{ icon:'🎓', val:(alumni as any[]).length, lbl:'Total Alumni', v:'stat-teal' },{ icon:'💼', val:hireable, lbl:'Open to Work', v:'stat-gold' },{ icon:'🏢', val:new Set((alumni as any[]).filter((a:any)=>a.company).map((a:any)=>a.company)).size, lbl:'Unique Companies', v:'' },{ icon:'🌍', val:new Set((alumni as any[]).map((a:any)=>a.trackName)).size, lbl:'Tracks Represented', v:'' }].map(s=><div key={s.lbl} className={`stat-card ${s.v}`}><div className="stat-icon">{s.icon}</div><div className="stat-value">{s.val}</div><div className="stat-label">{s.lbl}</div></div>)}
      </div>
      {(alumni as any[]).length === 0 ? <EmptyState icon="🎓" title="No alumni yet" message="Graduates will appear here after completing a cohort." /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
          {(alumni as any[]).map((a: any) => (
            <div key={a.id} style={{ padding:18, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
              <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
                <Avatar name={`${a.user.firstName} ${a.user.lastName}`} url={a.user.avatarUrl} size={40} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{a.user.firstName} {a.user.lastName}</div>
                  {a.jobTitle && <div style={{ fontSize:12, color:'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.jobTitle}{a.company && ` @ ${a.company}`}</div>}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                <span style={{ fontSize:10, fontWeight:700, background:'rgba(0,212,170,0.1)', color:'var(--teal)', padding:'2px 8px', borderRadius:20 }}>{a.trackName}</span>
                {a.isHireable && <span style={{ fontSize:10, fontWeight:700, background:'rgba(240,165,0,0.1)', color:'var(--gold)', padding:'2px 8px', borderRadius:20 }}>Open to Work</span>}
              </div>
              {a.bio && <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5, marginBottom:10, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{a.bio}</div>}
              <div style={{ display:'flex', gap:6 }}>
                {a.portfolioUrl && <a href={a.portfolioUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'var(--gold)', fontWeight:700, textDecoration:'none' }}>Portfolio ↗</a>}
                {a.githubUrl && <a href={a.githubUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'var(--muted)', fontWeight:700, textDecoration:'none' }}>GitHub ↗</a>}
                {a.linkedInUrl && <a href={a.linkedInUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'var(--muted)', fontWeight:700, textDecoration:'none' }}>LinkedIn ↗</a>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ADMIN QUIZ BANK ───────────────────────────────────────────────────────────
export function AdminQuizBank() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [aiCount, setAiCount] = useState(5);
  const { register, handleSubmit, reset, setValue } = useForm<any>();

  const { data: courses = [] } = useQuery({ queryKey: ['admin-courses'], queryFn: coursesApi.adminAll });
  const { data: modules = [] } = useQuery({
    queryKey: ['admin-modules', courseId],
    queryFn: () => coursesApi.adminModules(courseId),
    enabled: !!courseId,
  });
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['admin-quiz-questions', moduleId],
    queryFn: () => coursesApi.adminQuizQuestions(moduleId),
    enabled: !!moduleId,
  });

  const createM = useMutation({
    mutationFn: (d: any) => coursesApi.adminCreateQuizQuestion(moduleId, d),
    onSuccess: () => {
      toast.success('Quiz question created');
      qc.invalidateQueries({ queryKey: ['admin-quiz-questions', moduleId] });
      reset({ order: 1, correctOption: 'A' });
    },
    onError: () => toast.error('Failed to create question'),
  });
  const updateM = useMutation({
    mutationFn: ({ id, ...d }: any) => coursesApi.adminUpdateQuizQuestion(id, d),
    onSuccess: () => {
      toast.success('Quiz question updated');
      qc.invalidateQueries({ queryKey: ['admin-quiz-questions', moduleId] });
      setEditId(null);
      reset({ order: 1, correctOption: 'A' });
    },
    onError: () => toast.error('Failed to update question'),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => coursesApi.adminRemoveQuizQuestion(id),
    onSuccess: () => {
      toast.success('Quiz question removed');
      qc.invalidateQueries({ queryKey: ['admin-quiz-questions', moduleId] });
    },
    onError: () => toast.error('Failed to remove question'),
  });
  const aiGenerateM = useMutation({
    mutationFn: () => coursesApi.adminGenerateQuizQuestions(moduleId, { count: aiCount }),
    onSuccess: (res: any) => {
      toast.success(`AI generated ${res?.createdCount ?? 0} questions`);
      qc.invalidateQueries({ queryKey: ['admin-quiz-questions', moduleId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'AI generation failed'),
  });

  const onSubmit = (d: any) => {
    if (!moduleId) return toast.error('Pick a module first');
    if (editId) updateM.mutate({ id: editId, ...d });
    else createM.mutate(d);
  };

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 18 }}>
        Quiz Bank
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Course">
            <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setModuleId(''); }}>
              <option value="">Select course...</option>
              {(courses as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Module">
            <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} disabled={!courseId}>
              <option value="">Select module...</option>
              {(modules as any[]).map((m: any) => <option key={m.id} value={m.id}>M{m.order} · {m.title}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
          <Field label="AI question count">
            <input
              value={aiCount}
              onChange={(e) => setAiCount(Math.max(1, Math.min(20, Number(e.target.value || 5))))}
              type="number"
              min={1}
              max={20}
              style={{ maxWidth: 120 }}
            />
          </Field>
          <button
            className="btn btn-teal btn-sm"
            disabled={!moduleId || aiGenerateM.isPending}
            onClick={() => aiGenerateM.mutate()}
            type="button"
          >
            {aiGenerateM.isPending ? 'Generating…' : 'Generate with AI'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Uses module title, notes and lesson summaries to draft MCQs.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
              <Field label="Order"><input {...register('order', { valueAsNumber: true })} type="number" min={1} defaultValue={1} /></Field>
              <Field label="Question"><input {...register('prompt', { required: true })} placeholder="What does a pivot table do?" /></Field>
            </div>
            <Field label="Option A"><input {...register('optionA', { required: true })} /></Field>
            <Field label="Option B"><input {...register('optionB', { required: true })} /></Field>
            <Field label="Option C"><input {...register('optionC', { required: true })} /></Field>
            <Field label="Option D"><input {...register('optionD', { required: true })} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10 }}>
              <Field label="Correct option">
                <select {...register('correctOption')} defaultValue="A">
                  {['A', 'B', 'C', 'D'].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Explanation"><input {...register('explanation')} placeholder="Why this is correct..." /></Field>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {editId && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditId(null); reset({ order: 1, correctOption: 'A' }); }}>
                  Cancel Edit
                </button>
              )}
              <button className="btn btn-gold btn-sm" type="submit" disabled={createM.isPending || updateM.isPending}>
                {editId ? 'Update Question' : 'Add Question'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {!moduleId ? (
        <EmptyState icon="❓" title="Select a module to manage quiz questions" />
      ) : isLoading ? (
        <PageLoader />
      ) : (questions as any[]).length === 0 ? (
        <EmptyState icon="❓" title="No questions yet for this module" />
      ) : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>#</th><th>Question</th><th>Correct</th><th>Actions</th></tr></thead>
            <tbody>
              {(questions as any[]).map((q: any) => (
                <tr key={q.id}>
                  <td>{q.order}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{q.prompt}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>A) {q.optionA} · B) {q.optionB} · C) {q.optionC} · D) {q.optionD}</div>
                  </td>
                  <td><StatusBadge status={q.correctOption} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setEditId(q.id);
                          setValue('order', q.order);
                          setValue('prompt', q.prompt);
                          setValue('optionA', q.optionA);
                          setValue('optionB', q.optionB);
                          setValue('optionC', q.optionC);
                          setValue('optionD', q.optionD);
                          setValue('correctOption', q.correctOption);
                          setValue('explanation', q.explanation ?? '');
                        }}
                      >
                        Edit
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteM.mutate(q.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── ADMIN PRACTICALS ──────────────────────────────────────────────────────────
export function AdminPracticals() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [scope, setScope] = useState<'MODULE' | 'BUNDLE' | 'TRACK'>('MODULE');
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED'>('APPROVED');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewScore, setReviewScore] = useState<string>('');
  const [rubricPreset, setRubricPreset] = useState<'frontend' | 'data' | 'automation'>('frontend');
  const { register, handleSubmit, reset } = useForm<any>();

  const { data: courses = [] } = useQuery({ queryKey: ['admin-courses'], queryFn: coursesApi.adminAll });
  const { data: modules = [] } = useQuery({
    queryKey: ['admin-modules', courseId],
    queryFn: () => coursesApi.adminModules(courseId),
    enabled: !!courseId,
  });
  const { data: bundles = [] } = useQuery({
    queryKey: ['admin-bundles', courseId],
    queryFn: () => coursesApi.adminBundles(courseId),
    enabled: !!courseId,
  });
  const { data: templates = [] } = useQuery({
    queryKey: ['practical-templates', courseId, scope, moduleId, bundleId],
    queryFn: () =>
      practicalsApi.adminTemplates({
        courseId: courseId || undefined,
        moduleId: scope === 'MODULE' ? moduleId || undefined : undefined,
      }),
    enabled: !!courseId,
  });
  const { data: submissions = [] } = useQuery({
    queryKey: ['practical-submissions', moduleId],
    queryFn: () => practicalsApi.adminSubmissions({ moduleId }),
    enabled: !!moduleId,
  });

  const createTemplateM = useMutation({
    mutationFn: (d: any) =>
      practicalsApi.adminCreateTemplate({
        ...d,
        courseId,
        scope,
        moduleId: scope === 'MODULE' ? moduleId : undefined,
        bundleId: scope === 'BUNDLE' ? bundleId : undefined,
      }),
    onSuccess: () => {
      toast.success('Practical template created');
      qc.invalidateQueries({ queryKey: ['practical-templates'] });
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create template'),
  });
  const reviewM = useMutation({
    mutationFn: (submissionId: string) =>
      practicalsApi.adminReviewSubmission(submissionId, {
        status: reviewStatus,
        feedback: reviewFeedback || undefined,
        score: reviewScore ? Number(reviewScore) : null,
      }),
    onSuccess: () => {
      toast.success('Submission reviewed');
      setReviewFeedback('');
      setReviewScore('');
      qc.invalidateQueries({ queryKey: ['practical-submissions', moduleId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to review submission'),
  });

  const applyRubricTemplate = () => {
    const templates: Record<string, string> = {
      frontend:
        'Rubric:\n- Functionality (0-30)\n- Code quality/readability (0-25)\n- UI/UX & responsiveness (0-25)\n- Documentation/reflection (0-20)\n\nFeedback:\n- What is strong:\n- What to improve:\n- Next action to pass:',
      data:
        'Rubric:\n- Data cleaning accuracy (0-25)\n- Analysis depth & correctness (0-30)\n- Visual storytelling (0-25)\n- Insight clarity & recommendations (0-20)\n\nFeedback:\n- What is strong:\n- What to improve:\n- Next action to pass:',
      automation:
        'Rubric:\n- Workflow correctness (0-30)\n- Reliability/error handling (0-25)\n- Practical business value (0-25)\n- Documentation/demo clarity (0-20)\n\nFeedback:\n- What is strong:\n- What to improve:\n- Next action to pass:',
    };
    setReviewFeedback(templates[rubricPreset]);
    toast.success('Rubric template inserted');
  };

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 18 }}>
        Practicals / Capstones
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Course">
            <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setModuleId(''); setBundleId(''); }}>
              <option value="">Select course...</option>
              {(courses as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Scope">
            <select value={scope} onChange={(e) => setScope(e.target.value as any)} disabled={!courseId}>
              <option value="MODULE">MODULE</option>
              <option value="BUNDLE">BUNDLE</option>
              <option value="TRACK">TRACK</option>
            </select>
          </Field>
          {scope === 'MODULE' ? (
            <Field label="Module">
              <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} disabled={!courseId}>
                <option value="">Select module...</option>
                {(modules as any[]).map((m: any) => <option key={m.id} value={m.id}>M{m.order} · {m.title}</option>)}
              </select>
            </Field>
          ) : scope === 'BUNDLE' ? (
            <Field label="Bundle">
              <select value={bundleId} onChange={(e) => setBundleId(e.target.value)} disabled={!courseId}>
                <option value="">Select bundle...</option>
                {(bundles as any[]).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Track-level">
              <input value="Applies to full course track" readOnly />
            </Field>
          )}
        </div>
      </div>

      {!!courseId && (scope !== 'MODULE' || !!moduleId) && (scope !== 'BUNDLE' || !!bundleId) && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>
              Create {scope.toLowerCase()} practical
            </div>
            <form onSubmit={handleSubmit((d) => createTemplateM.mutate(d))}>
              <div style={{ display: 'grid', gap: 10 }}>
                <Field label="Title"><input {...register('title', { required: true })} placeholder="Build a responsive landing page" /></Field>
                <Field label="Brief"><textarea {...register('briefMd', { required: true })} rows={4} placeholder="What the learner should build..." /></Field>
                <Field label="Instructions"><textarea {...register('instructionsMd')} rows={4} placeholder="Submission rubric, checklist, deadlines..." /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked {...register('requiredForCompletion')} />
                    Required for completion
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" {...register('isPublished')} />
                    Publish now
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-gold btn-sm" type="submit" disabled={createTemplateM.isPending}>
                    {createTemplateM.isPending ? 'Saving...' : 'Create practical'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>
              Templates ({scope})
            </div>
            {(templates as any[]).length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No practical templates yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {(templates as any[]).map((t: any) => (
                  <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, background: 'var(--surface2)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text)' }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{t.briefMd}</div>
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
                      {t.scope} · {t.requiredForCompletion ? 'Required for completion' : 'Optional'} · {t.isPublished ? 'Published' : 'Draft'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>Learner submissions</div>
            {(submissions as any[]).length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No submissions yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {(submissions as any[]).map((s: any) => (
                  <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, background: 'var(--surface2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text)' }}>
                        {s.user?.firstName} {s.user?.lastName} ({s.user?.email})
                      </div>
                      <span className="badge badge-web">{s.status}</span>
                    </div>
                    {s.repoUrl ? <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Repo: {s.repoUrl}</div> : null}
                    {s.liveUrl ? <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Live: {s.liveUrl}</div> : null}
                    {s.fileUrl ? <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>File: {s.fileUrl}</div> : null}
                    {s.submissionText ? <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{s.submissionText}</div> : null}
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select value={rubricPreset} onChange={(e) => setRubricPreset(e.target.value as any)}>
                        <option value="frontend">Rubric: Frontend Build</option>
                        <option value="data">Rubric: Data Analysis</option>
                        <option value="automation">Rubric: AI/Automation</option>
                      </select>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={applyRubricTemplate}>
                        Insert Rubric Template
                      </button>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as any)}>
                        <option value="APPROVED">Approve</option>
                        <option value="CHANGES_REQUESTED">Request changes</option>
                        <option value="REJECTED">Reject</option>
                      </select>
                      <input value={reviewScore} onChange={(e) => setReviewScore(e.target.value)} type="number" min={0} max={100} placeholder="Score (optional)" style={{ maxWidth: 150 }} />
                      <textarea value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} placeholder="Feedback / rubric notes" rows={4} style={{ minWidth: 320, width: '100%', maxWidth: 640 }} />
                      <button className="btn btn-teal btn-sm" onClick={() => reviewM.mutate(s.id)} disabled={reviewM.isPending}>
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {(!courseId || (scope === 'MODULE' && !moduleId) || (scope === 'BUNDLE' && !bundleId)) && (
        <EmptyState icon="🧪" title="Select course and scope to manage practicals" />
      )}
    </div>
  );
}

// ── ADMIN ADHARA LEARN ───────────────────────────────────────────────────────
export function AdminAdharaLearn({ view }: { view: 'courses' | 'modules' | 'lessons' | 'bundles' | 'purchases' }) {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [purchaseType, setPurchaseType] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState('');
  const [purchaseCourse, setPurchaseCourse] = useState('');
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [courseEdit, setCourseEdit] = useState<any>(null);
  const [moduleEdit, setModuleEdit] = useState<any>(null);
  const [lessonEditId, setLessonEditId] = useState<string>('');
  const [lessonEdit, setLessonEdit] = useState<any>(null);

  const { data: courses = [], isLoading } = useQuery({ queryKey: ['admin-courses'], queryFn: coursesApi.adminAll });
  const { data: modules = [] } = useQuery({
    queryKey: ['admin-modules', courseId],
    queryFn: () => coursesApi.adminModules(courseId),
    enabled: !!courseId,
  });
  const { data: bundles = [] } = useQuery({
    queryKey: ['admin-bundles', courseId],
    queryFn: () => coursesApi.adminBundles(courseId),
    enabled: !!courseId,
  });
  const { data: lessons = [] } = useQuery({
    queryKey: ['admin-lessons', moduleId],
    queryFn: () => coursesApi.adminModuleLessons(moduleId),
    enabled: !!moduleId,
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ['admin-learn-purchases'],
    queryFn: () => coursesApi.adminPurchases(),
  });

  const filteredPurchases = (purchases as any[]).filter((p: any) => {
    if (purchaseType && p.kind !== purchaseType) return false;
    if (purchaseStatus && p.status !== purchaseStatus) return false;
    if (purchaseCourse && p.course?.id !== purchaseCourse) return false;
    if (purchaseSearch) {
      const q = purchaseSearch.toLowerCase().trim();
      const blob = `${p.learner?.firstName ?? ''} ${p.learner?.lastName ?? ''} ${p.learner?.email ?? ''} ${p.item ?? ''} ${p.course?.title ?? ''}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  useEffect(() => {
    if (!courseId && (courses as any[]).length > 0) setCourseId((courses as any[])[0].id);
  }, [courses, courseId]);
  useEffect(() => {
    if (!moduleId && (modules as any[]).length > 0) setModuleId((modules as any[])[0].id);
  }, [modules, moduleId]);
  useEffect(() => {
    const selected = (courses as any[]).find((x: any) => x.id === courseId);
    if (!selected) { setCourseEdit(null); return; }
    setCourseEdit({
      slug: selected.slug ?? '',
      title: selected.title ?? '',
      description: selected.description ?? '',
      whatsappLink: selected.whatsappLink ?? '',
      price: Number(selected.price ?? 0),
      currency: selected.currency ?? 'NGN',
      isPublished: !!selected.isPublished,
    });
  }, [courses, courseId]);
  useEffect(() => {
    const selected = (modules as any[]).find((x: any) => x.id === moduleId);
    if (!selected) { setModuleEdit(null); return; }
    setModuleEdit({
      order: Number(selected.order ?? 1),
      title: selected.title ?? '',
      description: selected.description ?? '',
      isFree: !!selected.isFree,
      price: selected.isFree ? '' : (selected.price != null ? Number(selected.price) : ''),
      currency: selected.currency ?? 'NGN',
      isPublished: !!selected.isPublished,
    });
  }, [modules, moduleId]);
  useEffect(() => {
    const selected = (lessons as any[]).find((x: any) => x.id === lessonEditId);
    if (!selected) { setLessonEdit(null); return; }
    setLessonEdit({
      order: Number(selected.order ?? 1),
      title: selected.title ?? '',
      description: selected.description ?? '',
      durationMins: selected.durationMins ?? '',
      videoUrl: selected.videoUrl ?? '',
      notesUrl: selected.notesUrl ?? '',
      isPublished: !!selected.isPublished,
    });
  }, [lessons, lessonEditId]);

  const courseForm = useForm<any>({ defaultValues: { slug: '', title: '', description: '', whatsappLink: '', price: 0, currency: 'NGN', isPublished: false } });
  const moduleForm = useForm<any>({ defaultValues: { order: 1, title: '', description: '', isFree: false, price: '', currency: 'NGN', isPublished: true } });
  const bundleForm = useForm<any>({ defaultValues: { name: '', description: '', price: 0, currency: 'NGN', isPublished: true, moduleIds: [] as string[] } });
  const lessonForm = useForm<any>({ defaultValues: { order: 1, title: '', description: '', durationMins: '', videoUrl: '', notesUrl: '', isPublished: true } });
  const controlStyle = {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    padding: '9px 10px',
    fontSize: 13,
  } as const;
  const areaStyle = { ...controlStyle, resize: 'vertical' as const, minHeight: 74 };

  const createCourseM = useMutation({
    mutationFn: (d: any) => coursesApi.adminCreate(d),
    onSuccess: () => {
      toast.success('Learn course created');
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      courseForm.reset({ slug: '', title: '', description: '', whatsappLink: '', price: 0, currency: 'NGN', isPublished: false });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create course'),
  });
  const createModuleM = useMutation({
    mutationFn: (d: any) => coursesApi.adminCreateModule(d),
    onSuccess: () => {
      toast.success('Module created');
      qc.invalidateQueries({ queryKey: ['admin-modules', courseId] });
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      moduleForm.reset({ order: (modules as any[]).length + 1, title: '', description: '', isFree: false, price: '', currency: 'NGN', isPublished: true });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create module'),
  });
  const createBundleM = useMutation({
    mutationFn: (d: any) => coursesApi.adminCreateBundle(d),
    onSuccess: () => {
      toast.success('Bundle created');
      qc.invalidateQueries({ queryKey: ['admin-bundles', courseId] });
      bundleForm.reset({ name: '', description: '', price: 0, currency: 'NGN', isPublished: true, moduleIds: [] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create bundle'),
  });
  const createLessonM = useMutation({
    mutationFn: (d: any) => coursesApi.adminCreateLesson(d),
    onSuccess: () => {
      toast.success('Lesson created');
      qc.invalidateQueries({ queryKey: ['admin-lessons', moduleId] });
      const maxOrder = Math.max(0, ...((lessons as any[]).map((l: any) => Number(l.order ?? 0))));
      lessonForm.reset({ order: maxOrder + 1, title: '', description: '', durationMins: '', videoUrl: '', notesUrl: '', isPublished: true });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create lesson'),
  });

  const updateCourseM = useMutation({
    mutationFn: ({ id, data }: any) => coursesApi.adminUpdate(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-courses'] }),
    onError: () => toast.error('Failed to update course'),
  });
  const updateModuleM = useMutation({
    mutationFn: ({ id, data }: any) => coursesApi.adminUpdateModule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-modules', courseId] }),
    onError: () => toast.error('Failed to update module'),
  });
  const updateBundleM = useMutation({
    mutationFn: ({ id, data }: any) => coursesApi.adminUpdateBundle(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bundles', courseId] }),
    onError: () => toast.error('Failed to update bundle'),
  });
  const updateLessonM = useMutation({
    mutationFn: ({ id, data }: any) => coursesApi.adminUpdateLesson(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-lessons', moduleId] }),
    onError: () => toast.error('Failed to update lesson'),
  });

  const deleteCourseM = useMutation({
    mutationFn: (id: string) => coursesApi.adminRemove(id),
    onSuccess: () => {
      toast.success('Course deleted');
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      setCourseId('');
      setModuleId('');
    },
    onError: () => toast.error('Failed to delete course'),
  });
  const deleteModuleM = useMutation({
    mutationFn: (id: string) => coursesApi.adminRemoveModule(id),
    onSuccess: () => {
      toast.success('Module deleted');
      qc.invalidateQueries({ queryKey: ['admin-modules', courseId] });
      setModuleId('');
    },
    onError: () => toast.error('Failed to delete module'),
  });
  const deleteBundleM = useMutation({
    mutationFn: (id: string) => coursesApi.adminRemoveBundle(id),
    onSuccess: () => {
      toast.success('Bundle deleted');
      qc.invalidateQueries({ queryKey: ['admin-bundles', courseId] });
    },
    onError: () => toast.error('Failed to delete bundle'),
  });
  const deleteLessonM = useMutation({
    mutationFn: (id: string) => coursesApi.adminRemoveLesson(id),
    onSuccess: () => {
      toast.success('Lesson deleted');
      qc.invalidateQueries({ queryKey: ['admin-lessons', moduleId] });
    },
    onError: () => toast.error('Failed to delete lesson'),
  });

  if (isLoading) return <PageLoader />;

  const titleMap: Record<typeof view, string> = {
    courses: 'Courses',
    modules: 'Modules',
    lessons: 'Lessons',
    bundles: 'Bundles',
    purchases: 'Purchases',
  };

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 8 }}>
        Adhara Learn · {titleMap[view]}
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18 }}>
        Manage your paid course content without a jam-packed page.
      </div>

      {(view === 'courses') && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>Create Course</div>
            <form onSubmit={courseForm.handleSubmit((d) => createCourseM.mutate({ ...d, price: Number(d.price || 0) }))}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px', gap: 10 }}>
                <Field label="Slug" required><input {...courseForm.register('slug', { required: true })} placeholder="data-analytics-track" style={controlStyle} /></Field>
                <Field label="Title" required><input {...courseForm.register('title', { required: true })} placeholder="Data Analytics Track" style={controlStyle} /></Field>
                <Field label="Price"><input {...courseForm.register('price')} type="number" min={0} style={controlStyle} /></Field>
              </div>
              <div style={{ marginTop: 8 }}>
                <Field label="WhatsApp community link">
                  <input {...courseForm.register('whatsappLink')} placeholder="https://chat.whatsapp.com/..." style={controlStyle} />
                </Field>
              </div>
              <div style={{ marginTop: 10 }}>
                <Field label="Description"><textarea {...courseForm.register('description')} rows={2} style={areaStyle} /></Field>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" {...courseForm.register('isPublished')} /> Publish now
                </label>
                <button className="btn btn-gold btn-sm" disabled={createCourseM.isPending}>{createCourseM.isPending ? 'Creating...' : 'Create course'}</button>
              </div>
            </form>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <Field label="Selected Course">
              <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setModuleId(''); }} style={controlStyle}>
                <option value="">Select course...</option>
                {(courses as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title} · ₦{Number(c.price ?? 0).toLocaleString()}</option>
                ))}
              </select>
            </Field>
            {!!courseId && courseEdit && (
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px', gap: 8 }}>
                  <Field label="Slug"><input value={courseEdit.slug} onChange={(e) => setCourseEdit((s: any) => ({ ...s, slug: e.target.value }))} style={controlStyle} /></Field>
                  <Field label="Title"><input value={courseEdit.title} onChange={(e) => setCourseEdit((s: any) => ({ ...s, title: e.target.value }))} style={controlStyle} /></Field>
                  <Field label="Price"><input type="number" min={0} value={courseEdit.price} onChange={(e) => setCourseEdit((s: any) => ({ ...s, price: Number(e.target.value || 0) }))} style={controlStyle} /></Field>
                </div>
                <Field label="WhatsApp community link">
                  <input value={courseEdit.whatsappLink} onChange={(e) => setCourseEdit((s: any) => ({ ...s, whatsappLink: e.target.value }))} style={controlStyle} />
                </Field>
                <Field label="Description">
                  <textarea value={courseEdit.description} onChange={(e) => setCourseEdit((s: any) => ({ ...s, description: e.target.value }))} rows={3} style={areaStyle} />
                </Field>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={!!courseEdit.isPublished} onChange={(e) => setCourseEdit((s: any) => ({ ...s, isPublished: e.target.checked }))} /> Published
                </label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                  <button
                    className="btn btn-gold btn-sm"
                    onClick={() => updateCourseM.mutate({ id: courseId, data: { ...courseEdit, price: Number(courseEdit.price || 0) } })}
                    disabled={updateCourseM.isPending}
                  >
                    {updateCourseM.isPending ? 'Saving…' : 'Save course'}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteCourseM.mutate(courseId)}>
                    Delete course
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {(view === 'modules') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>Modules</div>
            <div style={{ marginBottom: 10 }}>
              <Field label="Selected Course">
                <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setModuleId(''); }} style={controlStyle}>
                  <option value="">Select course...</option>
                  {(courses as any[]).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.title} · ₦{Number(c.price ?? 0).toLocaleString()}</option>
                  ))}
                </select>
              </Field>
            </div>
            <form onSubmit={moduleForm.handleSubmit((d) => createModuleM.mutate({
              courseId,
              order: Number(d.order),
              title: d.title,
              description: d.description || null,
              isFree: !!d.isFree,
              price: d.isFree ? null : (d.price ? Number(d.price) : null),
              currency: d.currency || 'NGN',
              isPublished: !!d.isPublished,
            }))}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 110px', gap: 8 }}>
                <input {...moduleForm.register('order')} type="number" min={1} placeholder="Order" style={controlStyle} />
                <input {...moduleForm.register('title', { required: true })} placeholder="Module title" style={controlStyle} />
                <input {...moduleForm.register('price')} type="number" min={0} placeholder="Price" style={controlStyle} />
              </div>
              <div style={{ marginTop: 8 }}>
                <textarea {...moduleForm.register('description')} rows={2} placeholder="Description" style={areaStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 12, color: 'var(--muted)' }}><input type="checkbox" {...moduleForm.register('isFree')} /> Free module</label>
                <button className="btn btn-gold btn-sm" disabled={createModuleM.isPending}>Add module</button>
              </div>
            </form>
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {(modules as any[]).map((m: any) => (
                <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--surface2)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>M{m.order} · {m.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {m.isFree ? 'Free' : `₦${Number(m.price ?? 0).toLocaleString()}`} · {m.isPublished ? 'Published' : 'Draft'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setModuleId(m.id)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteModuleM.mutate(m.id)}>Delete</button>
                  </div>
                </div>
              ))}
              {(modules as any[]).length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>No modules yet.</div>}
            </div>
          </div>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>Edit Module</div>
            {!moduleId || !moduleEdit ? (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Select a module and click Edit.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px', gap: 8 }}>
                  <Field label="Order"><input type="number" min={1} value={moduleEdit.order} onChange={(e) => setModuleEdit((s: any) => ({ ...s, order: Number(e.target.value || 1) }))} style={controlStyle} /></Field>
                  <Field label="Title"><input value={moduleEdit.title} onChange={(e) => setModuleEdit((s: any) => ({ ...s, title: e.target.value }))} style={controlStyle} /></Field>
                  <Field label="Price"><input type="number" min={0} disabled={!!moduleEdit.isFree} value={moduleEdit.price} onChange={(e) => setModuleEdit((s: any) => ({ ...s, price: e.target.value }))} style={controlStyle} /></Field>
                </div>
                <Field label="Description"><textarea rows={3} value={moduleEdit.description} onChange={(e) => setModuleEdit((s: any) => ({ ...s, description: e.target.value }))} style={areaStyle} /></Field>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={!!moduleEdit.isFree} onChange={(e) => setModuleEdit((s: any) => ({ ...s, isFree: e.target.checked, price: e.target.checked ? '' : s.price }))} /> Free module
                </label>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={!!moduleEdit.isPublished} onChange={(e) => setModuleEdit((s: any) => ({ ...s, isPublished: e.target.checked }))} /> Published
                </label>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => updateModuleM.mutate({
                    id: moduleId,
                    data: {
                      order: Number(moduleEdit.order || 1),
                      title: moduleEdit.title,
                      description: moduleEdit.description || null,
                      isFree: !!moduleEdit.isFree,
                      price: moduleEdit.isFree ? null : (moduleEdit.price === '' ? null : Number(moduleEdit.price)),
                      currency: moduleEdit.currency || 'NGN',
                      isPublished: !!moduleEdit.isPublished,
                    },
                  })}
                  disabled={updateModuleM.isPending}
                >
                  {updateModuleM.isPending ? 'Saving…' : 'Save module'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {(view === 'bundles') && (
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>Bundles</div>
          <div style={{ marginBottom: 10 }}>
            <Field label="Selected Course">
              <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setModuleId(''); }} style={controlStyle}>
                <option value="">Select course...</option>
                {(courses as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title} · ₦{Number(c.price ?? 0).toLocaleString()}</option>
                ))}
              </select>
            </Field>
          </div>
          <form onSubmit={bundleForm.handleSubmit((d) => {
            const moduleIds = Array.isArray(d.moduleIds) ? d.moduleIds : (typeof d.moduleIds === 'string' && d.moduleIds ? [d.moduleIds] : []);
            createBundleM.mutate({
              courseId,
              name: d.name,
              description: d.description || null,
              price: Number(d.price || 0),
              currency: d.currency || 'NGN',
              isPublished: !!d.isPublished,
              moduleIds,
            });
          })}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
              <input {...bundleForm.register('name', { required: true })} placeholder="Bundle name" style={controlStyle} />
              <input {...bundleForm.register('price')} type="number" min={0} placeholder="Price" style={controlStyle} />
            </div>
            <div style={{ marginTop: 8 }}>
              <textarea {...bundleForm.register('description')} rows={2} placeholder="Description" style={areaStyle} />
            </div>
            <div style={{ marginTop: 8 }}>
              <select {...bundleForm.register('moduleIds')} multiple style={{ ...controlStyle, minHeight: 88 }}>
                {(modules as any[]).map((m: any) => <option key={m.id} value={m.id}>M{m.order} · {m.title}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Hold Ctrl/Cmd to select multiple modules.</span>
              <button className="btn btn-gold btn-sm" disabled={createBundleM.isPending}>Create bundle</button>
            </div>
          </form>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {(bundles as any[]).map((b: any) => (
              <div key={b.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--surface2)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>{b.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>₦{Number(b.price ?? 0).toLocaleString()} · {(b.items ?? []).length} modules · {b.isPublished ? 'Published' : 'Draft'}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => updateBundleM.mutate({ id: b.id, data: { isPublished: !b.isPublished } })}>Toggle publish</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteBundleM.mutate(b.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(view === 'lessons') && !!courseId && (
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>Lessons (within selected module)</div>
          <div style={{ marginBottom: 10 }}>
            <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} style={controlStyle}>
              <option value="">Select module...</option>
              {(modules as any[]).map((m: any) => <option key={m.id} value={m.id}>M{m.order} · {m.title}</option>)}
            </select>
          </div>
          {!!moduleId && (
            <>
              <form onSubmit={lessonForm.handleSubmit((d) => {
                const maxOrder = Math.max(0, ...((lessons as any[]).map((l: any) => Number(l.order ?? 0))));
                const order = Number(d.order || 0) > 0 ? Number(d.order) : (maxOrder + 1);
                return createLessonM.mutate({
                moduleId,
                order,
                title: d.title,
                description: d.description || null,
                durationMins: d.durationMins ? Number(d.durationMins) : null,
                videoUrl: d.videoUrl || null,
                notesUrl: d.notesUrl || null,
                isPublished: !!d.isPublished,
              });
              })}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 130px', gap: 8 }}>
                  <input {...lessonForm.register('order')} type="number" min={1} placeholder="Order" style={controlStyle} />
                  <input {...lessonForm.register('title', { required: true })} placeholder="Lesson title" style={controlStyle} />
                  <input {...lessonForm.register('durationMins')} type="number" min={0} placeholder="Mins" style={controlStyle} />
                </div>
                <div style={{ marginTop: 8 }}>
                  <textarea {...lessonForm.register('description')} rows={2} placeholder="Description" style={areaStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginTop: 8 }}>
                  <input {...lessonForm.register('videoUrl')} placeholder="Video URL" style={controlStyle} />
                  <input {...lessonForm.register('notesUrl')} placeholder="Notes URL" style={controlStyle} />
                  <button className="btn btn-gold btn-sm" disabled={createLessonM.isPending}>Add lesson</button>
                </div>
              </form>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  {(lessons as any[]).map((l: any) => (
                    <div key={l.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--surface2)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>L{l.order} · {l.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{l.durationMins ?? 0} mins · {l.isPublished ? 'Published' : 'Draft'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setLessonEditId(l.id)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => updateLessonM.mutate({ id: l.id, data: { isPublished: !l.isPublished } })}>Publish</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteLessonM.mutate(l.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                  {(lessons as any[]).length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>No lessons yet.</div>}
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--surface)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 8 }}>Edit Lesson</div>
                  {!lessonEditId || !lessonEdit ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Select a lesson and click Edit.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 110px', gap: 8 }}>
                        <Field label="Order">
                          <input type="number" min={1} value={lessonEdit.order} onChange={(e) => setLessonEdit((s: any) => ({ ...s, order: Number(e.target.value || 1) }))} style={controlStyle} />
                        </Field>
                        <Field label="Title">
                          <input value={lessonEdit.title} onChange={(e) => setLessonEdit((s: any) => ({ ...s, title: e.target.value }))} style={controlStyle} />
                        </Field>
                        <Field label="Mins">
                          <input type="number" min={0} value={lessonEdit.durationMins} onChange={(e) => setLessonEdit((s: any) => ({ ...s, durationMins: e.target.value }))} style={controlStyle} />
                        </Field>
                      </div>
                      <Field label="Description">
                        <textarea rows={2} value={lessonEdit.description} onChange={(e) => setLessonEdit((s: any) => ({ ...s, description: e.target.value }))} style={areaStyle} />
                      </Field>
                      <Field label="Video URL">
                        <input value={lessonEdit.videoUrl} onChange={(e) => setLessonEdit((s: any) => ({ ...s, videoUrl: e.target.value }))} style={controlStyle} />
                      </Field>
                      <Field label="Notes URL">
                        <input value={lessonEdit.notesUrl} onChange={(e) => setLessonEdit((s: any) => ({ ...s, notesUrl: e.target.value }))} style={controlStyle} />
                      </Field>
                      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="checkbox" checked={!!lessonEdit.isPublished} onChange={(e) => setLessonEdit((s: any) => ({ ...s, isPublished: e.target.checked }))} /> Published
                      </label>
                      <button
                        className="btn btn-gold btn-sm"
                        onClick={() => updateLessonM.mutate({
                          id: lessonEditId,
                          data: {
                            order: Number(lessonEdit.order || 1),
                            title: lessonEdit.title,
                            description: lessonEdit.description || null,
                            durationMins: lessonEdit.durationMins === '' ? null : Number(lessonEdit.durationMins),
                            videoUrl: lessonEdit.videoUrl || null,
                            notesUrl: lessonEdit.notesUrl || null,
                            isPublished: !!lessonEdit.isPublished,
                          },
                        })}
                        disabled={updateLessonM.isPending}
                      >
                        {updateLessonM.isPending ? 'Saving…' : 'Save lesson'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {(view === 'purchases') && (
      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>Learn Purchases</div>
        {(purchases as any[]).length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>No learn purchases yet.</div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr 1fr', gap: 8, marginBottom: 10 }}>
              <select value={purchaseType} onChange={(e) => setPurchaseType(e.target.value)} style={controlStyle}>
                <option value="">All types</option>
                <option value="COURSE">COURSE</option>
                <option value="MODULE">MODULE</option>
                <option value="BUNDLE">BUNDLE</option>
              </select>
              <select value={purchaseStatus} onChange={(e) => setPurchaseStatus(e.target.value)} style={controlStyle}>
                <option value="">All statuses</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
              <select value={purchaseCourse} onChange={(e) => setPurchaseCourse(e.target.value)} style={controlStyle}>
                <option value="">All courses</option>
                {(courses as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <input
                value={purchaseSearch}
                onChange={(e) => setPurchaseSearch(e.target.value)}
                placeholder="Search learner/course/item..."
                style={controlStyle}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
              Showing {Math.min(150, filteredPurchases.length)} of {filteredPurchases.length} matching purchases
            </div>
            <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Learner</th>
                  <th>Course</th>
                  <th>Item</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.slice(0, 150).map((p: any) => (
                  <tr key={`${p.kind}-${p.id}`}>
                    <td>{p.kind}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{p.learner?.firstName} {p.learner?.lastName}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.learner?.email}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{p.course?.title ?? '—'}</td>
                    <td style={{ fontSize: 12 }}>{p.item}</td>
                    <td style={{ fontWeight: 700, color: 'var(--gold)' }}>₦{Number(p.amount ?? 0).toLocaleString()}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{dayjs(p.paidAt ?? p.createdAt).format('MMM D, YYYY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
