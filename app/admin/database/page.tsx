'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';

interface DatabaseInfo {
  connection: {
    name: string;
    host: string;
    port: number;
    readyState: number;
  };
  stats: {
    dataSize: number;
    storageSize: number;
    indexes: number;
    indexSize: number;
  };
  collections: Array<{
    name: string;
    count: number;
    size: number;
    storageSize: number;
    indexes: number;
  }>;
  modelCounts: {
    users: number;
    newsletters: number;
    activityLogs: number;
    otps: number;
    passwordResets: number;
  };
  cleanup: {
    expiredOTPs: number;
    expiredPasswordResets: number;
  };
}

export default function DatabaseManagementPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

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

      fetchDatabaseInfo();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
      setLoading(false);
    }
  };

  const fetchDatabaseInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/database', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          router.push('/');
          return;
        }
        showToast('Failed to fetch database information', 'error');
        return;
      }

      const data = await response.json();
      setDbInfo(data);
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleCleanup = async (action: string, days?: number) => {
    if (!confirm(`Are you sure you want to perform this cleanup action?`)) {
      return;
    }

    setCleaning(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action, days }),
      });

      if (!response.ok) {
        const data = await response.json();
        showToast(data.error || 'Failed to perform cleanup', 'error');
        return;
      }

      const data = await response.json();
      showToast(data.message + ` (${data.deleted} records deleted)`, 'success');
      fetchDatabaseInfo();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setCleaning(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading database information...</p>
          </div>
        </div>
      </>
    );
  }

  if (!dbInfo) {
    return (
      <>
        <Header />
        <div className="main-container">
          <div className="card">
            <p>Failed to load database information</p>
          </div>
        </div>
      </>
    );
  }

  const readyStateMap: Record<number, string> = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  return (
    <>
      <Header />
      <div className="main-container" style={{ display: 'block' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2>
              <i className="fas fa-database" style={{ marginRight: '0.5rem' }}></i>
              Database Management
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-submit" onClick={fetchDatabaseInfo} style={{ background: '#666' }}>
                <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i>
                Refresh
              </button>
              <button className="btn-submit" onClick={() => router.push('/admin')}>
                <i className="fas fa-arrow-left" style={{ marginRight: '0.5rem' }}></i>
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Connection Info */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Connection Information</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem' 
            }}>
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Database Name</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{dbInfo.connection.name}</div>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Host</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{dbInfo.connection.host}</div>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Status</div>
                <div style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600',
                  color: dbInfo.connection.readyState === 1 ? '#10b981' : '#ef4444'
                }}>
                  {readyStateMap[dbInfo.connection.readyState]}
                </div>
              </div>
            </div>
          </div>

          {/* Database Stats */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Database Statistics</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem' 
            }}>
              <div style={{ 
                padding: '1rem', 
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Data Size</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{formatBytes(dbInfo.stats.dataSize)}</div>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Storage Size</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{formatBytes(dbInfo.stats.storageSize)}</div>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Indexes</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{dbInfo.stats.indexes}</div>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)' 
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Index Size</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{formatBytes(dbInfo.stats.indexSize)}</div>
              </div>
            </div>
          </div>

          {/* Model Counts */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Model Counts</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '1rem' 
            }}>
              {Object.entries(dbInfo.modelCounts).map(([key, value]) => (
                <div key={key} style={{ 
                  padding: '1rem', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Collections */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Collections</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Collection</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Documents</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Size</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Storage Size</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Indexes</th>
                  </tr>
                </thead>
                <tbody>
                  {dbInfo.collections.map((collection) => (
                    <tr key={collection.name} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>{collection.name}</td>
                      <td style={{ padding: '1rem' }}>{collection.count.toLocaleString()}</td>
                      <td style={{ padding: '1rem' }}>{formatBytes(collection.size)}</td>
                      <td style={{ padding: '1rem' }}>{formatBytes(collection.storageSize)}</td>
                      <td style={{ padding: '1rem' }}>{collection.indexes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cleanup Actions */}
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Database Cleanup</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '1rem' 
            }}>
              <div style={{ 
                padding: '1.5rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)'
              }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Expired OTPs</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {dbInfo.cleanup.expiredOTPs} expired and used OTPs found
                </p>
                <button
                  className="btn-submit"
                  onClick={() => handleCleanup('cleanup-expired-otps')}
                  disabled={cleaning || dbInfo.cleanup.expiredOTPs === 0}
                  style={{ width: '100%' }}
                >
                  {cleaning ? 'Cleaning...' : 'Clean Up'}
                </button>
              </div>
              <div style={{ 
                padding: '1.5rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)'
              }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Expired Password Resets</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {dbInfo.cleanup.expiredPasswordResets} expired and used password resets found
                </p>
                <button
                  className="btn-submit"
                  onClick={() => handleCleanup('cleanup-expired-resets')}
                  disabled={cleaning || dbInfo.cleanup.expiredPasswordResets === 0}
                  style={{ width: '100%' }}
                >
                  {cleaning ? 'Cleaning...' : 'Clean Up'}
                </button>
              </div>
              <div style={{ 
                padding: '1.5rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)'
              }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Old Activity Logs</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Remove activity logs older than 90 days
                </p>
                <button
                  className="btn-submit"
                  onClick={() => handleCleanup('cleanup-old-logs', 90)}
                  disabled={cleaning}
                  style={{ width: '100%' }}
                >
                  {cleaning ? 'Cleaning...' : 'Clean Up (90 days)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

