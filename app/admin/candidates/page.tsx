'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';

export default function AdminCandidates() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCVType, setFilterCVType] = useState('all');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchCandidates();
    }
  }, [isAdmin]);

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

  const fetchCandidates = async () => {
    try {
      // TODO: Implement API endpoint for fetching candidates
      // For now, using mock data
      setCandidates([]);
      setLoading(false);
    } catch (err) {
      showToast('Failed to fetch candidates', 'error');
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
                <i className="fas fa-user-tie" style={{ marginRight: '0.5rem' }}></i>
                Candidate Management
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                View and manage candidate profiles, CVs, and applications
              </p>
            </div>
            <button className="btn-submit" onClick={fetchCandidates} style={{ background: '#666' }}>
              <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i>
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem', 
            marginBottom: '1.5rem' 
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Search</label>
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  fontSize: '1rem'
                }}
              >
                <option value="all">All Categories</option>
                <option value="it-tech">IT & Tech</option>
                <option value="marketing">Marketing</option>
                <option value="design">Design</option>
                <option value="sales">Sales</option>
                <option value="hr">HR & Recruiting</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>CV Type</label>
              <select
                value={filterCVType}
                onChange={(e) => setFilterCVType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  fontSize: '1rem'
                }}
              >
                <option value="all">All Types</option>
                <option value="video">Video CV</option>
                <option value="standard">Standard CV</option>
              </select>
            </div>
          </div>

          {/* Candidates Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {candidates.length === 0 ? (
              <div style={{ 
                gridColumn: '1 / -1', 
                textAlign: 'center', 
                padding: '3rem',
                color: 'var(--text-secondary)'
              }}>
                <i className="fas fa-user-tie" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3, display: 'block' }}></i>
                <p>No candidates found</p>
              </div>
            ) : (
              candidates.map((candidate) => (
                <div key={candidate._id} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.5rem',
                      fontWeight: 'bold'
                    }}>
                      {candidate.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>{candidate.name || 'Unknown'}</h3>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {candidate.role || 'Candidate'}
                      </p>
                    </div>
                    {candidate.hasVideoCV && (
                      <span style={{
                        background: '#ef4444',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        <i className="fas fa-video"></i> Video
                      </span>
                    )}
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      <i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem' }}></i>
                      {candidate.location || 'Location not specified'}
                    </p>
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      <i className="fas fa-briefcase" style={{ marginRight: '0.5rem' }}></i>
                      {candidate.experience || 'Experience not specified'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => router.push(`/admin/candidates/${candidate._id}`)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}
                    >
                      <i className="fas fa-eye" style={{ marginRight: '0.5rem' }}></i>
                      View Profile
                    </button>
                    {candidate.hasVideoCV && (
                      <button
                        onClick={() => {
                          showToast('Video CV viewer coming soon', 'info');
                        }}
                        style={{
                          padding: '0.75rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        <i className="fas fa-video"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

