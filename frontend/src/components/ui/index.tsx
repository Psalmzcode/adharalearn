'use client';
import { useEffect, useRef } from 'react';

// ── MODAL ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const widths = { sm: 420, md: 560, lg: 720 };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,10,18,0.75)', backdropFilter: 'blur(6px)' }} />

      {/* Panel */}
      <div
        ref={ref}
        style={{
          position: 'relative', zIndex: 1, width: '100%', maxWidth: widths[size],
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{title}</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, lineHeight: 1, padding: 4 }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }: ConfirmProps) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1010, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,10,18,0.8)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>{danger ? '⚠️' : '❓'}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={loading} className="btn btn-ghost btn-sm">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn btn-sm"
            style={{
              background: danger ? 'rgba(255,77,77,0.15)' : 'var(--gold)',
              color: danger ? 'var(--red)' : 'var(--bg)',
              border: danger ? '1px solid rgba(255,77,77,0.3)' : 'none',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SPINNER ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 24, color = 'var(--gold)' }: { size?: number; color?: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: size, height: size,
        border: `2px solid rgba(255,255,255,0.1)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── PAGE LOADER ───────────────────────────────────────────────────────────────
export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
      <Spinner size={36} />
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, message, action }: {
  icon?: string; title: string; message?: string; action?: React.ReactNode;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
      {message && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: action ? 20 : 0 }}>{message}</div>}
      {action}
    </div>
  );
}

// ── ERROR STATE ───────────────────────────────────────────────────────────────
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>Something went wrong</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{message ?? 'Failed to load data. Please try again.'}</div>
      {onRetry && <button className="btn btn-gold btn-sm" onClick={onRetry}>Try Again</button>}
    </div>
  );
}

// ── FORM FIELD ────────────────────────────────────────────────────────────────
export function Field({ label, error, children, required }: {
  label: string; error?: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div className="field">
      <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {label}
        {required && <span style={{ color: 'var(--red)', fontSize: 12 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    ACTIVE:    { label: 'Active',    color: 'var(--teal)',   bg: 'rgba(0,212,170,0.12)' },
    PENDING:   { label: 'Pending',   color: 'var(--gold)',   bg: 'rgba(240,165,0,0.12)' },
    COMPLETED: { label: 'Completed', color: '#A78BFA',       bg: 'rgba(167,139,250,0.12)' },
    WITHDRAWN: { label: 'Withdrawn', color: 'var(--red)',    bg: 'rgba(255,77,77,0.12)' },
    UPCOMING:  { label: 'Upcoming',  color: 'var(--blue)',   bg: 'rgba(59,130,246,0.12)' },
    SUBMITTED: { label: 'Submitted', color: 'var(--teal)',   bg: 'rgba(0,212,170,0.12)' },
    GRADED:    { label: 'Graded',    color: '#A78BFA',       bg: 'rgba(167,139,250,0.12)' },
    APPROVED:  { label: 'Approved',  color: 'var(--teal)',   bg: 'rgba(0,212,170,0.12)' },
    REJECTED:  { label: 'Rejected',  color: 'var(--red)',    bg: 'rgba(255,77,77,0.12)' },
    DISBURSED: { label: 'Disbursed', color: '#4ADE80',       bg: 'rgba(74,222,128,0.12)' },
    SUCCESS:   { label: 'Paid',      color: 'var(--teal)',   bg: 'rgba(0,212,170,0.12)' },
    FAILED:    { label: 'Failed',    color: 'var(--red)',    bg: 'rgba(255,77,77,0.12)' },
  };
  const s = map[status] ?? { label: status, color: 'var(--muted)', bg: 'var(--surface2)' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
      color: s.color, background: s.bg,
      padding: '3px 10px', borderRadius: 20, letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

// ── AVATAR ────────────────────────────────────────────────────────────────────
export function Avatar({ name, url, size = 36 }: { name?: string; url?: string; size?: number }) {
  const initials = name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.35, background: `hsl(${initials.charCodeAt(0) * 15 % 360},50%,40%)` }}
    >
      {initials}
    </div>
  );
}
