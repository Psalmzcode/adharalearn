'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BootcampSidebar } from '@/components/layout/Sidebar';
import { BootcampTopbar } from '@/components/layout/Topbar';
import { useAuthStore } from '@/store/auth.store';
import {
  LearnerHome, LearnerTasks, LearnerSessions, LearnerResults,
  LearnerCertificates, LearnerMessages, LearnerNotifications, LearnerSettings, LearnerSupportTickets, LearnerPracticals,
} from '@/components/learner/LearnerSections';
import { LearnerCurriculum, LearnerCohort, LearnerBadges, LearnerPortfolio } from '@/components/learner/LearnerExtra';
import { LearnerCourses } from '@/components/learner/LearnerCourses';
import { LearnerPayments } from '@/components/shared/AdminModulesAndPayments';

const LINKS = [
  { label: 'Dashboard',    section: 'l-home',          icon: '🏠' },
  { label: 'My Courses',   section: 'l-courses',       icon: '🎬' },
  { label: 'Live Sessions',section: 'l-sessions',      icon: '🎥' },
  { label: 'Badges',       section: 'l-badges',        icon: '🏅' },
  { label: 'Messages',     section: 'l-messages',      icon: '💬' },
  { label: 'Support',      section: 'l-support',       icon: '🆘' },
  { label: 'Practicals',   section: 'l-practicals',    icon: '🧪' },
  { label: 'Certificates', section: 'l-certs',         icon: '🎖️' },
  { label: 'Portfolio',    section: 'l-portfolio',     icon: '🌐' },
  { label: 'Notifications',section: 'l-notifications', icon: '🔔' },
  { label: 'Settings',     section: 'l-settings',      icon: '⚙️' },
] as any[];

const TITLES: Record<string, string> = {
  'l-home':'Dashboard','l-courses':'My Courses',
  'l-sessions':'Live Sessions','l-badges':'Badges',
  'l-messages':'Messages','l-support':'Support Tickets','l-practicals':'Practicals','l-certs':'Certificates',
  'l-portfolio':'My Portfolio','l-notifications':'Notifications','l-settings':'Settings',
};

export default function LearnerPage() {
  const [section, setSection] = useState('l-home');
  const { user, isAuthenticated, loadMe } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) loadMe().catch(() => router.push('/login'));
  }, [isAuthenticated]);

  if (!user) return null;
  if (user.role !== 'LEARNER') { router.push('/login'); return null; }

  const render = () => {
    switch (section) {
      case 'l-home':          return <LearnerHome />;
      case 'l-courses':       return <LearnerCourses onOpenPracticals={() => setSection('l-practicals')} />;
      case 'l-curriculum':    return <LearnerCurriculum />;
      case 'l-tasks':         return <LearnerTasks />;
      case 'l-sessions':      return <LearnerSessions />;
      case 'l-cohort':        return <LearnerCohort />;
      case 'l-badges':        return <LearnerBadges />;
      case 'l-messages':      return <LearnerMessages />;
      case 'l-support':       return <LearnerSupportTickets />;
      case 'l-practicals':    return <LearnerPracticals />;
      case 'l-results':       return <LearnerResults />;
      case 'l-certs':         return <LearnerCertificates />;
      case 'l-portfolio':     return <LearnerPortfolio />;
      case 'l-payments':       return <LearnerPayments />;
      case 'l-notifications': return <LearnerNotifications />;
      case 'l-settings':      return <LearnerSettings />;
      default:                return <LearnerHome />;
    }
  };

  return (
    <div className="dashboard-page">
      <BootcampSidebar links={LINKS} activeSection={section} onSectionChange={setSection}
        userName={`${user.firstName} ${user.lastName}`} userRole="Learner"
        userInitials={`${user.firstName[0]}${user.lastName[0]}`} logoTagline="Learner Portal" />
      <div className="dash-main">
        <BootcampTopbar title={TITLES[section] ?? 'Dashboard'} />
        <div className="dash-content">{render()}</div>
      </div>
    </div>
  );
}
