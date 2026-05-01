'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function BootcampLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 50" height="44" width="220">
      <rect x="1" y="4" width="38" height="40" rx="12" ry="14" fill="#1E7FD4" />
      <polygon points="20,10 23.5,18.5 33,18.5 25.5,24 28.5,33 20,27.5 11.5,33 14.5,24 7,18.5 16.5,18.5" fill="#F5C518" />
      <text x="46" y="33" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="26" fill="#F2F4F8">
        Adhara
      </text>
      <text x="153" y="14" fontFamily="Arial, sans-serif" fontWeight="700" fontStyle="italic" fontSize="12" fill="#1E7FD4">
        Edu
      </text>
      <text x="46" y="46" fontFamily="Georgia, serif" fontStyle="italic" fontSize="9.5" fill="#A0B9DC" letterSpacing="0.3">
        Bootcamp
      </text>
    </svg>
  );
}

export function PublicNavbar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Courses', href: '/courses' },
    { label: 'How It Works', href: '/#how' },
    { label: 'Pricing', href: '/courses' },
  ] as const;

  return (
    <>
      <nav className="home-nav">
        <button
          onClick={() => router.push('/')}
          className="home-nav-logo"
          aria-label="Go to homepage"
        >
          <BootcampLogo />
        </button>

        <div className="home-nav-links">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="home-nav-link"
              onClick={(e) => {
                e.preventDefault();
                router.push(l.href);
              }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="home-nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/login')}>
            Sign In
          </button>
          <button className="btn btn-gold btn-sm" onClick={() => router.push('/learn')}>
            Adhara Learn
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => router.push('/signup')}>
            Sign up
          </button>
        </div>

        <button
          className="home-nav-hamburger"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((s) => !s)}
        >
          <span className={`ham ${mobileMenuOpen ? 'open' : ''}`} />
        </button>
      </nav>

      <div
        className={`home-nav-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className={`home-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="home-nav-drawer-inner">
          {navLinks.map((l) => (
            <a
              key={l.label}
              className="home-nav-drawer-link"
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                router.push(l.href);
              }}
            >
              {l.label}
            </a>
          ))}
          <a
            className="home-nav-drawer-link"
            href="/learn"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              router.push('/learn');
            }}
          >
            Adhara Learn
          </a>
          <div className="home-nav-drawer-cta">
            <button
              className="btn btn-gold btn-full"
              onClick={() => {
                setMobileMenuOpen(false);
                router.push('/login');
              }}
            >
              Sign in →
            </button>
            <button
              className="btn btn-ghost btn-full"
              onClick={() => {
                setMobileMenuOpen(false);
                router.push('/signup');
              }}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

