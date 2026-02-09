'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';

export default function AdminJobs() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchJobs();
    }
  }, [isAdmin, searchTerm]);

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
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.user.role !== 'admin') {
        setLoading(false);
        return;
      }

      setIsAdmin(true);
    } catch (err) {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/jobs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      } else {
        showToast('Failed to fetch jobs', 'error');
      }
    } catch (err) {
      showToast('Failed to fetch jobs', 'error');
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
            <p style={{ color: 'var(--text-secondary)' }}>Caricamento...</p>
          </div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <div className="main-container" style={{ display: 'block' }}>
          <div className="card">
            <div style={{ color: 'var(--error)', textAlign: 'center', padding: '2rem' }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
              <h2>Access Denied</h2>
              <p>Admin privileges required.</p>
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
            <div>
              <h2>
                <i className="fas fa-briefcase" style={{ marginRight: '0.5rem' }}></i>
                Job Posting Management
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Manage all job postings, applications, and listings
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link href="/admin/jobs/create" className="btn-submit">
                <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
                Create New Job
              </Link>
              <button className="btn-submit" onClick={fetchJobs} style={{ background: '#666' }}>
                <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i>
                Refresh
              </button>
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
                placeholder="Search jobs by title, company, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

          {/* Jobs Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Title</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Company</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Location</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Applications</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Created</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <i className="fas fa-briefcase" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3, display: 'block' }}></i>
                      <p>No job postings found</p>
                      <Link href="/admin/jobs/create" className="btn-submit" style={{ marginTop: '1rem', display: 'inline-block' }}>
                        <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
                        Create First Job
                      </Link>
                    </td>
                  </tr>
                ) : (
                  jobs.map((job: any) => (
                    <tr key={job._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>{job.title}</td>
                      <td style={{ padding: '1rem' }}>{job.companyId?.companyName || job.companyId?.name || 'N/A'}</td>
                      <td style={{ padding: '1rem' }}>{job.location || '-'}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: 'var(--radius)',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          background: job.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: job.status === 'active' ? '#10b981' : '#ef4444'
                        }}>
                          {job.status || 'Draft'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>{job.applications || 0}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                        {job.createdAt ? new Date(job.createdAt).toLocaleDateString('it-IT') : '-'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => router.push(`/admin/jobs/${job._id}`)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: 'var(--primary)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 'var(--radius)',
                              cursor: 'pointer',
                              fontSize: '0.875rem'
                            }}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            onClick={() => router.push(`/admin/jobs/${job._id}/edit`)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              borderRadius: 'var(--radius)',
                              cursor: 'pointer',
                              fontSize: '0.875rem'
                            }}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this job?')) {
                                try {
                                  const token = localStorage.getItem('token');
                                  const response = await fetch(`/api/jobs/${job._id}`, {
                                    method: 'DELETE',
                                    headers: {
                                      'Authorization': `Bearer ${token}`,
                                    },
                                  });

                                  if (response.ok) {
                                    showToast('Job deleted successfully', 'success');
                                    fetchJobs();
                                  } else {
                                    const data = await response.json();
                                    showToast(data.error || 'Failed to delete job', 'error');
                                  }
                                } catch (err) {
                                  showToast('Failed to delete job', 'error');
                                }
                              }
                            }}
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
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

