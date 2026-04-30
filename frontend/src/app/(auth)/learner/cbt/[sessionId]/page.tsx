'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { cbtApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { PageLoader, Spinner } from '@/components/ui';

type Answer = { questionId: string; selected: string };

export default function CbtExamPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;
  const router = useRouter();
  const { user } = useAuthStore();

  const [phase, setPhase] = useState<'loading' | 'intro' | 'exam' | 'submitted'>('loading');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [result, setResult] = useState<any>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch session (with questions, no correct answers)
  const { data: session, isLoading, error } = useQuery({
    queryKey: ['cbt-take', sessionId],
    queryFn: () => cbtApi.take(sessionId),
    enabled: !!sessionId,
    staleTime: Infinity, // don't refetch during exam
  });

  // Check for existing attempt
  const { data: existingAttempt } = useQuery({
    queryKey: ['cbt-my-result', sessionId],
    queryFn: () => cbtApi.myResult(sessionId),
    enabled: !!sessionId,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (data: { sessionId: string; answers: Answer[]; timeTakenSecs: number }) =>
      cbtApi.submit(data),
    onSuccess: (data) => {
      setResult(data);
      setPhase('submitted');
      if (timerRef.current) clearInterval(timerRef.current);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Submission failed');
    },
  });

  useEffect(() => {
    if (!isLoading) {
      if (existingAttempt) setPhase('submitted'), setResult(existingAttempt);
      else if (session) setPhase('intro');
    }
  }, [isLoading, session, existingAttempt]);

  // Timer countdown
  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const startExam = () => {
    if (!session) return;
    setTimeLeft(session.durationMins * 60);
    setStartedAt(Date.now());
    setPhase('exam');
  };

  const handleSubmit = useCallback((autoSubmit = false) => {
    if (!session) return;
    if (!autoSubmit) {
      const unanswered = session.questions.filter((q: any) => !answers[q.id]).length;
      if (unanswered > 0) {
        const go = window.confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`);
        if (!go) return;
      }
    }
    const timeTakenSecs = Math.round((Date.now() - startedAt) / 1000);
    submitMutation.mutate({
      sessionId,
      answers: Object.entries(answers).map(([questionId, selected]) => ({ questionId, selected })),
      timeTakenSecs,
    });
  }, [session, answers, startedAt, sessionId]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const timerColor = timeLeft < 60 ? 'var(--red)' : timeLeft < 180 ? 'var(--gold)' : 'var(--teal)';

  if (isLoading || phase === 'loading') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PageLoader />
    </div>
  );

  if (error || !session) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 48 }}>❌</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>Quiz not found or not available</div>
      <button className="btn btn-gold" onClick={() => router.back()}>← Go Back</button>
    </div>
  );

  // ── INTRO SCREEN ──────────────────────────────────────────────────────────
  if (phase === 'intro') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-body)' }}>
      <div style={{ width: '100%', maxWidth: 540, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🧠</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color: 'var(--text)', marginBottom: 8 }}>
          {session.title}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>
          Read the instructions carefully before you begin.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32, textAlign: 'left' }}>
          {[
            { icon: '⏱', label: 'Time Limit', val: `${session.durationMins} minutes` },
            { icon: '❓', label: 'Questions', val: `${session.questions?.length ?? 0} MCQ` },
            { icon: '🎯', label: 'Total Marks', val: `${session.totalMarks} pts` },
            { icon: '✅', label: 'Pass Score', val: `${session.passScore} pts (${Math.round((session.passScore / session.totalMarks) * 100)}%)` },
          ].map(row => (
            <div key={row.label} style={{ padding: '14px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{row.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{row.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>{row.val}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', background: 'rgba(255,77,77,0.07)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: 'var(--radius)', marginBottom: 28, fontSize: 13, color: 'var(--text2)', textAlign: 'left', lineHeight: 1.6 }}>
          ⚠️ <strong style={{ color: 'var(--text)' }}>Rules:</strong> Each question has only one correct answer.
          The timer starts when you click "Begin". Do not refresh the page.
          The quiz auto-submits when time runs out.
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={() => router.back()}>← Cancel</button>
          <button className="btn btn-gold btn-lg" onClick={startExam}>
            Begin Exam →
          </button>
        </div>
      </div>
    </div>
  );

  // ── EXAM SCREEN ───────────────────────────────────────────────────────────
  if (phase === 'exam') {
    const questions = session.questions ?? [];
    const q = questions[current];
    const answeredCount = Object.keys(answers).length;

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(6,10,18,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
            {session.title}
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {answeredCount}/{questions.length} answered
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 20, color: timerColor,
              background: `${timerColor}1a`, border: `1px solid ${timerColor}40`,
              padding: '4px 14px', borderRadius: 100,
              animation: timeLeft < 60 ? 'pulse 1s infinite' : 'none',
            }}>
              ⏱ {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', maxWidth: 900, margin: '0 auto', width: '100%', padding: '24px 20px', gap: 24 }}>
          {/* Question navigator */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, position: 'sticky', top: 80 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Questions
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 16 }}>
                {questions.map((q: any, i: number) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrent(i)}
                    style={{
                      width: '100%', aspectRatio: '1', border: 'none', borderRadius: 6, cursor: 'pointer',
                      fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11,
                      background: answers[q.id] ? 'var(--teal)' : i === current ? 'var(--gold)' : 'var(--surface2)',
                      color: answers[q.id] || i === current ? '#060A12' : 'var(--muted)',
                      transform: i === current ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.1s',
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                <span style={{ color: 'var(--teal)', fontWeight: 700 }}>■</span> Answered
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                <span style={{ color: 'var(--gold)', fontWeight: 700 }}>■</span> Current
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--surface2)', fontWeight: 700, border: '1px solid var(--border)', padding: '0 2px' }}>■</span> Unanswered
              </div>
            </div>
          </div>

          {/* Question panel */}
          <div style={{ flex: 1 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32 }}>
              {/* Question number + text */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
                  Question {current + 1} of {questions.length}
                  {q.marks && q.marks > 1 && <span style={{ marginLeft: 8, color: 'var(--gold)' }}>· {q.marks} marks</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text)', lineHeight: 1.5 }}>
                  {q.question}
                </div>
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                  const text = q[`option${opt}`];
                  const isSelected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px',
                        background: isSelected ? 'rgba(240,165,0,0.1)' : 'var(--surface2)',
                        border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.12s', width: '100%',
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13,
                        background: isSelected ? 'var(--gold)' : 'var(--surface)',
                        color: isSelected ? '#060A12' : 'var(--muted)',
                        border: `2px solid ${isSelected ? 'transparent' : 'var(--border)'}`,
                      }}>
                        {opt}
                      </div>
                      <span style={{ fontSize: 14, color: isSelected ? 'var(--text)' : 'var(--text2)', lineHeight: 1.5, marginTop: 2 }}>
                        {text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCurrent(c => Math.max(0, c - 1))}
                  disabled={current === 0}
                >
                  ← Previous
                </button>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {answeredCount} / {questions.length} answered
                </span>
                {current < questions.length - 1 ? (
                  <button
                    className="btn btn-gold btn-sm"
                    onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    className="btn btn-gold btn-sm"
                    onClick={() => handleSubmit(false)}
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? <><Spinner size={14} color="#060A12" /> Submitting…</> : '📤 Submit Exam'}
                  </button>
                )}
              </div>
            </div>

            {/* Submit from anywhere */}
            {current < questions.length - 1 && (
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleSubmit(false)}
                  disabled={submitMutation.isPending}
                  style={{ color: 'var(--gold)', borderColor: 'rgba(240,165,0,0.3)' }}
                >
                  Finish & Submit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS SCREEN ────────────────────────────────────────────────────────
  const res = result ?? existingAttempt;
  const passed = res?.passed;
  const score = res?.score ?? 0;
  const totalMarks = session.totalMarks;
  const pct = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-body)' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Result card */}
        <div style={{
          background: passed
            ? 'linear-gradient(135deg, rgba(0,212,170,0.1), rgba(240,165,0,0.06))'
            : 'linear-gradient(135deg, rgba(255,77,77,0.1), rgba(255,77,77,0.04))',
          border: `1px solid ${passed ? 'rgba(0,212,170,0.3)' : 'rgba(255,77,77,0.3)'}`,
          borderRadius: 'var(--radius-xl)', padding: 40, textAlign: 'center', marginBottom: 20,
        }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{passed ? '🎉' : '😔'}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--text)', marginBottom: 8 }}>
            {passed ? 'Well Done!' : 'Not Quite There'}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
            {session.title}
          </div>

          {/* Score circle */}
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, padding: '20px 40px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 52, color: passed ? 'var(--teal)' : 'var(--red)', lineHeight: 1 }}>
              {score}
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>
              out of {totalMarks} · {pct}%
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center', marginBottom: 24 }}>
            {[
              { label: 'Result', val: passed ? '✅ PASS' : '❌ FAIL', color: passed ? 'var(--teal)' : 'var(--red)' },
              { label: 'Pass Mark', val: `${session.passScore} pts`, color: 'var(--text)' },
              { label: 'Time Taken', val: res?.timeTakenSecs ? `${Math.floor(res.timeTakenSecs / 60)}m ${res.timeTakenSecs % 60}s` : '—', color: 'var(--text)' },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px 8px', background: 'var(--surface2)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{item.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)', color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>

          {!passed && (
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              Don't worry — review the module materials and speak to your facilitator for guidance.
            </div>
          )}
        </div>

        {/* Answer review */}
        {res?.answers && (
          <div className="card" style={{ marginBottom: 16 }}>
            <button
              onClick={() => setReviewMode(r => !r)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text)', width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              Review Answers
              <span style={{ color: 'var(--muted)' }}>{reviewMode ? '▲' : '▼'}</span>
            </button>

            {reviewMode && (
              <div style={{ marginTop: 16 }}>
                {session.questions?.map((q: any, i: number) => {
                  const answerEntry = res.answers?.find((a: any) => a.questionId === q.id);
                  const isCorrect = answerEntry?.isCorrect;
                  return (
                    <div key={q.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                        <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginRight: 6 }}>Q{i + 1}.</span>
                        {q.question}
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 12, flexWrap: 'wrap' }}>
                        <span style={{ color: isCorrect ? 'var(--teal)' : 'var(--red)', fontWeight: 700 }}>
                          {isCorrect ? '✓' : '✗'} Your answer: {answerEntry?.selected ?? '—'}
                        </span>
                        {!isCorrect && (
                          <span style={{ color: 'var(--teal)' }}>· Correct: {q.correctOption}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={() => router.back()}>← Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
}
