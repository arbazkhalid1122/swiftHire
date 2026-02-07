'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';

export default function AdminVideoCVs() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [videoCVs, setVideoCVs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchVideoCVs();
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

  const fetchVideoCVs = async () => {
    try {
      // TODO: Implement API endpoint for fetching video CVs
      // For now, using mock data
      setVideoCVs([]);
      setLoading(false);
    } catch (err) {
      showToast('Failed to fetch video CVs', 'error');
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
                <i className="fas fa-video" style={{ marginRight: '0.5rem' }}></i>
                Video CV Management
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Review and manage video CV submissions from candidates
              </p>
            </div>
            <button className="btn-submit" onClick={fetchVideoCVs} style={{ background: '#666' }}>
              <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i>
              Refresh
            </button>
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
                placeholder="Search video CVs by candidate name..."
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

          {/* Video CVs Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {videoCVs.length === 0 ? (
              <div style={{ 
                gridColumn: '1 / -1', 
                textAlign: 'center', 
                padding: '3rem',
                color: 'var(--text-secondary)'
              }}>
                <i className="fas fa-video" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3, display: 'block' }}></i>
                <p>No video CVs found</p>
              </div>
            ) : (
              videoCVs.map((videoCV) => (
                <div key={videoCV._id} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
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
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '56.25%',
                    background: '#000',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    showToast('Video player coming soon', 'info');
                  }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: 'white',
                      fontSize: '3rem'
                    }}>
                      <i className="fas fa-play-circle"></i>
                    </div>
                    {videoCV.thumbnail && (
                      <img 
                        src={videoCV.thumbnail} 
                        alt="Video thumbnail"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    )}
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.25rem',
                        fontWeight: 'bold'
                      }}>
                        {videoCV.candidateName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>{videoCV.candidateName || 'Unknown'}</h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {videoCV.duration || 'Duration unknown'}
                        </p>
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <i className="fas fa-calendar" style={{ marginRight: '0.5rem' }}></i>
                        {videoCV.createdAt ? new Date(videoCV.createdAt).toLocaleDateString('it-IT') : 'Date unknown'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          showToast('Video player coming soon', 'info');
                        }}
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
                        <i className="fas fa-play" style={{ marginRight: '0.5rem' }}></i>
                        Watch Video
                      </button>
                      <button
                        onClick={() => {
                          router.push(`/admin/candidates/${videoCV.candidateId}`);
                        }}
                        style={{
                          padding: '0.75rem',
                          background: '#666',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        <i className="fas fa-user"></i>
                      </button>
                    </div>
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

