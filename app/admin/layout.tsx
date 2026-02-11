'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
        }
        router.push('/');
        return;
      }

      const data = await response.json();
      
      if (data.user.role !== 'admin') {
        // Non-admin users are immediately redirected
        router.push('/');
        return;
      }

      setIsAuthorized(true);
    } catch (err) {
      console.error('Admin access check error:', err);
      router.push('/');
    } finally {
      setIsChecking(false);
    }
  };

  // Show loading state while checking authentication
  if (isChecking || !isAuthorized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid var(--border-light)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

