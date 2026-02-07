'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';

interface ActivityLog {
  _id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export default function ActivityLogsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (logs.length > 0 || !loading) {
      fetchLogs();
    }
  }, [pagination.page, actionFilter, resourceFilter]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok || response.status === 401) {
        localStorage.removeItem('token');
        router.push('/');
        return;
      }

      const data = await response.json();
      if (data.user.role !== 'admin') {
        showToast('Access denied. Admin privileges required.', 'error');
        router.push('/');
        return;
      }

      fetchLogs();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (actionFilter) params.append('action', actionFilter);
      if (resourceFilter) params.append('resource', resourceFilter);

      const response = await fetch(`/api/admin/activity-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          router.push('/');
          return;
        }
        showToast('Failed to fetch activity logs', 'error');
        return;
      }

      const data = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete')) return '#ef4444';
    if (action.includes('create')) return '#10b981';
    if (action.includes('update')) return '#3b82f6';
    return '#6b7280';
  };

  if (loading && logs.length === 0) {
    return (
      <>
        <Header />
        <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading activity logs...</p>
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
              <i className="fas fa-history" style={{ marginRight: '0.5rem' }}></i>
              Activity Logs
            </h2>
            <button className="btn-submit" onClick={() => router.push('/admin')}>
              <i className="fas fa-arrow-left" style={{ marginRight: '0.5rem' }}></i>
              Back to Dashboard
            </button>
          </div>

          {/* Filters */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem', 
            marginBottom: '2rem' 
          }}>
            <div>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPagination({ ...pagination, page: 1 }); }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  fontSize: '1rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">All Actions</option>
                <option value="user_created">User Created</option>
                <option value="user_updated">User Updated</option>
                <option value="user_deleted">User Deleted</option>
                <option value="user_role_changed">Role Changed</option>
                <option value="newsletter_subscribed">Newsletter Subscribed</option>
                <option value="newsletter_deleted">Newsletter Deleted</option>
                <option value="login">Login</option>
                <option value="admin_access">Admin Access</option>
              </select>
            </div>
            <div>
              <select
                value={resourceFilter}
                onChange={(e) => { setResourceFilter(e.target.value); setPagination({ ...pagination, page: 1 }); }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  fontSize: '1rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">All Resources</option>
                <option value="user">User</option>
                <option value="newsletter">Newsletter</option>
                <option value="system">System</option>
                <option value="auth">Auth</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Date & Time</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>User</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Action</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Resource</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No activity logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {new Date(log.createdAt).toLocaleString('it-IT')}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.875rem' }}>{log.userEmail}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: 'var(--radius)',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          background: `${getActionColor(log.action)}20`,
                          color: getActionColor(log.action)
                        }}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{log.resource}</td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {log.details ? (
                          <details>
                            <summary style={{ cursor: 'pointer', color: 'var(--text-primary)' }}>View Details</summary>
                            <pre style={{ 
                              marginTop: '0.5rem', 
                              padding: '0.5rem', 
                              background: 'var(--bg-secondary)', 
                              borderRadius: 'var(--radius)',
                              fontSize: '0.75rem',
                              overflow: 'auto'
                            }}>
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          '-'
                        )}
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
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              <span style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>
                Page {pagination.page} of {pagination.pages}
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
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

