'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import { useToast } from '../contexts/ToastContext';

interface Subscriber {
  _id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt?: string;
}

interface Stats {
  totalSubscribers: number;
  activeSubscribers: number;
  inactiveSubscribers: number;
  totalUsers: number;
  verifiedUsers: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [error, setError] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNewsletterForm, setShowNewsletterForm] = useState(false);
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterContent, setNewsletterContent] = useState('');
  const [sendingNewsletter, setSendingNewsletter] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchSubscribers();
      fetchStats();
    }
  }, [isAdmin, pagination.page]);

  const checkAuth = async () => {
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
          router.push('/');
          return;
        }
        setError('Failed to verify authentication');
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.user.role !== 'admin') {
        // Immediately redirect non-admin users
        showToast('Access denied. Admin privileges required.', 'error');
        router.push('/');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/admin/newsletter?page=${pagination.page}&limit=${pagination.limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          router.push('/');
          return;
        }
        setError('Failed to fetch subscribers');
        return;
      }

      const data = await response.json();
      setSubscribers(data.subscribers);
      setPagination(data.pagination);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  const handleDeleteSubscriber = async (email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the newsletter?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/newsletter/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        showToast('Failed to remove subscriber', 'error');
        return;
      }

      showToast('Subscriber removed successfully', 'success');
      fetchSubscribers();
      fetchStats();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/newsletter/export', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        showToast('Failed to export subscribers', 'error');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Subscribers exported successfully', 'success');
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newsletterSubject.trim() || !newsletterContent.trim()) {
      showToast('Subject and content are required', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to send this newsletter to ${stats?.activeSubscribers || 0} active subscribers?`)) {
      return;
    }

    setSendingNewsletter(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: newsletterSubject,
          content: newsletterContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to send newsletter', 'error');
        setSendingNewsletter(false);
        return;
      }

      showToast(
        `Newsletter sent successfully! ${data.stats.success} emails sent, ${data.stats.failed} failed.`,
        'success'
      );
      setNewsletterSubject('');
      setNewsletterContent('');
      setShowNewsletterForm(false);
      fetchStats();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSendingNewsletter(false);
    }
  };

  const filteredSubscribers = searchEmail
    ? subscribers.filter((sub) =>
        sub.email.toLowerCase().includes(searchEmail.toLowerCase())
      )
    : subscribers;

  if (loading) {
    return (
      <>
        <Header />
        <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Caricamento...</p>
          </div>
        </div>
      </>
    );
  }

  if (error && !isAdmin) {
    return (
      <>
        <Header />
        <div className="main-container" style={{ display: 'block' }}>
          <div className="card">
            <div style={{ color: 'var(--error)', textAlign: 'center', padding: '2rem' }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
              <h2>Access Denied</h2>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 1024px) {
          .admin-grid {
            grid-template-columns: 1fr !important;
          }
          .admin-sidebar {
            position: static !important;
            margin-bottom: 2rem;
          }
          .admin-stats {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .admin-stats {
            grid-template-columns: 1fr !important;
          }
          .admin-header h1 {
            font-size: 1.75rem !important;
          }
          .admin-header {
            padding: 2rem 1rem !important;
          }
        }
      `}} />
      <div className="main-container" style={{ display: 'block', padding: '0' }}>
        {/* Modern Header Section */}
        <div className="admin-header" style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          padding: '3rem 2rem',
          marginBottom: '2rem',
          borderRadius: 'var(--radius-xl)',
          color: 'white'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: '700', 
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <i className="fas fa-tachometer-alt"></i>
              Admin Dashboard
            </h1>
            <p style={{ fontSize: '1.1rem', opacity: 0.9, margin: 0 }}>
              Manage your platform, users, and content from one central location
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 2rem' }}>
          {/* Quick Actions Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            padding: '1.5rem',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setShowNewsletterForm(!showNewsletterForm)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: showNewsletterForm ? '#ef4444' : 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <i className={`fas ${showNewsletterForm ? 'fa-times' : 'fa-paper-plane'}`}></i>
                {showNewsletterForm ? 'Annulla' : 'Invia Newsletter'}
              </button>
              <button 
                onClick={handleExport}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <i className="fas fa-download"></i>
                Esporta CSV
              </button>
              <button 
                onClick={() => { fetchSubscribers(); fetchStats(); }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <i className="fas fa-sync-alt"></i>
                Aggiorna
              </button>
            </div>
          </div>

          {/* Modern Sidebar Navigation */}
          <div className="admin-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: '280px 1fr', 
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            {/* Sidebar */}
            <div className="admin-sidebar" style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)',
              padding: '1.5rem 0',
              height: 'fit-content',
              position: 'sticky',
              top: '100px'
            }}>
              <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
                <h3 style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '700', 
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--text-secondary)',
                  margin: 0
                }}>
                  Quick Navigation
                </h3>
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Link href="/admin/users" style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '0.875rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    borderLeft: '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.borderLeftColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                  >
                    <i className="fas fa-users" style={{ width: '20px', color: 'var(--primary)' }}></i>
                    <span style={{ fontWeight: '500' }}>Users</span>
                  </div>
                </Link>
                <Link href="/admin/jobs" style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '0.875rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    borderLeft: '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.borderLeftColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                  >
                    <i className="fas fa-briefcase" style={{ width: '20px', color: '#8b5cf6' }}></i>
                    <span style={{ fontWeight: '500' }}>Jobs</span>
                  </div>
                </Link>
                <Link href="/admin/candidates" style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '0.875rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    borderLeft: '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.borderLeftColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                  >
                    <i className="fas fa-user-tie" style={{ width: '20px', color: '#ec4899' }}></i>
                    <span style={{ fontWeight: '500' }}>Candidates</span>
                  </div>
                </Link>
                <Link href="/admin/video-cvs" style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '0.875rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    borderLeft: '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.borderLeftColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                  >
                    <i className="fas fa-video" style={{ width: '20px', color: '#ef4444' }}></i>
                    <span style={{ fontWeight: '500' }}>Video CVs</span>
                  </div>
                </Link>
                <Link href="/admin/messages" style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '0.875rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    borderLeft: '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.borderLeftColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                  >
                    <i className="fas fa-comments" style={{ width: '20px', color: '#14b8a6' }}></i>
                    <span style={{ fontWeight: '500' }}>Messages</span>
                  </div>
                </Link>
                <div style={{ 
                  height: '1px', 
                  background: 'var(--border-light)', 
                  margin: '0.75rem 1.5rem' 
                }}></div>
                <Link href="/admin/analytics" style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '0.875rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    borderLeft: '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.borderLeftColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                  >
                    <i className="fas fa-chart-line" style={{ width: '20px', color: '#f59e0b' }}></i>
                    <span style={{ fontWeight: '500' }}>Analytics</span>
                  </div>
                </Link>
                <Link href="/admin/database" style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '0.875rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    borderLeft: '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.borderLeftColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                  >
                    <i className="fas fa-database" style={{ width: '20px', color: '#10b981' }}></i>
                    <span style={{ fontWeight: '500' }}>Database</span>
                  </div>
                </Link>
                <Link href="/admin/activity-logs" style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '0.875rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    borderLeft: '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.borderLeftColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                  >
                    <i className="fas fa-history" style={{ width: '20px', color: '#3b82f6' }}></i>
                    <span style={{ fontWeight: '500' }}>Activity Logs</span>
                  </div>
                </Link>
                <Link href="/admin/job-sources" style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '0.875rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    borderLeft: '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.borderLeftColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                  >
                    <i className="fas fa-spider" style={{ width: '20px', color: '#3b82f6' }}></i>
                    <span style={{ fontWeight: '500' }}>Job Sources</span>
                  </div>
                </Link>
              </nav>
            </div>

            {/* Main Content Area */}
            <div>

              {/* Statistics - Cleaner Design */}
              {stats && (
                <div className="admin-stats" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  gap: '1rem', 
                  marginBottom: '2rem' 
                }}>
                  <div style={{ 
                    background: 'var(--bg-primary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-light)',
                    borderTop: '3px solid var(--primary)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem'
                    }}>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Totale Iscritti
                      </span>
                      <i className="fas fa-envelope" style={{ color: 'var(--primary)', fontSize: '1.25rem' }}></i>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {stats.totalSubscribers}
                    </div>
                  </div>
                  <div style={{ 
                    background: 'var(--bg-primary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-light)',
                    borderTop: '3px solid #10b981'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem'
                    }}>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Attivi
                      </span>
                      <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '1.25rem' }}></i>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {stats.activeSubscribers}
                    </div>
                  </div>
                  <div style={{ 
                    background: 'var(--bg-primary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-light)',
                    borderTop: '3px solid #f59e0b'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem'
                    }}>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Utenti Totali
                      </span>
                      <i className="fas fa-users" style={{ color: '#f59e0b', fontSize: '1.25rem' }}></i>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {stats.totalUsers}
                    </div>
                  </div>
                  <div style={{ 
                    background: 'var(--bg-primary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-light)',
                    borderTop: '3px solid #3b82f6'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem'
                    }}>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Verificati
                      </span>
                      <i className="fas fa-shield-check" style={{ color: '#3b82f6', fontSize: '1.25rem' }}></i>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {stats.verifiedUsers}
                    </div>
                  </div>
                </div>
              )}

              {/* Newsletter Sending Form */}
              {showNewsletterForm && (
                <div style={{ 
                  marginBottom: '2rem', 
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem'
                }}>
              <h2 style={{ 
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className="fas fa-paper-plane" style={{ color: 'var(--secondary)' }}></i>
                Invia Newsletter agli Iscritti
              </h2>
              {stats && (
                <div style={{ 
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(236, 72, 153, 0.2)'
                }}>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: '600' }}>
                    <i className="fas fa-users" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
                    Questa newsletter verrà inviata a <strong>{stats.activeSubscribers}</strong> iscritti attivi
                  </p>
                </div>
              )}
              <form onSubmit={handleSendNewsletter}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    <i className="fas fa-heading" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
                    Oggetto Email
                  </label>
                  <input
                    type="text"
                    value={newsletterSubject}
                    onChange={(e) => setNewsletterSubject(e.target.value)}
                    placeholder="Es: Nuove offerte di lavoro disponibili!"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-lg)',
                      border: '2px solid var(--border-light)',
                      fontSize: '1rem',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      transition: 'all var(--transition-base)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-light)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    <i className="fas fa-align-left" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
                    Contenuto (HTML supportato)
                  </label>
                  <textarea
                    value={newsletterContent}
                    onChange={(e) => setNewsletterContent(e.target.value)}
                    placeholder="Scrivi il contenuto della newsletter qui... Puoi usare HTML per formattare il testo."
                    required
                    rows={12}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      borderRadius: 'var(--radius-lg)',
                      border: '2px solid var(--border-light)',
                      fontSize: '1rem',
                      fontFamily: 'monospace',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                      transition: 'all var(--transition-base)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-light)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <p style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.875rem', 
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic'
                  }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '0.25rem' }}></i>
                    Puoi usare tag HTML come &lt;h1&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a&gt;, etc.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button 
                    type="submit" 
                    className="btn-submit"
                    disabled={sendingNewsletter}
                    style={{ 
                      background: 'linear-gradient(135deg, #ec4899 0%, #6366f1 100%)',
                      minWidth: '200px'
                    }}
                  >
                    {sendingNewsletter ? (
                      <>
                        <span className="loading-spinner" style={{ marginRight: '0.5rem' }}></span>
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane" style={{ marginRight: '0.5rem' }}></i>
                        Invia Newsletter
                      </>
                    )}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowNewsletterForm(false);
                      setNewsletterSubject('');
                      setNewsletterContent('');
                    }}
                    className="btn-submit"
                    style={{ 
                      background: '#666',
                      minWidth: '150px'
                    }}
                  >
                    <i className="fas fa-times" style={{ marginRight: '0.5rem' }}></i>
                    Annulla
                  </button>
                </div>
                </form>
              </div>
              )}

              {/* Newsletter Subscribers Section */}
              <div style={{
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)',
                padding: '2rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <h2 style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: '700', 
                      margin: 0,
                      marginBottom: '0.25rem',
                      color: 'var(--text-primary)'
                    }}>
                      Newsletter Subscribers
                    </h2>
                    <p style={{ 
                      margin: 0, 
                      color: 'var(--text-secondary)', 
                      fontSize: '0.875rem' 
                    }}>
                      Manage your newsletter subscriber list
                    </p>
                  </div>
                </div>

                {/* Search */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-search" style={{ 
                      position: 'absolute', 
                      left: '1rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary)'
                    }}></i>
                    <input
                      type="text"
                      placeholder="Cerca per email..."
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 3rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-light)',
                        fontSize: '1rem',
                        background: 'var(--bg-primary)',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-light)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* Subscribers Table - Modern Design */}
                <div style={{ 
                  overflowX: 'auto',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)'
                }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    background: 'var(--bg-primary)'
                  }}>
                    <thead>
                      <tr style={{ 
                        background: 'var(--bg-secondary)',
                        borderBottom: '2px solid var(--border-light)'
                      }}>
                        <th style={{ 
                          padding: '1rem 1.5rem', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'var(--text-secondary)'
                        }}>
                          Email
                        </th>
                        <th style={{ 
                          padding: '1rem 1.5rem', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'var(--text-secondary)'
                        }}>
                          Stato
                        </th>
                        <th style={{ 
                          padding: '1rem 1.5rem', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'var(--text-secondary)'
                        }}>
                          Data Iscrizione
                        </th>
                        <th style={{ 
                          padding: '1rem 1.5rem', 
                          textAlign: 'right', 
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'var(--text-secondary)'
                        }}>
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubscribers.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ 
                            padding: '3rem', 
                            textAlign: 'center', 
                            color: 'var(--text-secondary)' 
                          }}>
                            <i className="fas fa-inbox" style={{ 
                              fontSize: '2.5rem', 
                              marginBottom: '1rem', 
                              opacity: 0.3, 
                              display: 'block' 
                            }}></i>
                            <p style={{ margin: 0, fontSize: '1rem' }}>
                              {searchEmail ? 'Nessun risultato trovato' : 'Nessun iscritto trovato'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredSubscribers.map((subscriber, index) => (
                          <tr 
                            key={subscriber._id} 
                            style={{ 
                              borderBottom: index < filteredSubscribers.length - 1 ? '1px solid var(--border-light)' : 'none',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--bg-secondary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <td style={{ 
                              padding: '1rem 1.5rem',
                              fontWeight: '500',
                              color: 'var(--text-primary)'
                            }}>
                              {subscriber.email}
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <span style={{
                                padding: '0.375rem 0.875rem',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.8125rem',
                                fontWeight: '600',
                                background: subscriber.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: subscriber.isActive ? '#10b981' : '#ef4444',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem'
                              }}>
                                <span style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: subscriber.isActive ? '#10b981' : '#ef4444'
                                }}></span>
                                {subscriber.isActive ? 'Attivo' : 'Inattivo'}
                              </span>
                            </td>
                            <td style={{ 
                              padding: '1rem 1.5rem', 
                              color: 'var(--text-secondary)',
                              fontSize: '0.9rem'
                            }}>
                              {new Date(subscriber.subscribedAt).toLocaleDateString('it-IT', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                              <button
                                onClick={() => handleDeleteSubscriber(subscriber.email)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: 'transparent',
                                  color: 'var(--error)',
                                  border: '1px solid var(--error)',
                                  borderRadius: 'var(--radius)',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'var(--error)';
                                  e.currentTarget.style.color = 'white';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = 'var(--error)';
                                }}
                              >
                                <i className="fas fa-trash" style={{ marginRight: '0.5rem' }}></i>
                                Rimuovi
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: '1.5rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid var(--border-light)',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <span style={{ 
                      color: 'var(--text-secondary)', 
                      fontSize: '0.875rem' 
                    }}>
                      Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} di {pagination.total} iscritti
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                        disabled={pagination.page === 1}
                        style={{
                          padding: '0.5rem 1rem',
                          background: pagination.page === 1 ? 'var(--bg-tertiary)' : 'var(--primary)',
                          color: pagination.page === 1 ? 'var(--text-tertiary)' : 'white',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <span style={{ 
                        padding: '0.5rem 1rem', 
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {pagination.page} / {pagination.pages}
                      </span>
                      <button
                        onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                        disabled={pagination.page === pagination.pages}
                        style={{
                          padding: '0.5rem 1rem',
                          background: pagination.page === pagination.pages ? 'var(--bg-tertiary)' : 'var(--primary)',
                          color: pagination.page === pagination.pages ? 'var(--text-tertiary)' : 'white',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

