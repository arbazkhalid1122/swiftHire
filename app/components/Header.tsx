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
    // Only refresh user data if we don't have user data yet
    // Don't refresh on every route change to avoid excessive API calls
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
    // Store user ID for notifications
    if (userData?.id) {
      localStorage.setItem('userId', userData.id.toString());
    } else if (userData?._id) {
      localStorage.setItem('userId', userData._id.toString());
    }
    setIsAuthenticated(true);
    setUser(userData);
    setAuthModalOpen(false);
    
    // Redirect based on user type
    if (userData?.role === 'admin') {
      router.push('/admin');
    } else if (userData?.userType === 'company') {
      router.push('/company');
    } else if (userData?.userType === 'candidate') {
      router.push('/candidate');
    } else {
      router.push('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setIsAuthenticated(false);
    setUser(null);
    router.push('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    // For home page, check if we're on '/' or if admin is on home page
    if (path === '/') {
      return pathname === '/';
    }
    // For other paths, check if pathname starts with the path
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
              {user?.role !== 'admin' && (
              <Link 
                href="/messages" 
                className={isActive('/messages') ? 'active' : ''}
                style={{ 
                  color: 'var(--text-primary)', 
                  padding: '0.5rem 1rem', 
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  position: 'relative'
                }}
              >
                <i className="fas fa-envelope"></i>
                Messaggi
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
                {user?.role !== 'admin' && (
                <Link 
                  href="/messages" 
                  className={isActive('/messages') ? 'active' : ''} 
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <i className="fas fa-envelope"></i> Messaggi
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
