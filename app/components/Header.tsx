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

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    if (token) {
      // Optionally fetch user data
      fetchUserData(token);
    }
  }, []);

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
  };

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <header>
        <Link href="/" className="logo">
          <span style={{ fontSize: '1.5rem', fontWeight: '700' }}>SwiftHire</span>
        </Link>
        
        <div className="nav-links">
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
            <i className="fas fa-plus"></i> Pubblica Annuncio
          </Link>
          <Link href="/video-cv" className="btn-video">
            <i className="fas fa-video"></i> Video CV
          </Link>
          <Link href="/messages" className="btn-video">
            <i className="fas fa-comments"></i> Messaggi
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
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </>
          ) : (
            <button
              className="btn-video"
              onClick={() => setAuthModalOpen(true)}
              style={{ background: 'transparent', color: '#000', border: 'none', cursor: 'pointer' }}
            >
              <i className="fas fa-sign-in-alt"></i> Accedi
            </button>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
