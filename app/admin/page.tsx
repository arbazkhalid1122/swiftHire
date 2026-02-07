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
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }

      setIsAdmin(true);
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
      <div className="main-container" style={{ display: 'block' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2>
              <i className="fas fa-tachometer-alt" style={{ marginRight: '0.5rem' }}></i>
              Admin Dashboard
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-submit" onClick={handleExport}>
                <i className="fas fa-download" style={{ marginRight: '0.5rem' }}></i>
                Esporta CSV
              </button>
              <button className="btn-submit" onClick={() => { fetchSubscribers(); fetchStats(); }} style={{ background: '#666' }}>
                <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i>
                Aggiorna
              </button>
            </div>
          </div>

          {/* Navigation Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem', 
            marginBottom: '3rem' 
          }}>
            <Link href="/admin/users" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '2rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: 'var(--shadow-lg)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <i className="fas fa-users" style={{ fontSize: '2.5rem', marginBottom: '1rem', display: 'block' }}></i>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>User Management</h3>
                <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>Manage all registered users, roles, and permissions</p>
              </div>
            </Link>

            <Link href="/admin/database" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '2rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: 'var(--shadow-lg)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <i className="fas fa-database" style={{ fontSize: '2.5rem', marginBottom: '1rem', display: 'block' }}></i>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Database Management</h3>
                <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>Monitor database health and perform cleanup operations</p>
              </div>
            </Link>

            <Link href="/admin/analytics" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '2rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: 'var(--shadow-lg)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <i className="fas fa-chart-line" style={{ fontSize: '2.5rem', marginBottom: '1rem', display: 'block' }}></i>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Analytics</h3>
                <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>View detailed analytics and growth statistics</p>
              </div>
            </Link>

            <Link href="/admin/activity-logs" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '2rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: 'var(--shadow-lg)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <i className="fas fa-history" style={{ fontSize: '2.5rem', marginBottom: '1rem', display: 'block' }}></i>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Activity Logs</h3>
                <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>View system activity and admin actions</p>
              </div>
            </Link>
          </div>

          {/* Statistics */}
          {stats && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem', 
              marginBottom: '2rem' 
            }}>
              <div style={{ 
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {stats.totalSubscribers}
                </div>
                <div style={{ opacity: 0.9 }}>Totale Iscritti</div>
              </div>
              <div style={{ 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {stats.activeSubscribers}
                </div>
                <div style={{ opacity: 0.9 }}>Attivi</div>
              </div>
              <div style={{ 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {stats.totalUsers}
                </div>
                <div style={{ opacity: 0.9 }}>Utenti Totali</div>
              </div>
              <div style={{ 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {stats.verifiedUsers}
                </div>
                <div style={{ opacity: 0.9 }}>Utenti Verificati</div>
              </div>
            </div>
          )}

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
                  border: '1px solid var(--border)',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          {/* Subscribers Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Stato</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Data Iscrizione</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {searchEmail ? 'Nessun risultato trovato' : 'Nessun iscritto trovato'}
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map((subscriber) => (
                    <tr key={subscriber._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>{subscriber.email}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: 'var(--radius)',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          background: subscriber.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: subscriber.isActive ? '#10b981' : '#ef4444'
                        }}>
                          {subscriber.isActive ? 'Attivo' : 'Inattivo'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                        {new Date(subscriber.subscribedAt).toLocaleDateString('it-IT', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteSubscriber(subscriber.email)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--error)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          <i className="fas fa-trash" style={{ marginRight: '0.25rem' }}></i>
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
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '0.5rem', 
              marginTop: '2rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="btn-submit"
                style={{ 
                  background: pagination.page === 1 ? '#ccc' : 'var(--primary)',
                  cursor: pagination.page === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <i className="fas fa-chevron-left"></i> Precedente
              </button>
              <span style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>
                Pagina {pagination.page} di {pagination.pages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="btn-submit"
                style={{ 
                  background: pagination.page === pagination.pages ? '#ccc' : 'var(--primary)',
                  cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer'
                }}
              >
                Successivo <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

