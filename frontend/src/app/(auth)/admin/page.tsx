'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BootcampSidebar } from '@/components/layout/Sidebar';
import { BootcampTopbar } from '@/components/layout/Topbar';
import { useAuthStore } from '@/store/auth.store';
import {
  AdminHome, AdminCohorts, AdminEnrollments, AdminRevenue,
  AdminFacilitators, AdminScholarships, AdminAnnouncements, AdminSettings,
  AdminJobs, AdminAlumni, AdminQuizBank, AdminPracticals, AdminAdharaLearn,
} from '@/components/admin/AdminSections';
import { AdminModules } from '@/components/shared/AdminModulesAndPayments';

const LINKS = [
  { label: 'Bootcamp (Live Cohort)', isSection: true, icon: '—' },
  { label: 'Overview',     section: 'a-home',          icon: '📊' },
  { label: 'Cohorts',      section: 'a-cohorts',       icon: '🎓' },
  { label: 'Enrollments',  section: 'a-enrollments',   icon: '👥' },
  { label: 'Revenue',      section: 'a-revenue',       icon: '💰' },
  { label: 'Facilitators', section: 'a-facilitators',  icon: '👩‍🏫' },
  { label: 'Scholarships', section: 'a-scholarships',  icon: '🏅' },
  { label: 'Alumni',       section: 'a-alumni',        icon: '🎓' },
  { label: 'Job Board',    section: 'a-jobs',          icon: '💼' },
  { label: 'Announcements',section: 'a-announcements', icon: '📢' },
  { label: 'Adhara Learn', isSection: true, icon: '—' },
  { label: 'Courses',      section: 'a-learn-courses', icon: '📦' },
  { label: 'Modules',      section: 'a-learn-modules', icon: '🧩' },
  { label: 'Lessons',      section: 'a-learn-lessons', icon: '🎬' },
  { label: 'Bundles',      section: 'a-learn-bundles', icon: '🧺' },
  { label: 'Purchases',    section: 'a-learn-purchases', icon: '💳' },
  { label: 'Curriculum',   section: 'a-modules',       icon: '📚' },
  { label: 'Quiz Bank',    section: 'a-quiz-bank',     icon: '❓' },
  { label: 'Practicals',   section: 'a-practicals',    icon: '🧪' },
  { label: 'Platform',     isSection: true, icon: '—' },
  { label: 'Settings',     section: 'a-settings',      icon: '⚙️' },
] as any[];

const TITLES: Record<string, string> = {
  'a-home':'Platform Overview','a-cohorts':'Cohorts','a-enrollments':'Enrollments',
  'a-revenue':'Revenue','a-facilitators':'Facilitators','a-scholarships':'Scholarships',
  'a-learn-courses':'Adhara Learn · Courses',
  'a-learn-modules':'Adhara Learn · Modules',
  'a-learn-lessons':'Adhara Learn · Lessons',
  'a-learn-bundles':'Adhara Learn · Bundles',
  'a-learn-purchases':'Adhara Learn · Purchases',
  'a-modules':'Curriculum Manager','a-quiz-bank':'Quiz Bank','a-practicals':'Practicals / Capstones','a-alumni':'Alumni Network','a-jobs':'Job Board',
  'a-announcements':'Announcements','a-settings':'Settings',
};

export default function AdminPage() {
  const [section, setSection] = useState('a-home');
  const { user, isAuthenticated, loadMe } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) loadMe().catch(() => router.push('/login'));
  }, [isAuthenticated]);

  if (!user) return null;
  if (user.role !== 'ADMIN') { router.push('/login'); return null; }

  const render = () => {
    switch (section) {
      case 'a-home':          return <AdminHome />;
      case 'a-cohorts':       return <AdminCohorts />;
      case 'a-enrollments':   return <AdminEnrollments />;
      case 'a-revenue':       return <AdminRevenue />;
      case 'a-facilitators':  return <AdminFacilitators />;
      case 'a-scholarships':  return <AdminScholarships />;
      case 'a-learn-courses': return <AdminAdharaLearn view="courses" />;
      case 'a-learn-modules': return <AdminAdharaLearn view="modules" />;
      case 'a-learn-lessons': return <AdminAdharaLearn view="lessons" />;
      case 'a-learn-bundles': return <AdminAdharaLearn view="bundles" />;
      case 'a-learn-purchases': return <AdminAdharaLearn view="purchases" />;
      case 'a-modules':       return <AdminModules />;
      case 'a-quiz-bank':     return <AdminQuizBank />;
      case 'a-practicals':    return <AdminPracticals />;
      case 'a-alumni':        return <AdminAlumni />;
      case 'a-jobs':          return <AdminJobs />;
      case 'a-announcements': return <AdminAnnouncements />;
      case 'a-settings':      return <AdminSettings />;
      default:                return <AdminHome />;
    }
  };

  return (
    <div className="dashboard-page">
      <BootcampSidebar links={LINKS} activeSection={section} onSectionChange={setSection}
        userName={`${user.firstName} ${user.lastName}`} userRole="Admin"
        userInitials={`${user.firstName[0]}${user.lastName[0]}`} logoTagline="Admin Portal" />
      <div className="dash-main">
        <BootcampTopbar title={TITLES[section] ?? 'Overview'} />
        <div className="dash-content">{render()}</div>
      </div>
    </div>
  );
}
