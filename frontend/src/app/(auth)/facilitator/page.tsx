'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BootcampSidebar } from '@/components/layout/Sidebar';
import { BootcampTopbar } from '@/components/layout/Topbar';
import { useAuthStore } from '@/store/auth.store';
import {
  FacilitatorHome, FacilitatorLearners, FacilitatorSubmissions,
  FacilitatorSessions, FacilitatorReport, FacilitatorAnnouncements, FacilitatorMessages,
} from '@/components/facilitator/FacilitatorSections';
import { FacilitatorGrades } from '@/components/facilitator/FacilitatorGrades';
import { FacilitatorAttendance } from '@/components/facilitator/FacilitatorAttendance';

const LINKS = [
  { label: 'Dashboard',    section: 'f-home',          icon: '📊' },
  { label: 'My Learners',  section: 'f-learners',      icon: '🎓' },
  { label: 'Submissions',  section: 'f-submissions',   icon: '📋' },
  { label: 'Sessions',     section: 'f-sessions',      icon: '🎥' },
  { label: 'Attendance',   section: 'f-attendance',    icon: '✅' },
  { label: 'Grade Entry',  section: 'f-grades',        icon: '📝' },
  { label: 'Messages',     section: 'f-messages',      icon: '💬' },
  { label: 'Weekly Report',section: 'f-report',        icon: '📈' },
  { label: 'Announcements',section: 'f-announcements', icon: '📢' },
] as any[];

const TITLES: Record<string, string> = {
  'f-home':'Dashboard','f-learners':'My Learners','f-submissions':'Submissions',
  'f-sessions':'Sessions','f-attendance':'Take Attendance','f-grades':'Grade Entry',
  'f-messages':'Messages','f-report':'Weekly Report','f-announcements':'Announcements',
};

export default function FacilitatorPage() {
  const [section, setSection] = useState('f-home');
  const { user, isAuthenticated, loadMe } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) loadMe().catch(() => router.push('/login'));
  }, [isAuthenticated]);

  if (!user) return null;
  if (user.role !== 'FACILITATOR') { router.push('/login'); return null; }

  const render = () => {
    switch (section) {
      case 'f-home':          return <FacilitatorHome />;
      case 'f-learners':      return <FacilitatorLearners />;
      case 'f-submissions':   return <FacilitatorSubmissions />;
      case 'f-sessions':      return <FacilitatorSessions />;
      case 'f-attendance':    return <FacilitatorAttendance />;
      case 'f-grades':        return <FacilitatorGrades />;
      case 'f-messages':      return <FacilitatorMessages />;
      case 'f-report':        return <FacilitatorReport />;
      case 'f-announcements': return <FacilitatorAnnouncements />;
      default:                return <FacilitatorHome />;
    }
  };

  return (
    <div className="dashboard-page">
      <BootcampSidebar links={LINKS} activeSection={section} onSectionChange={setSection}
        userName={`${user.firstName} ${user.lastName}`} userRole="Facilitator"
        userInitials={`${user.firstName[0]}${user.lastName[0]}`} logoTagline="Facilitator Portal" />
      <div className="dash-main">
        <BootcampTopbar title={TITLES[section] ?? 'Dashboard'} />
        <div className="dash-content">{render()}</div>
      </div>
    </div>
  );
}
