'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { assignmentsApi, gradesApi, facilitatorsApi } from '@/lib/api';
import { PageLoader, EmptyState, Avatar, StatusBadge } from '@/components/ui';

export function FacilitatorGrades() {
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [scores, setScores] = useState<Record<string, { score: string; feedback: string }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const qc = useQueryClient();

  const { data: fac } = useQuery({
    queryKey: ['fac-me'],
    queryFn: facilitatorsApi.me,
  });
  const activeCohortId = (fac as any)?.cohorts?.find((c: any) => c.status === 'ACTIVE')?.id;

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', activeCohortId],
    queryFn: () => assignmentsApi.byCohort(activeCohortId!),
    enabled: !!activeCohortId,
  });

  const activeAssignmentId = selectedAssignment || (assignments as any[])[0]?.id;

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['grades', activeAssignmentId],
    queryFn: () => gradesApi.byAssignment(activeAssignmentId!),
    enabled: !!activeAssignmentId,
  });

  const activeAssignment = (assignments as any[]).find((a: any) => a.id === activeAssignmentId);

  // Save individual grade
  const saveGrade = async (submissionId: string) => {
    const entry = scores[submissionId];
    if (!entry?.score) { toast.error('Enter a score first'); return; }
    const score = parseInt(entry.score);
    if (isNaN(score) || score < 0 || score > (activeAssignment?.maxScore ?? 100)) {
      toast.error(`Score must be 0–${activeAssignment?.maxScore ?? 100}`);
      return;
    }
    setSaving(s => ({ ...s, [submissionId]: true }));
    try {
      await gradesApi.grade({
        submissionId,
        facilitatorId: (fac as any)?.id,
        score,
        feedback: entry.feedback,
      });
      toast.success('Grade saved!');
      qc.invalidateQueries({ queryKey: ['grades', activeAssignmentId] });
    } catch {
      toast.error('Failed to save grade');
    } finally {
      setSaving(s => ({ ...s, [submissionId]: false }));
    }
  };

  // Save all at once
  const saveAll = async () => {
    const ungraded = (submissions as any[]).filter((s: any) => !s.grade && scores[s.id]?.score);
    if (ungraded.length === 0) { toast('No new grades to save'); return; }

    const grades = ungraded
      .map((s: any) => ({
        submissionId: s.id,
        facilitatorId: (fac as any)?.id,
        score: parseInt(scores[s.id].score),
        feedback: scores[s.id].feedback ?? '',
      }))
      .filter(g => !isNaN(g.score));

    try {
      await gradesApi.bulkGrade(grades);
      toast.success(`${grades.length} grade${grades.length > 1 ? 's' : ''} saved!`);
      qc.invalidateQueries({ queryKey: ['grades', activeAssignmentId] });
    } catch {
      toast.error('Bulk save failed');
    }
  };

  const ungradedCount = (submissions as any[]).filter((s: any) => !s.grade).length;
  const gradedCount = (submissions as any[]).filter((s: any) => s.grade).length;
  const avgScore = gradedCount > 0
    ? Math.round((submissions as any[]).filter((s: any) => s.grade)
        .reduce((sum: number, s: any) => sum + s.grade.score, 0) / gradedCount)
    : 0;

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
        Grade Entry
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
        Bulk grade assignments for your cohort
      </div>

      {/* Assignment selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={activeAssignmentId ?? ''}
          onChange={e => setSelectedAssignment(e.target.value)}
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)', fontSize: 13, minWidth: 280 }}
        >
          {(assignments as any[]).map((a: any) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>

        {activeAssignment && (
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            Max: {activeAssignment.maxScore} pts
            {activeAssignment.dueAt && ` · Due ${dayjs(activeAssignment.dueAt).format('MMM D')}`}
          </span>
        )}
      </div>

      {/* Stats row */}
      {(submissions as any[]).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { icon: '📋', val: (submissions as any[]).length, lbl: 'Total Submissions' },
            { icon: '⏳', val: ungradedCount, lbl: 'Pending Grade', highlight: ungradedCount > 0 },
            { icon: '✅', val: gradedCount, lbl: 'Graded' },
            { icon: '📊', val: gradedCount > 0 ? `${avgScore}%` : '—', lbl: 'Class Average' },
          ].map(s => (
            <div key={s.lbl} className="stat-card" style={{ border: s.highlight ? '1px solid rgba(240,165,0,0.3)' : '1px solid var(--border)' }}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value" style={{ color: s.highlight ? 'var(--gold)' : undefined }}>{s.val}</div>
              <div className="stat-label">{s.lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk save button */}
      {ungradedCount > 0 && Object.keys(scores).some(k => scores[k]?.score) && (
        <div style={{ marginBottom: 16 }}>
          <button className="btn btn-gold btn-sm" onClick={saveAll}>
            💾 Save All Filled Grades
          </button>
        </div>
      )}

      {/* Submissions table */}
      {isLoading ? <PageLoader /> : (submissions as any[]).length === 0 ? (
        <EmptyState icon="📭" title="No submissions yet" message="Learners haven't submitted this assignment." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Learner</th>
                <th>Submitted</th>
                <th>Links</th>
                <th style={{ width: 100 }}>Score /{activeAssignment?.maxScore ?? 100}</th>
                <th style={{ width: 200 }}>Feedback</th>
                <th style={{ width: 80 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(submissions as any[]).map((s: any) => {
                const name = `${s.learner?.user?.firstName} ${s.learner?.user?.lastName}`;
                const existing = s.grade;
                const entry = scores[s.id] ?? { score: existing?.score?.toString() ?? '', feedback: existing?.feedback ?? '' };

                return (
                  <tr key={s.id} style={{ background: existing ? 'rgba(0,212,170,0.03)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={name} url={s.learner?.user?.avatarUrl} size={30} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                          {existing && (
                            <div style={{ fontSize: 10, color: 'var(--teal)', fontWeight: 700 }}>
                              ✓ Graded · {existing.score} pts
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {s.submittedAt ? dayjs(s.submittedAt).format('MMM D · HH:mm') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {s.repoUrl && (
                          <a href={s.repoUrl} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, textDecoration: 'none', background: 'rgba(240,165,0,0.1)', padding: '3px 8px', borderRadius: 20 }}>
                            GitHub ↗
                          </a>
                        )}
                        {s.deployedUrl && (
                          <a href={s.deployedUrl} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 700, textDecoration: 'none', background: 'rgba(0,212,170,0.1)', padding: '3px 8px', borderRadius: 20 }}>
                            Live ↗
                          </a>
                        )}
                        {!s.repoUrl && !s.deployedUrl && (
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={activeAssignment?.maxScore ?? 100}
                        value={entry.score}
                        onChange={e => setScores(sc => ({ ...sc, [s.id]: { ...entry, score: e.target.value } }))}
                        style={{
                          width: 72, background: 'var(--surface2)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', padding: '6px 8px', color: 'var(--text)',
                          fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'center',
                        }}
                        placeholder="—"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={entry.feedback}
                        onChange={e => setScores(sc => ({ ...sc, [s.id]: { ...entry, feedback: e.target.value } }))}
                        style={{
                          width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', padding: '6px 8px', color: 'var(--text)', fontSize: 12,
                        }}
                        placeholder="Optional..."
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() => saveGrade(s.id)}
                        disabled={saving[s.id] || !entry.score}
                        style={{
                          background: existing ? 'rgba(0,212,170,0.15)' : 'var(--gold)',
                          color: existing ? 'var(--teal)' : '#060A12',
                          border: existing ? '1px solid rgba(0,212,170,0.3)' : 'none',
                          borderRadius: 100, fontFamily: 'var(--font-display)', fontWeight: 700,
                          opacity: (!entry.score || saving[s.id]) ? 0.5 : 1,
                          cursor: (!entry.score || saving[s.id]) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {saving[s.id] ? '…' : existing ? 'Update' : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {(submissions as any[]).length > 0 && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--muted)' }}>
          💡 <strong style={{ color: 'var(--text)' }}>Tip:</strong> Fill all scores then use "Save All" to grade in one go. Learners see grades immediately after saving.
        </div>
      )}
    </div>
  );
}
