'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';

interface AnalyticsData {
  users: {
    total: number;
    verified: number;
    admin: number;
    new: number;
    growth: Array<{ _id: string; count: number }>;
  };
  newsletter: {
    total: number;
    active: number;
    new: number;
    growth: Array<{ _id: string; count: number }>;
  };
  activity: {
    total: number;
    byType: Array<{ _id: string; count: number }>;
    byResource: Array<{ _id: string; count: number }>;
    daily: Array<{ _id: string; count: number }>;
  };
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (analytics || !loading) {
      fetchAnalytics();
    }
  }, [days]);

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

      fetchAnalytics();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/analytics?days=${days}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          router.push('/');
          return;
        }
        showToast('Failed to fetch analytics', 'error');
        return;
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>
          </div>
        </div>
      </>
    );
  }

  if (!analytics) {
    return (
      <>
        <Header />
        <div className="main-container">
          <div className="card">
            <p>Failed to load analytics</p>
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
              <i className="fas fa-chart-line" style={{ marginRight: '0.5rem' }}></i>
              Analytics Dashboard
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  fontSize: '1rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
              <button className="btn-submit" onClick={() => router.push('/admin')}>
                <i className="fas fa-arrow-left" style={{ marginRight: '0.5rem' }}></i>
                Back
              </button>
            </div>
          </div>

          {/* User Statistics */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>User Statistics</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem' 
            }}>
              <div style={{ 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Users</div>
                <div style={{ fontSize: '2rem', fontWeight: '700' }}>{analytics.users.total}</div>
              </div>
              <div style={{ 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Verified Users</div>
                <div style={{ fontSize: '2rem', fontWeight: '700' }}>{analytics.users.verified}</div>
              </div>
              <div style={{ 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Admin Users</div>
                <div style={{ fontSize: '2rem', fontWeight: '700' }}>{analytics.users.admin}</div>
              </div>
              <div style={{ 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>New Users ({days} days)</div>
                <div style={{ fontSize: '2rem', fontWeight: '700' }}>{analytics.users.new}</div>
              </div>
            </div>
          </div>

          {/* Newsletter Statistics */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Newsletter Statistics</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem' 
            }}>
              <div style={{ 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Subscribers</div>
                <div style={{ fontSize: '2rem', fontWeight: '700' }}>{analytics.newsletter.total}</div>
              </div>
              <div style={{ 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Active Subscribers</div>
                <div style={{ fontSize: '2rem', fontWeight: '700' }}>{analytics.newsletter.active}</div>
              </div>
              <div style={{ 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>New Subscribers ({days} days)</div>
                <div style={{ fontSize: '2rem', fontWeight: '700' }}>{analytics.newsletter.new}</div>
              </div>
            </div>
          </div>

          {/* Activity Statistics */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Activity Statistics</h3>
            <div style={{ 
              padding: '1.5rem', 
              background: 'var(--bg-secondary)', 
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                Total Activities ({days} days): {analytics.activity.total}
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1rem' 
            }}>
              <div style={{ 
                padding: '1.5rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-lg)'
              }}>
                <h4 style={{ marginBottom: '1rem' }}>Activity by Type</h4>
                {analytics.activity.byType.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {analytics.activity.byType.map((item) => (
                      <div key={item._id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius)'
                      }}>
                        <span>{item._id.replace(/_/g, ' ')}</span>
                        <span style={{ fontWeight: '600' }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No activity data</p>
                )}
              </div>

              <div style={{ 
                padding: '1.5rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-lg)'
              }}>
                <h4 style={{ marginBottom: '1rem' }}>Activity by Resource</h4>
                {analytics.activity.byResource.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {analytics.activity.byResource.map((item) => (
                      <div key={item._id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius)'
                      }}>
                        <span style={{ textTransform: 'capitalize' }}>{item._id}</span>
                        <span style={{ fontWeight: '600' }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No activity data</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

