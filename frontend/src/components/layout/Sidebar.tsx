'use client';

interface SidebarLink {
  label: string;
  section?: string;
  icon: string;
  badge?: number;
  isSection?: boolean;
}

interface BootcampSidebarProps {
  links: SidebarLink[];
  activeSection: string;
  onSectionChange: (s: string) => void;
  userName: string;
  userRole: string;
  userInitials: string;
  logoTagline?: string;
}

function BootcampLogo({ tagline = 'Bootcamp' }: { tagline?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 50" height="40" width="200" aria-label="AdharaEdu">
      <rect x="1" y="4" width="38" height="40" rx="12" ry="14" fill="#1E7FD4"/>
      <polygon points="20,10 23.5,18.5 33,18.5 25.5,24 28.5,33 20,27.5 11.5,33 14.5,24 7,18.5 16.5,18.5" fill="#F5C518"/>
      <text x="46" y="33" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="26" fill="#F2F4F8">Adhara</text>
      <text x="153" y="14" fontFamily="Arial, sans-serif" fontWeight="700" fontStyle="italic" fontSize="12" fill="#1E7FD4">Edu</text>
      <text x="46" y="46" fontFamily="Georgia, serif" fontStyle="italic" fontSize="9.5" fill="#A0B9DC" letterSpacing="0.3">{tagline}</text>
    </svg>
  );
}

export function BootcampSidebar({ links, activeSection, onSectionChange, userName, userRole, userInitials, logoTagline }: BootcampSidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo"><BootcampLogo tagline={logoTagline} /></div>
      <nav className="sidebar-nav">
        {links.map((link, i) => {
          if (link.isSection) return <div key={i} className="sidebar-section">{link.label}</div>;
          const active = activeSection === link.section;
          return (
            <button key={i} className={`slink${active ? ' active' : ''}`} onClick={() => link.section && onSectionChange(link.section)}>
              <span className="slink-icon">{link.icon}</span>
              <span style={{ flex: 1 }}>{link.label}</span>
              {link.badge != null && link.badge > 0 && <span className="slink-badge">{link.badge}</span>}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-user">
        <div className="avatar">{userInitials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-user-name">{userName}</div>
          <div className="sidebar-user-role">{userRole}</div>
        </div>
      </div>
    </div>
  );
}
