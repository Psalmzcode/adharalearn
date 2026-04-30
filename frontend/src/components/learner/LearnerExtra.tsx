'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { enrollmentsApi, learnersApi, cbtApi, curriculumApi, cohortChatApi, moduleProgressApi, alumniApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { PageLoader, EmptyState, StatusBadge, Avatar, Field } from '@/components/ui';
dayjs.extend(relativeTime);

function useActiveEnrollment() {
  const { data: enrollments = [] } = useQuery({ queryKey: ['enrollments-me'], queryFn: enrollmentsApi.me });
  return (enrollments as any[]).find((e: any) => e.status === 'ACTIVE');
}

function VideoPlayer({ url, title }: { url: string; title: string }) {
  const isYT = url.includes('youtube.com') || url.includes('youtu.be');
  const isVimeo = url.includes('vimeo.com');
  const ytId = isYT ? url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] : null;
  const vimeoId = isVimeo ? url.match(/vimeo\.com\/(\d+)/)?.[1] : null;
  const e = { position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', border: 'none' };
  const w = { position: 'relative' as const, paddingBottom: '56.25%', height: 0, borderRadius: 'var(--radius)', overflow: 'hidden' };
  if (ytId) return <div style={w}><iframe src={`https://www.youtube.com/embed/${ytId}?rel=0`} title={title} style={e} allowFullScreen /></div>;
  if (vimeoId) return <div style={w}><iframe src={`https://player.vimeo.com/video/${vimeoId}`} title={title} style={e} allowFullScreen /></div>;
  return <video controls style={{ width:'100%', borderRadius:'var(--radius)', background:'#000', maxHeight:400 }}><source src={url} /></video>;
}

export function LearnerCurriculum() {
  const [open, setOpen] = useState<string|null>(null);
  const qc = useQueryClient();
  const ae = useActiveEnrollment();
  const trackId = ae?.cohort?.track?.id, cohortId = ae?.cohortId;
  const { data: mods = [], isLoading } = useQuery({ queryKey: ['modules', trackId], queryFn: () => curriculumApi.modules(trackId!), enabled: !!trackId });
  const { data: asns = [] } = useQuery({ queryKey: ['assignments', cohortId], queryFn: () => curriculumApi.assignments(cohortId!), enabled: !!cohortId });
  const { data: subs = [] } = useQuery({ queryKey: ['curriculum-submissions'], queryFn: curriculumApi.mySubmissions });
  const { data: done = [] } = useQuery({ queryKey: ['module-completions'], queryFn: moduleProgressApi.mine });
  const { data: cbts = [] } = useQuery({ queryKey: ['cbt', cohortId], queryFn: () => cbtApi.byCohort(cohortId!), enabled: !!cohortId });
  const { data: attempts = [] } = useQuery({ queryKey: ['cbt-attempts'], queryFn: cbtApi.myAttempts });
  const markMutation = useMutation({ mutationFn: (id: string) => moduleProgressApi.markComplete(id), onSuccess: () => { toast.success('Module complete! 🎉'); qc.invalidateQueries({ queryKey: ['module-completions'] }); qc.invalidateQueries({ queryKey: ['enrollments-me'] }); } });
  if (isLoading) return <PageLoader />;
  if (!ae) return <EmptyState icon="📚" title="No active enrollment" message="Enrol to see curriculum." />;
  const track = ae.cohort?.track;
  const subMap = Object.fromEntries((subs as any[]).map((s:any) => [s.assignment?.id, s]));
  const doneSet = new Set((done as any[]).map((c:any) => c.moduleId));
  const attMap = Object.fromEntries((attempts as any[]).map((a:any) => [a.sessionId, a]));
  const aByM: Record<string,any[]> = {};
  (asns as any[]).forEach((a:any) => { const k = a.moduleId??'__'; aByM[k]=[...(aByM[k]??[]),a]; });
  const cByM: Record<string,any[]> = {};
  (cbts as any[]).forEach((s:any) => { const k = s.moduleId??'__'; cByM[k]=[...(cByM[k]??[]),s]; });
  const dc = (mods as any[]).filter((m:any) => doneSet.has(m.id)).length;
  const prog = (mods as any[]).length > 0 ? Math.round((dc/(mods as any[]).length)*100) : ae.progress??0;
  return (
    <div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'var(--text)', marginBottom:4 }}>{track?.name} Curriculum</div>
      <div style={{ color:'var(--muted)', fontSize:13, marginBottom:14 }}>{track?.duration} weeks · {(mods as any[]).length} modules</div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 18px', marginBottom:22 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}><span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Progress</span><span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'var(--gold)' }}>{prog}%</span></div>
        <div className="progress-bar" style={{ height:8 }}><div className="progress-fill" style={{ width:`${prog}%` }} /></div>
        <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{dc}/{(mods as any[]).length} modules complete</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {(mods as any[]).map((mod:any) => {
          const mA=aByM[mod.id]??[], mC=cByM[mod.id]??[], isDone=doneSet.has(mod.id), isOpen=open===mod.id;
          return (
            <div key={mod.id}>
              <div onClick={() => mod.isPublished && setOpen(isOpen?null:mod.id)} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:isOpen?'rgba(240,165,0,0.05)':'var(--surface)', border:`1px solid ${isOpen?'rgba(240,165,0,0.3)':isDone?'rgba(0,212,170,0.2)':'var(--border)'}`, borderRadius:isOpen?'var(--radius) var(--radius) 0 0':'var(--radius)', cursor:mod.isPublished?'pointer':'default', opacity:mod.isPublished?1:0.4, transition:'all 0.15s' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, background:isDone?'var(--teal)':mod.isPublished?'rgba(240,165,0,0.12)':'var(--surface2)', color:isDone?'#060A12':mod.isPublished?'var(--gold)':'var(--muted)', border:`2px solid ${isDone?'var(--teal)':mod.isPublished?'rgba(240,165,0,0.4)':'var(--border)'}` }}>{!mod.isPublished?'🔒':isDone?'✓':mod.order}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:3 }}>{mod.title}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    {mod.videoUrl && <span style={{ fontSize:11, color:'var(--teal)', fontWeight:700 }}>▶ Video</span>}
                    {mod.notesUrl && <span style={{ fontSize:11, color:'#3B82F6', fontWeight:700 }}>📄 Notes</span>}
                    {mA.length>0 && <span style={{ fontSize:11, color:'var(--muted)' }}>{mA.filter((a:any)=>subMap[a.id]).length}/{mA.length} tasks</span>}
                    {mod.durationMins && <span style={{ fontSize:11, color:'var(--muted)' }}>{mod.durationMins} min</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  {mC.length>0 && <span style={{ fontSize:10, fontWeight:700, background:'rgba(59,130,246,0.12)', color:'#3B82F6', padding:'2px 8px', borderRadius:20 }}>Quiz</span>}
                  {mod.isPublished && <span style={{ fontSize:18, color:'var(--muted)', transform:isOpen?'rotate(90deg)':'none', transition:'transform 0.2s', lineHeight:1 }}>›</span>}
                </div>
              </div>
              {isOpen && mod.isPublished && (
                <div style={{ padding:'20px 20px 20px 68px', background:'rgba(240,165,0,0.02)', border:'1px solid rgba(240,165,0,0.15)', borderTop:'none', borderRadius:'0 0 var(--radius) var(--radius)' }}>
                  {mod.videoUrl && <div style={{ marginBottom:20 }}><div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Lesson Video</div><VideoPlayer url={mod.videoUrl} title={mod.title} /></div>}
                  {mod.notesUrl && <div style={{ marginBottom:16 }}><div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Notes</div><a href={mod.notesUrl} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 16px', background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'var(--radius)', color:'#3B82F6', fontSize:13, fontWeight:700, textDecoration:'none' }}>📄 Open Notes ↗</a></div>}
                  {mA.length>0 && <div style={{ marginBottom:14 }}><div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Assignments</div>{mA.map((a:any) => { const sub=subMap[a.id]; return <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', marginBottom:6 }}><span style={{ fontSize:16 }}>{sub?.grade?'⭐':sub?'✅':'📝'}</span><div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{a.title}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{a.dueAt?`Due ${dayjs(a.dueAt).format('MMM D')}`:'No deadline'}{sub?.grade&&` · ${sub.grade.score}/${a.maxScore} pts`}</div></div><StatusBadge status={sub?.grade?'GRADED':sub?'SUBMITTED':'PENDING'} /></div>; })}</div>}
                  {mC.map((quiz:any) => { const att=attMap[quiz.id]; return <div key={quiz.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'var(--radius-sm)', marginBottom:6 }}><span style={{ fontSize:16 }}>🧠</span><div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{quiz.title}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{quiz.durationMins} min · Pass: {quiz.passScore}/{quiz.totalMarks}{att&&` · Score: ${att.score}/${quiz.totalMarks}`}</div></div>{att?<StatusBadge status={att.passed?'APPROVED':'REJECTED'} />:<a href={`/learner/cbt/${quiz.id}`} style={{ fontSize:12, fontWeight:700, background:'#3B82F6', color:'#fff', padding:'5px 12px', borderRadius:100, textDecoration:'none' }}>Start →</a>}</div>; })}
                  {!isDone?<button className="btn btn-teal btn-sm" style={{ marginTop:12 }} onClick={() => markMutation.mutate(mod.id)} disabled={markMutation.isPending}>{markMutation.isPending?'...':'✓ Mark Complete'}</button>:<div style={{ marginTop:12, fontSize:13, color:'var(--teal)', fontWeight:700 }}>✓ Completed {dayjs((done as any[]).find((c:any)=>c.moduleId===mod.id)?.completedAt).fromNow()}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LearnerCohort() {
  const { user } = useAuthStore();
  const [chatText, setChatText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const ae = useActiveEnrollment();
  const cohortId = ae?.cohortId;
  const { data: learners = [], isLoading } = useQuery({ queryKey: ['learners', cohortId], queryFn: () => learnersApi.list({ cohortId: cohortId! }), enabled: !!cohortId });
  const { data: msgs = [] } = useQuery({ queryKey: ['cohort-chat', cohortId], queryFn: () => cohortChatApi.messages(cohortId!), enabled: !!cohortId, refetchInterval: 6000 });
  const sendM = useMutation({ mutationFn: (t: string) => cohortChatApi.send(cohortId!, t), onSuccess: () => { qc.invalidateQueries({ queryKey: ['cohort-chat', cohortId] }); setChatText(''); setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 100); }, onError: () => toast.error('Failed to send') });
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);
  if (isLoading) return <PageLoader />;
  if (!ae) return <EmptyState icon="👥" title="No active enrollment" />;
  const cohort = ae.cohort, fac = cohort?.facilitator?.user, track = cohort?.track;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, height:'78vh' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>
        <div style={{ background:'linear-gradient(135deg,rgba(0,212,170,0.08),rgba(240,165,0,0.05))', border:'1px solid rgba(0,212,170,0.2)', borderRadius:'var(--radius-lg)', padding:'20px 24px' }}>
          <div style={{ fontSize:11, color:'var(--teal)', fontWeight:700, fontFamily:'var(--font-mono)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>Your Cohort</div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:20, color:'var(--text)', marginBottom:8 }}>{track?.name} — {cohort?.name}</div>
          <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--muted)', flexWrap:'wrap' }}><span>📅 {dayjs(cohort?.startDate).format('MMM D')} – {dayjs(cohort?.endDate).format('MMM D, YYYY')}</span><span>⏱ {track?.duration} weeks</span><span>👥 {(learners as any[]).length} learners</span></div>
        </div>
        {fac && <div className="card"><div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:12 }}>Your Facilitator</div><div style={{ display:'flex', gap:12, alignItems:'center' }}><Avatar name={`${fac.firstName} ${fac.lastName}`} url={fac.avatarUrl} size={44} /><div><div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>{fac.firstName} {fac.lastName}</div><div style={{ fontSize:12, color:'var(--muted)' }}>{fac.email}</div></div></div></div>}
        <div className="card" style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:14 }}>Classmates ({(learners as any[]).length})</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:8 }}>
            {(learners as any[]).map((l:any) => { const enr=l.enrollments?.[0]; return <div key={l.id} style={{ display:'flex', gap:10, padding:'10px 12px', background:'var(--surface2)', borderRadius:'var(--radius-sm)', alignItems:'center' }}><Avatar name={`${l.user.firstName} ${l.user.lastName}`} url={l.user.avatarUrl} size={32} /><div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:12, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{l.user.firstName} {l.user.lastName}</div><div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}><div className="progress-bar" style={{ width:44, height:4 }}><div className="progress-fill" style={{ width:`${enr?.progress??0}%` }} /></div><span style={{ fontSize:10, color:'var(--muted)' }}>{enr?.progress??0}%</span></div></div></div>; })}
          </div>
        </div>
      </div>
      <div className="card" style={{ padding:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}><div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:2 }}>#{cohort?.name} Group Chat</div><div style={{ fontSize:11, color:'var(--muted)' }}>{(learners as any[]).length} members</div></div>
        <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
          {(msgs as any[]).length===0?<div style={{ textAlign:'center', padding:'40px 20px' }}><div style={{ fontSize:32, marginBottom:10 }}>💬</div><div style={{ fontSize:13, color:'var(--muted)' }}>Be the first to say hello!</div></div>:(msgs as any[]).map((m:any) => { const isMe=m.senderId===user?.id, isFac=m.sender?.role==='FACILITATOR'; return <div key={m.id} style={{ display:'flex', gap:8, alignItems:'flex-start', flexDirection:isMe?'row-reverse':'row' }}>{!isMe&&<Avatar name={`${m.sender?.firstName} ${m.sender?.lastName}`} url={m.sender?.avatarUrl} size={26} />}<div style={{ maxWidth:'80%' }}>{!isMe&&<div style={{ fontSize:10, marginBottom:2, color:isFac?'var(--teal)':'var(--muted)', fontWeight:isFac?700:400 }}>{m.sender?.firstName}{isFac?' · Facilitator':''}</div>}<div style={{ padding:'8px 12px', borderRadius:isMe?'14px 14px 4px 14px':'14px 14px 14px 4px', background:isMe?'var(--gold)':isFac?'rgba(0,212,170,0.1)':'var(--surface2)', color:isMe?'#060A12':'var(--text)', fontSize:13 }}>{m.text}</div><div style={{ fontSize:10, color:'var(--muted)', marginTop:2, textAlign:isMe?'right':'left' }}>{dayjs(m.sentAt).format('HH:mm')}</div></div></div>; })}
          <div ref={endRef} />
        </div>
        <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
          <input value={chatText} onChange={e=>setChatText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&chatText.trim()){e.preventDefault();sendM.mutate(chatText);}}} placeholder={`Message #${cohort?.name}…`} style={{ flex:1, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'8px 12px', color:'var(--text)', fontSize:13 }} />
          <button className="btn btn-gold btn-sm" disabled={!chatText.trim()||sendM.isPending} onClick={()=>{if(chatText.trim())sendM.mutate(chatText);}}>Send</button>
        </div>
      </div>
    </div>
  );
}

export function LearnerBadges() {
  const ae = useActiveEnrollment();
  const trackId = ae?.cohort?.track?.id;
  const { data: badges=[], isLoading } = useQuery({ queryKey:['badges'], queryFn: moduleProgressApi.badges });
  const { data: mods=[] } = useQuery({ queryKey:['modules',trackId], queryFn:()=>curriculumApi.modules(trackId!), enabled:!!trackId });
  const { data: attempts=[] } = useQuery({ queryKey:['cbt-attempts'], queryFn: cbtApi.myAttempts });
  if (isLoading) return <PageLoader />;
  const ids = new Set((badges as any[]).map((b:any)=>b.moduleId));
  const passed = (attempts as any[]).filter((a:any)=>a.passed).length;
  const S=[{id:'first',icon:'🌟',label:'First Steps',desc:'Complete your first module',earned:(badges as any[]).length>0},{id:'half',icon:'⚡',label:'Halfway There',desc:'Complete 50% of curriculum',earned:(mods as any[]).length>0&&ids.size>=(mods as any[]).length/2},{id:'quiz',icon:'🧠',label:'Quiz Master',desc:'Pass 3+ CBT quizzes',earned:passed>=3},{id:'all',icon:'🏆',label:'Curriculum Complete',desc:'Complete all modules',earned:(mods as any[]).length>0&&ids.size===(mods as any[]).length}];
  return (
    <div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'var(--text)', marginBottom:4 }}>Badges & Achievements</div>
      <div style={{ color:'var(--muted)', fontSize:13, marginBottom:24 }}>{(badges as any[]).length} module badges · {S.filter(b=>b.earned).length} special badges</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(155px, 1fr))', gap:12, marginBottom:28 }}>
        {S.map(b=><div key={b.id} style={{ textAlign:'center', padding:'20px 12px', background:b.earned?'linear-gradient(135deg,rgba(240,165,0,0.1),rgba(0,212,170,0.06))':'var(--surface2)', border:`1px solid ${b.earned?'rgba(240,165,0,0.3)':'var(--border)'}`, borderRadius:'var(--radius)', opacity:b.earned?1:0.45 }}><div style={{ fontSize:36, marginBottom:8 }}>{b.icon}</div><div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:4 }}>{b.label}</div><div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.4 }}>{b.desc}</div>{b.earned&&<div style={{ fontSize:10, color:'var(--gold)', fontWeight:700, marginTop:8 }}>EARNED ✓</div>}</div>)}
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:12 }}>Module Completions ({ids.size}/{(mods as any[]).length})</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {(mods as any[]).map((mod:any)=>{const b=(badges as any[]).find((x:any)=>x.moduleId===mod.id);return<div key={mod.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', background:b?'rgba(0,212,170,0.04)':'var(--surface)', border:`1px solid ${b?'rgba(0,212,170,0.2)':'var(--border)'}`, borderRadius:'var(--radius)', opacity:mod.isPublished?1:0.4 }}><div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, background:b?'var(--teal)':'var(--surface2)' }}>{b?'🏅':'○'}</div><div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Module {mod.order}: {mod.title}</div>{b&&<div style={{ fontSize:11, color:'var(--teal)' }}>Completed {dayjs(b.completedAt).format('MMM D, YYYY')}</div>}</div>{b?<span style={{ fontSize:11, fontWeight:700, color:'var(--teal)', background:'rgba(0,212,170,0.1)', padding:'3px 10px', borderRadius:20 }}>✓ Done</span>:<span style={{ fontSize:11, color:'var(--muted)' }}>{mod.isPublished?'In progress':'Locked'}</span>}</div>;})}
      </div>
    </div>
  );
}

export function LearnerPortfolio() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm<any>();
  const { data: profile, isLoading } = useQuery({ queryKey:['alumni-me'], queryFn: alumniApi.me, retry:false });
  useEffect(()=>{if(profile)reset({jobTitle:(profile as any).jobTitle??'',company:(profile as any).company??'',bio:(profile as any).bio??'',portfolioUrl:(profile as any).portfolioUrl??'',githubUrl:(profile as any).githubUrl??'',linkedInUrl:(profile as any).linkedInUrl??'',isHireable:(profile as any).isHireable??true,isPublic:(profile as any).isPublic??true});},[profile]);
  const saveM = useMutation({ mutationFn:(d:any)=>alumniApi.save(d), onSuccess:()=>{toast.success('Portfolio saved!');qc.invalidateQueries({queryKey:['alumni-me']});}, onError:()=>toast.error('Save failed') });
  if (isLoading) return <PageLoader />;
  const p = profile as any;
  const shareUrl = `${typeof window!=='undefined'?window.location.origin:''}/alumni/${user?.id}`;
  return (
    <div style={{ maxWidth:620 }}>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'var(--text)', marginBottom:4 }}>My Portfolio</div>
      <div style={{ color:'var(--muted)', fontSize:13, marginBottom:20 }}>Public profile for hiring partners and the alumni network.</div>
      {p&&<div style={{ background:'linear-gradient(135deg,rgba(0,212,170,0.07),rgba(240,165,0,0.04))', border:'1px solid rgba(0,212,170,0.2)', borderRadius:'var(--radius-lg)', padding:22, marginBottom:20 }}><div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:12 }}><Avatar name={`${user?.firstName} ${user?.lastName}`} url={user?.avatarUrl} size={52} /><div style={{ flex:1 }}><div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'var(--text)', marginBottom:4 }}>{user?.firstName} {user?.lastName}</div>{p.jobTitle&&<div style={{ fontSize:13, color:'var(--muted)', marginBottom:6 }}>{p.jobTitle}{p.company&&` @ ${p.company}`}</div>}<div style={{ display:'flex', gap:8, flexWrap:'wrap' }}><span style={{ fontSize:11, background:'rgba(0,212,170,0.12)', color:'var(--teal)', padding:'2px 10px', borderRadius:20, fontWeight:700 }}>{p.trackName||'AdharaEdu Graduate'}</span>{p.isHireable&&<span style={{ fontSize:11, background:'rgba(240,165,0,0.12)', color:'var(--gold)', padding:'2px 10px', borderRadius:20, fontWeight:700 }}>Open to Work</span>}</div></div></div>{p.bio&&<div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:12 }}>{p.bio}</div>}<div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>{p.portfolioUrl&&<a href={p.portfolioUrl} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm">Portfolio ↗</a>}{p.githubUrl&&<a href={p.githubUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">GitHub ↗</a>}{p.linkedInUrl&&<a href={p.linkedInUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">LinkedIn ↗</a>}<button className="btn btn-ghost btn-sm" onClick={()=>{navigator.clipboard.writeText(shareUrl);toast.success('Link copied!');}}>📋 Copy Link</button></div></div>}
      <div className="card">
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:16 }}>Edit Portfolio</div>
        <form onSubmit={handleSubmit(d=>saveM.mutate(d))}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}><Field label="Job Title"><input {...register('jobTitle')} placeholder="Frontend Developer" /></Field><Field label="Company"><input {...register('company')} placeholder="Currently at..." /></Field></div>
            <Field label="Short Bio"><textarea {...register('bio')} rows={3} placeholder="A few sentences about yourself..." style={{ resize:'vertical' }} /></Field>
            <Field label="Portfolio URL"><input {...register('portfolioUrl')} type="url" placeholder="https://yourname.dev" /></Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}><Field label="GitHub"><input {...register('githubUrl')} type="url" placeholder="https://github.com/you" /></Field><Field label="LinkedIn"><input {...register('linkedInUrl')} type="url" placeholder="https://linkedin.com/in/you" /></Field></div>
            <div style={{ display:'flex', gap:20 }}><label style={{ display:'flex', gap:8, alignItems:'center', fontSize:13, color:'var(--text2)', cursor:'pointer' }}><input type="checkbox" {...register('isHireable')} />Open to work</label><label style={{ display:'flex', gap:8, alignItems:'center', fontSize:13, color:'var(--text2)', cursor:'pointer' }}><input type="checkbox" {...register('isPublic')} />Show in alumni directory</label></div>
            <button type="submit" className="btn btn-gold btn-sm" disabled={saveM.isPending} style={{ alignSelf:'flex-start' }}>{saveM.isPending?'Saving...':'Save Portfolio'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
