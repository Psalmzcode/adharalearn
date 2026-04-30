'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi, learnersApi, setAccessToken, setRefreshToken } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const STEPS = ['Account', 'About You'];

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  learnerType: 'STUDENT' | 'SCHOOL_LEAVER' | 'NYSC' | 'JOB_SEEKER' | 'CAREER_SWITCHER' | 'OTHER';
  location?: string;
  currentStage?: string;
  goal?: string;
  source?: string;
  bio?: string;
};

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState(0);
  const { register, handleSubmit, trigger, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      learnerType: 'STUDENT',
    },
  });

  const signupM = useMutation({
    mutationFn: async (data: FormValues) => {
      const auth = await authApi.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: 'LEARNER',
      });
      setAccessToken(auth.accessToken);
      if (auth.refreshToken) setRefreshToken(auth.refreshToken);
      setUser(auth.user);

      await learnersApi.updateMe({
        learnerType: data.learnerType,
        location: data.location || undefined,
        currentStage: data.currentStage || undefined,
        source: data.source || undefined,
        bio: data.bio || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Welcome to Adhara Learn');
      router.push('/verify-email');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Signup failed';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const goNext = async () => {
    const fields = ['firstName', 'lastName', 'email', 'password', 'phone', 'learnerType'] as const;
    const valid = await trigger(fields as any);
    if (valid) setStep(1);
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: 64, fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        <button onClick={() => router.push('/login')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-mono)', cursor: 'pointer', marginBottom: 20 }}>
          ← Back to Login
        </button>

        <h1 style={{ fontSize: 32, marginBottom: 6, fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--text)' }}>
          Create Adhara Learn Account
        </h1>
        <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 14 }}>
          Learn at your own pace. Start today.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: step === i ? 'rgba(240,165,0,0.16)' : 'var(--surface2)', color: step === i ? 'var(--gold)' : 'var(--muted)', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
              {i + 1}. {s}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit((d) => signupM.mutate(d))} className="card" style={{ display: 'grid', gap: 14 }}>
          {step === 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="field">
                  <label>First Name *</label>
                  <input {...register('firstName', { required: 'Required' })} />
                  {errors.firstName && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.firstName.message}</span>}
                </div>
                <div className="field">
                  <label>Last Name *</label>
                  <input {...register('lastName', { required: 'Required' })} />
                  {errors.lastName && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.lastName.message}</span>}
                </div>
              </div>
              <div className="field">
                <label>Email *</label>
                <input {...register('email', { required: 'Required' })} type="email" />
                {errors.email && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.email.message}</span>}
              </div>
              <div className="field">
                <label>Password *</label>
                <input {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} type="password" />
                {errors.password && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.password.message}</span>}
              </div>
              <div className="field">
                <label>Phone (WhatsApp) *</label>
                <input {...register('phone', { required: 'Required' })} />
                {errors.phone && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.phone.message}</span>}
              </div>
              <div className="field">
                <label>Learner Type *</label>
                <select {...register('learnerType', { required: 'Required' })}>
                  <option value="STUDENT">Student</option>
                  <option value="SCHOOL_LEAVER">School Leaver</option>
                  <option value="NYSC">NYSC</option>
                  <option value="JOB_SEEKER">Job Seeker</option>
                  <option value="CAREER_SWITCHER">Career Switcher</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <button type="button" className="btn btn-gold" style={{ justifyContent: 'center' }} onClick={goNext}>
                Next →
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <div className="field">
                <label>Location (optional)</label>
                <input {...register('location')} placeholder="Lagos, Nigeria" />
              </div>
              <div className="field">
                <label>Current Stage (optional)</label>
                <input {...register('currentStage')} placeholder="Graduate, NYSC, employed..." />
              </div>
              <div className="field">
                <label>Goal (optional)</label>
                <input {...register('goal')} placeholder="Get a job, build skills, switch career..." />
              </div>
              <div className="field">
                <label>How did you hear about Adhara? (optional)</label>
                <select {...register('source')}>
                  <option value="">Select one...</option>
                  <option>Instagram / Social media</option>
                  <option>Friend / family referral</option>
                  <option>School recommendation</option>
                  <option>Google search</option>
                  <option>WhatsApp group</option>
                </select>
              </div>
              <div className="field">
                <label>About me / bio (optional)</label>
                <textarea {...register('bio')} rows={4} placeholder="Tell us about yourself in 2-3 lines." />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
                <button type="submit" className="btn btn-gold" style={{ flex: 1, justifyContent: 'center' }} disabled={signupM.isPending}>
                  {signupM.isPending ? 'Creating account...' : 'Create Account →'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

