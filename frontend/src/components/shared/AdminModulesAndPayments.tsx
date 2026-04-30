'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { tracksApi, modulesApi, paymentsApi, enrollmentsApi } from '@/lib/api';
import { PageLoader, EmptyState, Modal, ConfirmDialog, Field, Spinner } from '@/components/ui';

export function AdminModules() {
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const qc = useQueryClient();

  const { data: tracks = [], isLoading: loadingTracks } = useQuery({ queryKey: ['tracks'], queryFn: () => tracksApi.list() });
  const { data: modules = [], isLoading: loadingMods } = useQuery({
    queryKey: ['admin-modules', selectedTrack?.id],
    queryFn: () => modulesApi.byTrack(selectedTrack!.id),
    enabled: !!selectedTrack?.id,
  });

  const createForm = useForm<any>({ defaultValues: { order: 1, isPublished: false } });
  const editForm = useForm<any>();

  useEffect(() => { if (editModal) editForm.reset({ title: editModal.title, description: editModal.description ?? '', order: editModal.order, videoUrl: editModal.videoUrl ?? '', notesUrl: editModal.notesUrl ?? '', durationMins: editModal.durationMins ?? '', isPublished: editModal.isPublished }); }, [editModal]);
  useEffect(() => { if ((tracks as any[]).length > 0 && !selectedTrack) setSelectedTrack((tracks as any[])[0]); }, [tracks]);

  const createMutation = useMutation({
    mutationFn: (d: any) => modulesApi.create(selectedTrack.id, { ...d, order: Number(d.order), durationMins: d.durationMins ? Number(d.durationMins) : undefined }),
    onSuccess: () => { toast.success('Module created!'); qc.invalidateQueries({ queryKey: ['admin-modules', selectedTrack?.id] }); setCreateModal(false); createForm.reset(); },
    onError: () => toast.error('Failed to create'),
  });
  const updateMutation = useMutation({
    mutationFn: (d: any) => modulesApi.update(editModal.id, { ...d, order: Number(d.order), durationMins: d.durationMins ? Number(d.durationMins) : null }),
    onSuccess: () => { toast.success('Module updated!'); qc.invalidateQueries({ queryKey: ['admin-modules', selectedTrack?.id] }); setEditModal(null); },
    onError: () => toast.error('Failed to update'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => modulesApi.remove(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin-modules', selectedTrack?.id] }); setDeleteConfirm(null); },
    onError: () => toast.error('Failed to delete'),
  });

  const togglePublish = (mod: any) => {
    modulesApi.update(mod.id, { isPublished: !mod.isPublished })
      .then(() => { qc.invalidateQueries({ queryKey: ['admin-modules', selectedTrack?.id] }); toast.success(mod.isPublished ? 'Module hidden' : 'Published!'); })
      .catch(() => toast.error('Update failed'));
  };

  function ModuleForm({ form, onSubmit, loading }: any) {
    return (
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
            <Field label="Module Title" required><input {...form.register('title', { required: true })} placeholder="Introduction to React" /></Field>
            <Field label="Order"><input {...form.register('order')} type="number" min={1} /></Field>
          </div>
          <Field label="Description"><textarea {...form.register('description')} rows={2} style={{ resize: 'vertical' }} placeholder="What learners will cover..." /></Field>
          <Field label="Video URL (YouTube / Vimeo / direct)"><input {...form.register('videoUrl')} type="url" placeholder="https://youtube.com/watch?v=..." /></Field>
          <Field label="Notes / Slides URL"><input {...form.register('notesUrl')} type="url" placeholder="https://docs.google.com/..." /></Field>
          <Field label="Duration (minutes)"><input {...form.register('durationMins')} type="number" min={1} placeholder="90" /></Field>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>
            <input type="checkbox" {...form.register('isPublished')} />
            Publish immediately (learners can see this)
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-gold btn-sm" disabled={loading}>{loading ? 'Saving...' : 'Save Module'}</button>
          </div>
        </div>
      </form>
    );
  }

  if (loadingTracks) return <PageLoader />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, minHeight: '70vh' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Tracks</div>
        {(tracks as any[]).map((t: any) => (
          <button key={t.id} onClick={() => setSelectedTrack(t)} style={{ width: '100%', padding: '12px 16px', background: selectedTrack?.id === t.id ? 'rgba(240,165,0,0.08)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer', borderLeft: selectedTrack?.id === t.id ? '3px solid var(--gold)' : '3px solid transparent' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: selectedTrack?.id === t.id ? 'var(--gold)' : 'var(--text)', marginBottom: 2 }}>{t.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t._count?.modules ?? 0} modules</div>
          </button>
        ))}
      </div>

      <div>
        {!selectedTrack ? <EmptyState icon="📦" title="Select a track" /> : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>{selectedTrack.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{selectedTrack.duration} weeks · {(modules as any[]).length} modules</div>
              </div>
              <button className="btn btn-gold btn-sm" onClick={() => { createForm.setValue('order', (modules as any[]).length + 1); setCreateModal(true); }}>+ Add Module</button>
            </div>

            {loadingMods ? <PageLoader /> : (modules as any[]).length === 0 ? (
              <EmptyState icon="📚" title="No modules yet" message="Add the first module to this track." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(modules as any[]).map((mod: any) => (
                  <div key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--surface)', border: `1px solid ${mod.isPublished ? 'rgba(0,212,170,0.2)' : 'var(--border)'}`, borderRadius: 'var(--radius)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, background: mod.isPublished ? 'var(--teal)' : 'var(--surface2)', color: mod.isPublished ? '#060A12' : 'var(--muted)', border: `2px solid ${mod.isPublished ? 'var(--teal)' : 'var(--border)'}` }}>
                      {mod.order}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 3 }}>{mod.title}</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        {mod.videoUrl && <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 700 }}>▶ Video</span>}
                        {mod.notesUrl && <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 700 }}>📄 Notes</span>}
                        {mod.durationMins && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{mod.durationMins} min</span>}
                        <span style={{ fontSize: 10, fontWeight: 700, background: mod.isPublished ? 'rgba(0,212,170,0.1)' : 'rgba(255,255,255,0.05)', color: mod.isPublished ? 'var(--teal)' : 'var(--muted)', padding: '2px 8px', borderRadius: 20 }}>
                          {mod.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => togglePublish(mod)} style={{ fontSize: 11 }}>{mod.isPublished ? 'Unpublish' : 'Publish'}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditModal(mod)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteConfirm(mod)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={createModal} onClose={() => { setCreateModal(false); createForm.reset(); }} title={`Add Module — ${selectedTrack?.name}`} size="md">
        <ModuleForm form={createForm} onSubmit={(d: any) => createMutation.mutate(d)} loading={createMutation.isPending} />
      </Modal>
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit: ${editModal?.title}`} size="md">
        <ModuleForm form={editForm} onSubmit={(d: any) => updateMutation.mutate(d)} loading={updateMutation.isPending} />
      </Modal>
      <ConfirmDialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteMutation.mutate(deleteConfirm.id)} title="Delete Module" message={`Delete "${deleteConfirm?.title}"? This cannot be undone.`} confirmLabel="Delete" danger loading={deleteMutation.isPending} />
    </div>
  );
}

export function LearnerPayments() {
  const { data: enrollments = [], isLoading: loadEnrol } = useQuery({ queryKey: ['enrollments-me'], queryFn: enrollmentsApi.me });
  const activeEnrollment = (enrollments as any[]).find((e: any) => e.status === 'ACTIVE');
  const enrollmentId = activeEnrollment?.id;

  const { data: payments = [], isLoading: loadPay } = useQuery({
    queryKey: ['my-payments', enrollmentId],
    queryFn: () => paymentsApi.list(enrollmentId!),
    enabled: !!enrollmentId,
  });

  const initiateMutation = useMutation({
    mutationFn: (type: string) => paymentsApi.initiate({ enrollmentId, type }),
    onSuccess: (data: any) => {
      if (data?.authorizationUrl) { window.open(data.authorizationUrl, '_blank', 'noopener'); toast.success('Redirecting to Paystack…'); }
    },
    onError: () => toast.error('Could not initiate payment. Check Paystack configuration.'),
  });

  if (loadEnrol || loadPay) return <PageLoader />;
  if (!activeEnrollment) return <EmptyState icon="💳" title="No active enrollment" message="Enrol in a cohort to manage payments." />;

  const track = activeEnrollment.cohort?.track;
  const totalFee = track?.price ?? 85000;
  const paid = (payments as any[]).filter((p: any) => p.status === 'SUCCESS').reduce((s: number, p: any) => s + p.amount, 0);
  const outstanding = Math.max(0, totalFee - paid);
  const isFullyPaid = outstanding === 0;
  const plan = activeEnrollment.paymentPlan ?? 'FULL';
  const pctPaid = Math.min(100, totalFee > 0 ? Math.round((paid / totalFee) * 100) : 0);
  const SC: Record<string, string> = { SUCCESS: 'var(--teal)', PENDING: 'var(--gold)', FAILED: 'var(--red)' };

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>Payments</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>{track?.name} · {activeEnrollment.cohort?.name}</div>

      <div style={{ background: isFullyPaid ? 'linear-gradient(135deg,rgba(0,212,170,0.08),rgba(0,212,170,0.03))' : 'linear-gradient(135deg,rgba(240,165,0,0.08),rgba(240,165,0,0.03))', border: `1px solid ${isFullyPaid ? 'rgba(0,212,170,0.25)' : 'rgba(240,165,0,0.25)'}`, borderRadius: 'var(--radius-lg)', padding: '22px 26px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 16 }}>
          {[{ lbl: 'Total Fee', val: `₦${totalFee.toLocaleString()}`, c: 'var(--text)' }, { lbl: 'Paid', val: `₦${paid.toLocaleString()}`, c: 'var(--teal)' }, { lbl: 'Outstanding', val: `₦${outstanding.toLocaleString()}`, c: outstanding > 0 ? 'var(--gold)' : 'var(--teal)' }].map(s => (
            <div key={s.lbl}><div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.lbl}</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: s.c }}>{s.val}</div></div>
          ))}
        </div>
        <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}><div className="progress-fill" style={{ width: `${pctPaid}%`, background: isFullyPaid ? 'var(--teal)' : 'var(--gold)' }} /></div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{isFullyPaid ? '✓ Fully paid — thank you!' : `${pctPaid}% paid · ${plan === 'INSTALMENT' ? '2-instalment plan' : 'Full payment'}`}</div>
      </div>

      {!isFullyPaid && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>Make a Payment</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plan === 'FULL' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div><div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>Full Payment</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>₦{outstanding.toLocaleString()} remaining</div></div>
                <button className="btn btn-gold btn-sm" onClick={() => initiateMutation.mutate('FULL')} disabled={initiateMutation.isPending}>{initiateMutation.isPending ? <Spinner size={14} color="#060A12" /> : 'Pay Now →'}</button>
              </div>
            ) : (
              [{ type: 'INSTALMENT_1', label: '1st Instalment (50%)', amount: Math.round(totalFee * 0.5) }, { type: 'INSTALMENT_2', label: '2nd Instalment (50%)', amount: Math.round(totalFee * 0.5) }].map(inst => {
                const alreadyPaid = (payments as any[]).some((p: any) => p.type === inst.type && p.status === 'SUCCESS');
                return (
                  <div key={inst.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: alreadyPaid ? 'rgba(0,212,170,0.05)' : 'var(--surface2)', border: `1px solid ${alreadyPaid ? 'rgba(0,212,170,0.2)' : 'var(--border)'}`, borderRadius: 'var(--radius)', opacity: alreadyPaid ? 0.7 : 1 }}>
                    <div><div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{inst.label}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>₦{inst.amount.toLocaleString()}</div></div>
                    {alreadyPaid ? <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700 }}>✓ Paid</span> : <button className="btn btn-gold btn-sm" onClick={() => initiateMutation.mutate(inst.type)} disabled={initiateMutation.isPending}>Pay →</button>}
                  </div>
                );
              })
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>Secured by Paystack. You will be redirected to complete payment.</div>
        </div>
      )}

      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>Payment History</div>
        {(payments as any[]).length === 0 ? <EmptyState icon="💳" title="No transactions yet" message="Your payment history will appear here." /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(payments as any[]).map((p: any) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{p.type === 'FULL' ? 'Full Payment' : p.type === 'INSTALMENT_1' ? '1st Instalment' : p.type === 'INSTALMENT_2' ? '2nd Instalment' : p.type === 'SCHOLARSHIP' ? 'Scholarship' : p.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending'}{p.paystackRef && <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{p.paystackRef.slice(0, 12)}…</span>}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>₦{(p.amount ?? 0).toLocaleString()}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: SC[p.status] ?? 'var(--muted)', background: `${SC[p.status] ?? '#888'}18`, padding: '3px 10px', borderRadius: 20 }}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
