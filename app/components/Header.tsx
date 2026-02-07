'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AuthModal from './AuthModal';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    if (token) {
      fetchUserData(token);
    }
  }, []);

  useEffect(() => {
    // Close mobile menu when route changes
    setMobileMenuOpen(false);
  }, [pathname]);

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user data');
    }
  };

  const handleAuthSuccess = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    setUser(userData);
    setAuthModalOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    router.push('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <header>
        <Link href="/" className="logo" onClick={() => setMobileMenuOpen(false)}>
          <span style={{ fontSize: '1.5rem', fontWeight: '700' }}>SwiftHire</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="nav-links desktop-nav">
          <Link href="/" className={isActive('/') ? 'active' : ''}>
            Home
          </Link>
          <Link href="/jobs" className={isActive('/jobs') ? 'active' : ''}>
            Cerca Lavoro
          </Link>
          <Link href="/companies" className={isActive('/companies') ? 'active' : ''}>
            Aziende
          </Link>
          <Link href="/post-job" className="btn-post">
            <i className="fas fa-plus"></i> <span className="nav-text">Pubblica</span>
          </Link>
          <Link href="/video-cv" className="btn-video">
            <i className="fas fa-video"></i> <span className="nav-text">Video CV</span>
          </Link>
          <Link href="/messages" className="btn-video">
            <i className="fas fa-comments"></i> <span className="nav-text">Messaggi</span>
          </Link>
          {isAuthenticated ? (
            <>
              <Link href="/profile" className="user-avatar" title={user?.name || 'Profilo'}>
                {user?.name?.charAt(0).toUpperCase() || <i className="fas fa-user"></i>}
              </Link>
              <button
                className="btn-video"
                onClick={handleLogout}
                style={{ background: 'transparent', color: '#000', border: 'none', cursor: 'pointer' }}
              >
                <i className="fas fa-sign-out-alt"></i> <span className="nav-text">Logout</span>
              </button>
            </>
          ) : (
            <button
              className="btn-video"
              onClick={() => setAuthModalOpen(true)}
              style={{ background: 'transparent', color: '#000', border: 'none', cursor: 'pointer' }}
            >
              <i className="fas fa-sign-in-alt"></i> <span className="nav-text">Accedi</span>
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
      </header>

      {/* Mobile Navigation Overlay */}
      <div className={`mobile-nav-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <nav className={`mobile-nav ${mobileMenuOpen ? 'active' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="mobile-nav-header">
            <h3>Menu</h3>
            <button className="mobile-nav-close" onClick={() => setMobileMenuOpen(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="mobile-nav-links">
            <Link href="/" className={isActive('/') ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              <i className="fas fa-home"></i> Home
            </Link>
            <Link href="/jobs" className={isActive('/jobs') ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              <i className="fas fa-briefcase"></i> Cerca Lavoro
            </Link>
            <Link href="/companies" className={isActive('/companies') ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              <i className="fas fa-building"></i> Aziende
            </Link>
            <Link href="/post-job" onClick={() => setMobileMenuOpen(false)}>
              <i className="fas fa-plus"></i> Pubblica Annuncio
            </Link>
            <Link href="/video-cv" onClick={() => setMobileMenuOpen(false)}>
              <i className="fas fa-video"></i> Video CV
            </Link>
            <Link href="/messages" onClick={() => setMobileMenuOpen(false)}>
              <i className="fas fa-comments"></i> Messaggi
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <i className="fas fa-user"></i> Profilo
                </Link>
                <button onClick={handleLogout} className="mobile-nav-button">
                  <i className="fas fa-sign-out-alt"></i> Logout
                </button>
              </>
            ) : (
              <button onClick={() => { setAuthModalOpen(true); setMobileMenuOpen(false); }} className="mobile-nav-button">
                <i className="fas fa-sign-in-alt"></i> Accedi
              </button>
            )}
          </div>
        </nav>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
