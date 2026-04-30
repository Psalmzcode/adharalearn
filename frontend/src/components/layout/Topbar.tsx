'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { notificationsApi } from '@/lib/api';

interface TopbarProps { title: string; onToggleSidebar?: () => void; }

export function BootcampTopbar({ title, onToggleSidebar }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { data: notifs = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.mine,
    enabled: !!user,
    staleTime: 60_000,
  });

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onToggleSidebar}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)' }}
        >☰</button>
        <span className="topbar-title">{title}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Notification bell */}
        <div className="topbar-icon" style={{ position: 'relative' }}>
          🔔
          {(notifs as any[]).length > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4, width: 16, height: 16,
              background: 'var(--red)', borderRadius: '50%', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              fontFamily: 'var(--font-mono)',
            }}>
              {Math.min((notifs as any[]).length, 9)}
            </span>
          )}
        </div>

        {/* User pill */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 100 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: 'var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#060A12',
            }}>
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.firstName}
            </span>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 12, padding: '5px 12px' }}
          title="Sign out"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
