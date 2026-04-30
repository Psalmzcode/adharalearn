'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { sessionsApi, learnersApi, facilitatorsApi } from '@/lib/api';
import { PageLoader, EmptyState, Avatar, Spinner } from '@/components/ui';

export function FacilitatorAttendance() {
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const qc = useQueryClient();

  const { data: fac } = useQuery({ queryKey: ['fac-me'], queryFn: facilitatorsApi.me });
  const activeCohortId = (fac as any)?.cohorts?.find((c: any) => c.status === 'ACTIVE')?.id;

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions', activeCohortId],
    queryFn: () => sessionsApi.byCohort(activeCohortId!),
    enabled: !!activeCohortId,
  });

  const { data: learners = [], isLoading: loadingLearners } = useQuery({
    queryKey: ['learners', activeCohortId],
    queryFn: () => learnersApi.list({ cohortId: activeCohortId! }),
    enabled: !!activeCohortId,
  });

  const { data: sessionDetail } = useQuery({
    queryKey: ['session-detail', selectedSession?.id],
    queryFn: () => sessionsApi.getOne(selectedSession!.id),
    enabled: !!selectedSession?.id,
  });

  const bulkMutation = useMutation({
    mutationFn: (records: { learnerId: string; present: boolean }[]) =>
      sessionsApi.bulkAttendance(selectedSession!.id, records),
    onSuccess: () => {
      toast.success('Attendance saved!');
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['session-detail', selectedSession?.id] });
    },
    onError: () => toast.error('Failed to save attendance'),
  });

  const selectSession = (session: any) => {
    setSelectedSession(session);
    setSaved(false);
    const init: Record<string, boolean> = {};
    (learners as any[]).forEach((l: any) => { init[l.id] = false; });
    setAttendance(init);
  };

  const toggle = (learnerId: string) => {
    setAttendance(a => ({ ...a, [learnerId]: !a[learnerId] }));
    setSaved(false);
  };

  const markAll = (present: boolean) => {
    const all: Record<string, boolean> = {};
    (learners as any[]).forEach((l: any) => { all[l.id] = present; });
    setAttendance(all);
    setSaved(false);
  };

  const save = () => {
    const records = (learners as any[]).map((l: any) => ({ learnerId: l.id, present: attendance[l.id] ?? false }));
    bulkMutation.mutate(records);
  };

  const now = Date.now();
  const todaySessions = (sessions as any[]).filter((s: any) => {
    const d = new Date(s.scheduledAt);
    return d.toDateString() === new Date().toDateString();
  });
  const liveSessions = (sessions as any[]).filter((s: any) => {
    const t = new Date(s.scheduledAt).getTime();
    return now >= t && now <= t + (s.durationMins || 90) * 60000;
  });
  const recentSessions = (sessions as any[]).filter((s: any) => {
    const t = new Date(s.scheduledAt).getTime();
    return t < now && t > now - 7 * 24 * 60 * 60 * 1000;
  }).slice(0, 8);

  const presentCount = Object.values(attendance).filter(Boolean).length;

  if (loadingSessions || loadingLearners) return <PageLoader />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, minHeight: '72vh' }}>
      {/* Session picker */}
      <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Select Session</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {liveSessions.length > 0 && (
            <>
              <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🔴 Live Now</div>
              {liveSessions.map((s: any) => (
                <button key={s.id} onClick={() => selectSession(s)} style={{ width: '100%', padding: '10px 16px', background: selectedSession?.id === s.id ? 'rgba(240,165,0,0.08)' : 'rgba(255,77,77,0.05)', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{dayjs(s.scheduledAt).format('HH:mm')} · {s.durationMins} min</div>
                </button>
              ))}
            </>
          )}
          {todaySessions.filter(s => !liveSessions.find((l: any) => l.id === s.id)).length > 0 && (
            <>
              <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today</div>
              {todaySessions.filter(s => !liveSessions.find((l: any) => l.id === s.id)).map((s: any) => (
                <button key={s.id} onClick={() => selectSession(s)} style={{ width: '100%', padding: '10px 16px', background: selectedSession?.id === s.id ? 'rgba(240,165,0,0.08)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{dayjs(s.scheduledAt).format('HH:mm')}</div>
                </button>
              ))}
            </>
          )}
          {recentSessions.length > 0 && (
            <>
              <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent</div>
              {recentSessions.map((s: any) => (
                <button key={s.id} onClick={() => selectSession(s)} style={{ width: '100%', padding: '10px 16px', background: selectedSession?.id === s.id ? 'rgba(240,165,0,0.08)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{dayjs(s.scheduledAt).format('ddd D MMM · HH:mm')}</div>
                </button>
              ))}
            </>
          )}
          {sessions.length === 0 && <div style={{ padding: 20, fontSize: 13, color: 'var(--muted)' }}>No sessions scheduled yet.</div>}
        </div>
      </div>

      {/* Attendance panel */}
      {!selectedSession ? (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState icon="📋" title="Select a session" message="Choose a session from the left to take attendance." />
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Session header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>{selectedSession.title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{dayjs(selectedSession.scheduledAt).format('dddd D MMMM YYYY · HH:mm')} · {selectedSession.durationMins} min</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'var(--teal)' }}>{presentCount}/{(learners as any[]).length}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Present</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${(learners as any[]).length > 0 ? (presentCount / (learners as any[]).length) * 100 : 0}%` }} /></div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-teal btn-sm" onClick={() => markAll(true)}>✓ Mark All Present</button>
            <button className="btn btn-ghost btn-sm" onClick={() => markAll(false)}>✗ Mark All Absent</button>
            {saved && <span style={{ fontSize: 12, color: 'var(--teal)', alignSelf: 'center', fontWeight: 700 }}>✓ Saved</span>}
          </div>

          {/* Learner list */}
          {(learners as any[]).length === 0 ? (
            <EmptyState icon="👥" title="No learners in cohort" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {(learners as any[]).map((l: any) => {
                const isPresent = attendance[l.id] ?? false;
                return (
                  <button
                    key={l.id}
                    onClick={() => toggle(l.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                      background: isPresent ? 'rgba(0,212,170,0.08)' : 'var(--surface2)',
                      border: `2px solid ${isPresent ? 'var(--teal)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.12s',
                    }}
                  >
                    <Avatar name={`${l.user.firstName} ${l.user.lastName}`} url={l.user.avatarUrl} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isPresent ? 'var(--teal)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.user.firstName} {l.user.lastName}
                      </div>
                      <div style={{ fontSize: 11, color: isPresent ? 'var(--teal)' : 'var(--muted)', fontWeight: 700 }}>
                        {isPresent ? '● Present' : '○ Absent'}
                      </div>
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: isPresent ? 'var(--teal)' : 'transparent', border: `2px solid ${isPresent ? 'var(--teal)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                      {isPresent ? '✓' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Save button */}
          <div style={{ marginTop: 8 }}>
            <button
              className="btn btn-gold"
              onClick={save}
              disabled={bulkMutation.isPending}
              style={{ minWidth: 180 }}
            >
              {bulkMutation.isPending ? <><Spinner size={14} color="#060A12" /> Saving...</> : `💾 Save Attendance (${presentCount} present)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
