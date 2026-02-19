'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';

interface JobSource {
  _id: string;
  name: string;
  url: string;
  type: 'scraping' | 'xml' | 'api';
  isActive: boolean;
  scrapingConfig: {
    jobListSelector?: string;
    jobItemSelector?: string;
    titleSelector?: string;
    descriptionSelector?: string;
    locationSelector?: string;
    salarySelector?: string;
    linkSelector?: string;
    usePuppeteer?: boolean;
    useScrapingBee?: boolean;
    scrapingBeeOptions?: {
      renderJs?: boolean;
      countryCode?: string;
      wait?: number;
    };
  };
  lastScrapedAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  scrapeInterval: number;
  createdAt: string;
}

export default function JobSourcesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sources, setSources] = useState<JobSource[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<JobSource | null>(null);
  const [scraping, setScraping] = useState<string | null>(null);
  const [testingXML, setTestingXML] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'scraping' as 'scraping' | 'xml' | 'api',
    isActive: true,
    scrapeInterval: 60,
    scrapingConfig: {
      jobListSelector: '',
      jobItemSelector: '',
      titleSelector: '',
      descriptionSelector: '',
      locationSelector: '',
      salarySelector: '',
      linkSelector: '',
      usePuppeteer: false,
      useScrapingBee: false,
      scrapingBeeOptions: {
        renderJs: true,
        countryCode: '',
        wait: 2000,
      },
    },
  });
  const [showIndeedHelper, setShowIndeedHelper] = useState(false);
  const [indeedParams, setIndeedParams] = useState({
    query: '',
    location: '',
    radius: '25',
    jobType: '',
  });
  const [showJoobleHelper, setShowJoobleHelper] = useState(false);
  const [joobleParams, setJoobleParams] = useState({
    query: '',
    location: '',
  });
  const [showLinkedInHelper, setShowLinkedInHelper] = useState(false);
  const [linkedInParams, setLinkedInParams] = useState({
    query: '',
    location: '',
  });
  const [showXMLHelper, setShowXMLHelper] = useState(false);
  const [xmlParams, setXmlParams] = useState({
    partnerName: '',
    feedUrl: '',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchSources();
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

      setIsAdmin(true);
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
      setLoading(false);
    }
  };

  const fetchSources = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/job-sources', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        showToast('Failed to fetch job sources', 'error');
        return;
      }

      const data = await response.json();
      setSources(data.sources || []);
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingSource 
        ? `/api/admin/job-sources/${editingSource._id}`
        : '/api/admin/job-sources';
      
      const method = editingSource ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to save job source', 'error');
        return;
      }

      showToast(editingSource ? 'Job source updated successfully' : 'Job source created successfully', 'success');
      setShowForm(false);
      setEditingSource(null);
      resetForm();
      fetchSources();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job source?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/job-sources/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        showToast('Failed to delete job source', 'error');
        return;
      }

      showToast('Job source deleted successfully', 'success');
      fetchSources();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleScrape = async (id: string) => {
    setScraping(id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/job-sources/${id}/scrape`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to scrape';
        const suggestion = data.suggestion || '';
        const fullMessage = suggestion ? `${errorMsg}. ${suggestion}` : errorMsg;
        showToast(fullMessage, 'error');
        
        // If source was auto-deactivated, refresh the list
        if (data.autoDeactivated || data.suggestion) {
          setTimeout(() => fetchSources(), 1000);
        }
        return;
      }

      if (data.success === 0 && data.errors > 0) {
        showToast(`Scraping completed but no jobs found. Check the source URL and configuration.`, 'warning');
      } else {
        showToast(`Scraping completed: ${data.success} jobs saved, ${data.errors} errors`, 'success');
      }
      fetchSources();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setScraping(null);
    }
  };

  const handleEdit = (source: JobSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      url: source.url,
      type: source.type,
      isActive: source.isActive,
      scrapeInterval: source.scrapeInterval,
      scrapingConfig: {
        jobListSelector: source.scrapingConfig?.jobListSelector || '',
        jobItemSelector: source.scrapingConfig?.jobItemSelector || '',
        titleSelector: source.scrapingConfig?.titleSelector || '',
        descriptionSelector: source.scrapingConfig?.descriptionSelector || '',
        locationSelector: source.scrapingConfig?.locationSelector || '',
        salarySelector: source.scrapingConfig?.salarySelector || '',
        linkSelector: source.scrapingConfig?.linkSelector || '',
        usePuppeteer: source.scrapingConfig?.usePuppeteer || false,
        useScrapingBee: source.scrapingConfig?.useScrapingBee || false,
        scrapingBeeOptions: {
          renderJs: source.scrapingConfig?.scrapingBeeOptions?.renderJs !== false,
          countryCode: source.scrapingConfig?.scrapingBeeOptions?.countryCode || '',
          wait: source.scrapingConfig?.scrapingBeeOptions?.wait || 2000,
        },
      },
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      type: 'scraping',
      isActive: true,
      scrapeInterval: 60,
      scrapingConfig: {
        jobListSelector: '',
        jobItemSelector: '',
        titleSelector: '',
        descriptionSelector: '',
        locationSelector: '',
        salarySelector: '',
        linkSelector: '',
        usePuppeteer: false,
        useScrapingBee: false,
        scrapingBeeOptions: {
          renderJs: true,
          countryCode: '',
          wait: 2000,
        },
      },
    });
    setShowIndeedHelper(false);
    setIndeedParams({
      query: '',
      location: '',
      radius: '25',
      jobType: '',
    });
    setShowJoobleHelper(false);
    setJoobleParams({
      query: '',
      location: '',
    });
    setShowLinkedInHelper(false);
    setLinkedInParams({
      query: '',
      location: '',
    });
    setShowXMLHelper(false);
    setXmlParams({
      partnerName: '',
      feedUrl: '',
    });
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
    return null;
  }

  return (
    <>
      <Header />
      <div className="main-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>Job Sources</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => {
                resetForm();
                setEditingSource(null);
                setShowIndeedHelper(true);
                setShowForm(true);
                setFormData({ ...formData, type: 'xml' });
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              <i className="fas fa-rss"></i> Add Indeed Feed
            </button>
            <button
              onClick={() => {
                setShowJoobleHelper(true);
                setShowForm(true);
                setFormData({ ...formData, type: 'scraping', scrapingConfig: { ...formData.scrapingConfig, usePuppeteer: true } });
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              <i className="fas fa-briefcase"></i> Add Jooble Source
            </button>
            <button
              onClick={() => {
                setShowLinkedInHelper(true);
                setShowForm(true);
                setFormData({ ...formData, type: 'scraping', scrapingConfig: { ...formData.scrapingConfig, usePuppeteer: true } });
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #0077b5 0%, #005885 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              <i className="fab fa-linkedin"></i> Add LinkedIn Source
            </button>
            <button
              onClick={() => {
                resetForm();
                setEditingSource(null);
                setShowXMLHelper(true);
                setShowForm(true);
                setFormData({ ...formData, type: 'xml' });
                setShowIndeedHelper(false);
                setShowJoobleHelper(false);
                setShowLinkedInHelper(false);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              <i className="fas fa-handshake"></i> Add Partnership XML Feed
            </button>
            <button
              onClick={() => {
                setShowForm(true);
                setFormData({ ...formData, type: 'xml' });
                setShowIndeedHelper(false);
                setShowJoobleHelper(false);
                setShowLinkedInHelper(false);
                setShowXMLHelper(false);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              <i className="fas fa-rss-square"></i> Add RSS Feed
            </button>
            <button
              className="btn-submit"
              onClick={() => {
                resetForm();
                setEditingSource(null);
                setShowForm(true);
                setShowIndeedHelper(false);
                setShowJoobleHelper(false);
                setShowLinkedInHelper(false);
              }}
              style={{ padding: '0.75rem 1.5rem', marginTop: 0 }}
            >
              <i className="fas fa-plus"></i> Add Source
            </button>
          </div>
        </div>

        {showForm && (
          <div style={{
            background: 'var(--bg-card)',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2rem',
            border: '1px solid var(--border-light)',
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
              {editingSource ? 'Edit Job Source' : 'Add New Job Source'}
            </h2>
            <form onSubmit={handleSubmit}>
              {showIndeedHelper && (
                <div style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Indeed RSS Feed Helper</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Job Query *</label>
                      <input
                        type="text"
                        value={indeedParams.query}
                        onChange={(e) => setIndeedParams({ ...indeedParams, query: e.target.value })}
                        placeholder="e.g., Software Developer, Marketing Manager"
                        style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Location</label>
                      <input
                        type="text"
                        value={indeedParams.location}
                        onChange={(e) => setIndeedParams({ ...indeedParams, location: e.target.value })}
                        placeholder="e.g., Milan, Italy"
                        style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Radius (miles)</label>
                      <input
                        type="number"
                        value={indeedParams.radius}
                        onChange={(e) => setIndeedParams({ ...indeedParams, radius: e.target.value })}
                        min="0"
                        style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Job Type</label>
                      <select
                        value={indeedParams.jobType}
                        onChange={(e) => setIndeedParams({ ...indeedParams, jobType: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: 'var(--radius-md)' }}
                      >
                        <option value="">All Types</option>
                        <option value="fulltime">Full-time</option>
                        <option value="parttime">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                        <option value="temporary">Temporary</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!indeedParams.query) {
                        alert('Please enter a job query');
                        return;
                      }
                      const params: any = {
                        query: indeedParams.query,
                      };
                      if (indeedParams.location) params.location = indeedParams.location;
                      if (indeedParams.radius) params.radius = parseInt(indeedParams.radius);
                      if (indeedParams.jobType) params.jobType = indeedParams.jobType;

                      // Build Indeed URL
                      const baseURL = 'https://www.indeed.com/rss';
                      const searchParams = new URLSearchParams();
                      if (params.query) searchParams.set('q', params.query);
                      if (params.location) searchParams.set('l', params.location);
                      if (params.radius) searchParams.set('radius', params.radius.toString());
                      if (params.jobType) searchParams.set('jt', params.jobType);

                      const indeedURL = `${baseURL}?${searchParams.toString()}`;
                      setFormData({
                        ...formData,
                        name: `Indeed: ${indeedParams.query}${indeedParams.location ? ` in ${indeedParams.location}` : ''}`,
                        url: indeedURL,
                        type: 'xml',
                      });
                      setShowIndeedHelper(false);
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'white',
                      color: '#6366f1',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Generate Indeed Feed URL
                  </button>
                </div>
              )}
              {showJoobleHelper && (
                <div style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Jooble Job Search Helper</h3>
                  <div style={{
                    background: 'rgba(255, 193, 7, 0.2)',
                    border: '1px solid #ffc107',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                  }}>
                    <strong>⚠️ Note:</strong> Jooble uses Cloudflare protection which may block automated scraping. 
                    If scraping fails, consider using <strong>Indeed RSS feeds</strong> instead (more reliable).
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Job Query *</label>
                      <input
                        type="text"
                        value={joobleParams.query}
                        onChange={(e) => setJoobleParams({ ...joobleParams, query: e.target.value })}
                        placeholder="e.g., Software Developer, Marketing Manager"
                        style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Location</label>
                      <input
                        type="text"
                        value={joobleParams.location}
                        onChange={(e) => setJoobleParams({ ...joobleParams, location: e.target.value })}
                        placeholder="e.g., Milan, Italy"
                        style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!joobleParams.query) {
                        alert('Please enter a job query');
                        return;
                      }
                      // Build Jooble search URL (using regular search page, not API)
                      const baseURL = 'https://jooble.org';
                      const searchParams = new URLSearchParams();
                      // Jooble uses 'ukw' for keywords and 'rgns' for location
                      if (joobleParams.query) searchParams.set('ukw', joobleParams.query);
                      if (joobleParams.location) searchParams.set('rgns', joobleParams.location);

                      const joobleURL = `${baseURL}/SearchResult?${searchParams.toString()}`;
                      setFormData({
                        ...formData,
                        name: `Jooble: ${joobleParams.query}${joobleParams.location ? ` in ${joobleParams.location}` : ''}`,
                        url: joobleURL,
                        type: 'scraping',
                        scrapingConfig: { ...formData.scrapingConfig, usePuppeteer: true },
                      });
                      setShowJoobleHelper(false);
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'white',
                      color: '#10b981',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Generate Jooble Search URL
                  </button>
                </div>
              )}
              {showLinkedInHelper && (
                <div style={{
                  background: 'linear-gradient(135deg, #0077b5 0%, #005885 100%)',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>LinkedIn Job Search Helper</h3>
                  <div style={{
                    background: 'rgba(255, 193, 7, 0.2)',
                    border: '1px solid #ffc107',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                  }}>
                    <strong>⚠️ Note:</strong> LinkedIn has strong bot protection. Scraping may be blocked or rate-limited. 
                    For best results, use Indeed RSS feeds instead (more reliable).
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Job Query *</label>
                      <input
                        type="text"
                        value={linkedInParams.query}
                        onChange={(e) => setLinkedInParams({ ...linkedInParams, query: e.target.value })}
                        placeholder="e.g., Software Developer, Marketing Manager"
                        style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Location</label>
                      <input
                        type="text"
                        value={linkedInParams.location}
                        onChange={(e) => setLinkedInParams({ ...linkedInParams, location: e.target.value })}
                        placeholder="e.g., Milan, Italy"
                        style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!linkedInParams.query) {
                        alert('Please enter a job query');
                        return;
                      }
                      // Build LinkedIn search URL
                      const baseURL = 'https://www.linkedin.com/jobs/search';
                      const searchParams = new URLSearchParams();
                      if (linkedInParams.query) searchParams.set('keywords', linkedInParams.query);
                      if (linkedInParams.location) searchParams.set('location', linkedInParams.location);

                      const linkedInURL = `${baseURL}?${searchParams.toString()}`;
                      setFormData({
                        ...formData,
                        name: `LinkedIn: ${linkedInParams.query}${linkedInParams.location ? ` in ${linkedInParams.location}` : ''}`,
                        url: linkedInURL,
                        type: 'scraping',
                        scrapingConfig: { ...formData.scrapingConfig, usePuppeteer: true },
                      });
                      setShowLinkedInHelper(false);
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'white',
                      color: '#0077b5',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Generate LinkedIn Search URL
                  </button>
                </div>
              )}
              {showXMLHelper && (
                <div style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>
                    <i className="fas fa-handshake" style={{ marginRight: '0.5rem' }}></i>
                    Partnership XML Feed
                  </h3>
                  <p style={{ marginBottom: '1rem', opacity: 0.9, fontSize: '0.95rem' }}>
                    Enter the partner name and XML feed URL provided by your partner (e.g., Adecco, Randstad, Manpower).
                    The system will automatically import jobs from the XML feed.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Partner Name *</label>
                      <input
                        type="text"
                        value={xmlParams.partnerName}
                        onChange={(e) => setXmlParams({ ...xmlParams, partnerName: e.target.value })}
                        placeholder="e.g., Adecco, Randstad, Manpower..."
                        style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: 'var(--radius-md)', color: '#1a1a1a' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>XML Feed URL *</label>
                      <input
                        type="url"
                        value={xmlParams.feedUrl}
                        onChange={(e) => setXmlParams({ ...xmlParams, feedUrl: e.target.value })}
                        placeholder="https://api.partner.it/jobs.xml"
                        style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: 'var(--radius-md)', color: '#1a1a1a' }}
                      />
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                  }}>
                    <strong>📋 Expected XML Format:</strong>
                    <pre style={{ marginTop: '0.5rem', fontSize: '0.8rem', overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
{`<source>
  <job>
    <title>Job Title</title>
    <referencenumber>REF-12345</referencenumber>
    <url>https://...</url>
    <company>Company Name</company>
    <description>Job description...</description>
    <city>Milan</city>
    <salary>€35,000 - €40,000</salary>
  </job>
</source>`}
                    </pre>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!xmlParams.feedUrl) {
                          alert('Please enter XML feed URL to test');
                          return;
                        }
                        setTestingXML(true);
                        try {
                          const token = localStorage.getItem('token');
                          const response = await fetch('/api/admin/job-sources/test-xml', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              feedUrl: xmlParams.feedUrl,
                              useScrapingBee: formData.scrapingConfig?.useScrapingBee || false,
                              scrapingBeeOptions: formData.scrapingConfig?.scrapingBeeOptions,
                            }),
                          });

                          const data = await response.json();

                          if (!response.ok) {
                            showToast(data.message || data.error || 'Failed to test XML feed', 'error');
                            return;
                          }

                          if (data.count === 0) {
                            showToast('XML feed parsed successfully but no jobs found. Check the feed URL.', 'warning');
                          } else {
                            showToast(`✅ Success! Found ${data.count} job(s) in the feed.`, 'success');
                          }
                        } catch (err) {
                          showToast('Network error. Please try again.', 'error');
                        } finally {
                          setTestingXML(false);
                        }
                      }}
                      disabled={testingXML}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        cursor: testingXML ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        opacity: testingXML ? 0.6 : 1,
                      }}
                    >
                      <i className={`fas ${testingXML ? 'fa-spinner fa-spin' : 'fa-vial'}`} style={{ marginRight: '0.5rem' }}></i>
                      {testingXML ? 'Testing...' : 'Test Feed'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!xmlParams.partnerName || !xmlParams.feedUrl) {
                          alert('Please enter both partner name and XML feed URL');
                          return;
                        }
                        setFormData({
                          ...formData,
                          name: `${xmlParams.partnerName} XML Feed`,
                          url: xmlParams.feedUrl,
                          type: 'xml',
                        });
                        setShowXMLHelper(false);
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'white',
                        color: '#f59e0b',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      <i className="fas fa-sync" style={{ marginRight: '0.5rem' }}></i>
                      Configure XML Feed
                    </button>
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>URL *</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                    placeholder={formData.type === 'xml' ? 'https://example.com/jobs.rss or https://example.com/feed.xml' : 'https://example.com/jobs'}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  />
                  {formData.type === 'xml' && (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      💡 Tip: RSS feeds work best! Look for URLs ending in .rss, /rss, /feed, or .xml. Many job boards provide RSS feeds.
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="scraping">Scraping</option>
                    <option value="xml">XML Feed</option>
                    <option value="api">API</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Scrape Interval (minutes)</label>
                  <input
                    type="number"
                    value={formData.scrapeInterval}
                    onChange={(e) => setFormData({ ...formData, scrapeInterval: parseInt(e.target.value) || 60 })}
                    min="5"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.75rem' }}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <label htmlFor="isActive" style={{ fontWeight: '600', cursor: 'pointer' }}>Active</label>
                </div>
              </div>

              <details style={{ marginBottom: '1rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: '600', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  Scraping Configuration (Optional)
                </summary>
                <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Job Item Selector</label>
                    <input
                      type="text"
                      value={formData.scrapingConfig.jobItemSelector || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        scrapingConfig: { ...formData.scrapingConfig, jobItemSelector: e.target.value }
                      })}
                      placeholder="e.g., .job-item, article"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Title Selector</label>
                    <input
                      type="text"
                      value={formData.scrapingConfig.titleSelector || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        scrapingConfig: { ...formData.scrapingConfig, titleSelector: e.target.value }
                      })}
                      placeholder="e.g., h2, .title"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Description Selector</label>
                    <input
                      type="text"
                      value={formData.scrapingConfig.descriptionSelector || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        scrapingConfig: { ...formData.scrapingConfig, descriptionSelector: e.target.value }
                      })}
                      placeholder="e.g., .description, p"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Location Selector</label>
                    <input
                      type="text"
                      value={formData.scrapingConfig.locationSelector || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        scrapingConfig: { ...formData.scrapingConfig, locationSelector: e.target.value }
                      })}
                      placeholder="e.g., .location"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Link Selector</label>
                    <input
                      type="text"
                      value={formData.scrapingConfig.linkSelector || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        scrapingConfig: { ...formData.scrapingConfig, linkSelector: e.target.value }
                      })}
                      placeholder="e.g., a"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.75rem' }}>
                    <input
                      type="checkbox"
                      id="usePuppeteer"
                      checked={formData.scrapingConfig.usePuppeteer}
                      onChange={(e) => setFormData({
                        ...formData,
                        scrapingConfig: { ...formData.scrapingConfig, usePuppeteer: e.target.checked }
                      })}
                    />
                    <label htmlFor="usePuppeteer" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Use Puppeteer (for dynamic content)</label>
                  </div>
                  
                  <div style={{ 
                    marginTop: '1.5rem', 
                    padding: '1rem', 
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: 'var(--radius-md)',
                    color: 'white',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <input
                        type="checkbox"
                        id="useScrapingBee"
                        checked={formData.scrapingConfig.useScrapingBee || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          scrapingConfig: { 
                            ...formData.scrapingConfig, 
                            useScrapingBee: e.target.checked,
                            // Disable Puppeteer if ScrapingBee is enabled
                            usePuppeteer: e.target.checked ? false : formData.scrapingConfig.usePuppeteer,
                          }
                        })}
                      />
                      <label htmlFor="useScrapingBee" style={{ fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600' }}>
                        Use ScrapingBee (bypasses Cloudflare, handles proxies)
                      </label>
                    </div>
                    <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                      ScrapingBee handles bot detection and Cloudflare protection automatically. 
                      Requires SCRAPINGBEE_API_KEY in environment variables. 
                      <a href="https://www.scrapingbee.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>
                        Get API key →
                      </a>
                    </p>
                    
                    {formData.scrapingConfig.useScrapingBee && (
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.2)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>Render JavaScript</label>
                          <input
                            type="checkbox"
                            checked={formData.scrapingConfig.scrapingBeeOptions?.renderJs !== false}
                            onChange={(e) => setFormData({
                              ...formData,
                              scrapingConfig: {
                                ...formData.scrapingConfig,
                                scrapingBeeOptions: {
                                  ...formData.scrapingConfig.scrapingBeeOptions,
                                  renderJs: e.target.checked,
                                }
                              }
                            })}
                            style={{ marginRight: '0.5rem' }}
                          />
                          <span style={{ fontSize: '0.75rem' }}>Enable (for dynamic content like LinkedIn, Jooble)</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>Country Code (optional)</label>
                            <input
                              type="text"
                              value={formData.scrapingConfig.scrapingBeeOptions?.countryCode || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                scrapingConfig: {
                                  ...formData.scrapingConfig,
                                  scrapingBeeOptions: {
                                    ...formData.scrapingConfig.scrapingBeeOptions,
                                    countryCode: e.target.value,
                                  }
                                }
                              })}
                              placeholder="e.g., us, gb, ca"
                              style={{ width: '100%', padding: '0.5rem', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '0.75rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>Wait Time (ms)</label>
                            <input
                              type="number"
                              value={formData.scrapingConfig.scrapingBeeOptions?.wait || 2000}
                              onChange={(e) => setFormData({
                                ...formData,
                                scrapingConfig: {
                                  ...formData.scrapingConfig,
                                  scrapingBeeOptions: {
                                    ...formData.scrapingConfig.scrapingBeeOptions,
                                    wait: parseInt(e.target.value) || 2000,
                                  }
                                }
                              })}
                              min="0"
                              style={{ width: '100%', padding: '0.5rem', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '0.75rem' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </details>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-submit" style={{ padding: '0.75rem 2rem', marginTop: 0 }}>
                  {editingSource ? 'Update' : 'Create'} Source
                </button>
                <button
                  type="button"
                  onClick={() => {
                setShowForm(false);
                setEditingSource(null);
                resetForm();
              }}
              style={{ padding: '0.75rem 2rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )}

        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>URL</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Type</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Interval</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Last Scraped</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No job sources found. Click "Add Source" to create one.
                  </td>
                </tr>
              ) : (
                sources.map((source) => (
                  <tr key={source._id} style={{ borderTop: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '1rem' }}>{source.name}</td>
                    <td style={{ padding: '1rem' }}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                        {source.url.length > 50 ? source.url.substring(0, 50) + '...' : source.url}
                      </a>
                    </td>
                    <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{source.type}</td>
                    <td style={{ padding: '1rem' }}>{source.scrapeInterval} min</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: source.isActive ? 'var(--success)' : 'var(--error)',
                        color: 'white',
                      }}>
                        {source.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {source.lastScrapedAt ? new Date(source.lastScrapedAt).toLocaleString() : 'Never'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleScrape(source._id)}
                          disabled={scraping === source._id}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: scraping === source._id ? 'not-allowed' : 'pointer',
                            opacity: scraping === source._id ? 0.6 : 1,
                            fontSize: '0.875rem',
                          }}
                        >
                          {scraping === source._id ? 'Scraping...' : 'Scrape'}
                        </button>
                        <button
                          onClick={() => handleEdit(source)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(source._id)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--error)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          Delete
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
    </>
  );
}

