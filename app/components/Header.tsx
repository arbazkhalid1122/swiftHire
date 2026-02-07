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
    // Refresh user data when route changes (in case role changed)
    const token = localStorage.getItem('token');
    if (token && isAuthenticated) {
      fetchUserData(token);
    }
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
        console.log('User data fetched:', data.user); // Debug log
      } else {
        // If unauthorized, clear auth state
        if (response.status === 401) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
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
          {isAuthenticated ? (
            <>
              <Link href="/profile" className={isActive('/profile') ? 'active' : ''}>
                Profilo
              </Link>
              {user?.role === 'admin' && (
                <Link 
                  href="/admin" 
                  className={isActive('/admin') ? 'active' : ''}
                  style={{ 
                    background: 'var(--primary)', 
                    color: 'white', 
                    padding: '0.5rem 1rem', 
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <i className="fas fa-cog"></i>
                  Admin Dashboard
                </Link>
              )}
              {user?.role === 'admin' && (
                <span style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <i className="fas fa-crown"></i>
                  Admin
                </span>
              )}
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
            {isAuthenticated ? (
              <>
                <Link href="/profile" className={isActive('/profile') ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
                  <i className="fas fa-user"></i> Profilo
                </Link>
                {user?.role === 'admin' && (
                  <Link 
                    href="/admin" 
                    className={isActive('/admin') ? 'active' : ''} 
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                      color: 'white',
                      fontWeight: '700',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-lg)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      margin: '0.5rem 0'
                    }}
                  >
                    <i className="fas fa-cog"></i> Admin Dashboard
                  </Link>
                )}
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
