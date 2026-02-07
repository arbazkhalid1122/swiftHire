'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Link from 'next/link';

export default function CompaniesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cvType, setCvType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filterCandidatesByCategory = (category: string) => {
    setSelectedCategory(category);
  };

  const filterByCV = (type: string) => {
    setCvType(type);
  };

  // Mock candidate data - you would replace this with real data
  const candidates = [
    { id: 1, name: 'Mario Rossi', category: 'it-tech', hasVideoCV: true },
    { id: 2, name: 'Luigi Bianchi', category: 'marketing', hasVideoCV: false },
    { id: 3, name: 'Anna Verdi', category: 'design', hasVideoCV: true },
  ];

  return (
    <>
      <Header />
      <div className="main-container">
        {/* Filter Overlay for Mobile */}
        <div 
          className={`filters-overlay ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(false)}
        ></div>

        <div className="jobs-layout">
          {/* FILTRI CATEGORIE A SINISTRA */}
          <div className={`filters filters-sidebar ${showFilters ? 'mobile-open' : ''}`}>
            <div className="filters-header-mobile">
              <h3>
                <i className="fas fa-users"></i> CATEGORIE
              </h3>
              <button 
                className="mobile-filters-close"
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <h3 style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-users"></i> CATEGORIE CANDIDATI
            </h3>
            
            {/* Categorie Lavorative */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>💼 CATEGORIA</label>
              <div className="filter-tags-vertical">
                <span
                  className={`filter-tag-sidebar ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => filterCandidatesByCategory('all')}
                >
                  Tutti i Candidati
                </span>
                <span
                  className={`filter-tag-sidebar ${selectedCategory === 'it-tech' ? 'active' : ''}`}
                  onClick={() => filterCandidatesByCategory('it-tech')}
                >
                  IT & Tech
                </span>
                <span
                  className={`filter-tag-sidebar ${selectedCategory === 'marketing' ? 'active' : ''}`}
                  onClick={() => filterCandidatesByCategory('marketing')}
                >
                  Marketing
                </span>
                <span
                  className={`filter-tag-sidebar ${selectedCategory === 'design' ? 'active' : ''}`}
                  onClick={() => filterCandidatesByCategory('design')}
                >
                  Design
                </span>
                <span
                  className={`filter-tag-sidebar ${selectedCategory === 'finance' ? 'active' : ''}`}
                  onClick={() => filterCandidatesByCategory('finance')}
                >
                  Finance
                </span>
                <span
                  className={`filter-tag-sidebar ${selectedCategory === 'sales' ? 'active' : ''}`}
                  onClick={() => filterCandidatesByCategory('sales')}
                >
                  Sales
                </span>
                <span
                  className={`filter-tag-sidebar ${selectedCategory === 'hr' ? 'active' : ''}`}
                  onClick={() => filterCandidatesByCategory('hr')}
                >
                  HR & Recruiting
                </span>
                <span
                  className={`filter-tag-sidebar ${selectedCategory === 'operations' ? 'active' : ''}`}
                  onClick={() => filterCandidatesByCategory('operations')}
                >
                  Operations
                </span>
              </div>
            </div>

            {/* Tipo CV */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>📄 TIPO CV</label>
              <div className="filter-tags-vertical">
                <span
                  className={`filter-tag-sidebar ${cvType === 'all' ? 'active' : ''}`}
                  onClick={() => filterByCV('all')}
                >
                  Tutti
                </span>
                <span
                  className={`filter-tag-sidebar ${cvType === 'video' ? 'active' : ''}`}
                  onClick={() => filterByCV('video')}
                >
                  Solo Video CV
                </span>
                <span
                  className={`filter-tag-sidebar ${cvType === 'standard' ? 'active' : ''}`}
                  onClick={() => filterByCV('standard')}
                >
                  Solo CV Tradizionale
                </span>
              </div>
            </div>
          </div>

          {/* RISULTATI A DESTRA */}
          <div className="jobs-results">
            <div className="jobs-results-header">
              <div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0', fontWeight: '700' }}>👥 Candidati Disponibili</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>{candidates.length} candidati trovati</p>
              </div>
              <button 
                className="mobile-filters-toggle"
                onClick={() => setShowFilters(!showFilters)}
                aria-label="Toggle filters"
              >
                <i className="fas fa-filter"></i> Filtri
              </button>
            </div>

            <div className="jobs-grid">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="job-card">
                  <div className="job-card-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="avatar-circle" style={{ 
                        background: `linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)`,
                        width: '60px', 
                        height: '60px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'white', 
                        fontWeight: '700',
                        fontSize: '1.5rem',
                        boxShadow: 'var(--shadow-md)'
                      }}>
                        {candidate.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="job-title" style={{ marginBottom: '0.25rem' }}>{candidate.name}</h3>
                        <p className="job-company">Categoria: {candidate.category}</p>
                      </div>
                    </div>
                    {candidate.hasVideoCV && (
                      <span className="job-tag" style={{ marginBottom: '1rem', display: 'inline-block' }}>
                        <i className="fas fa-video"></i> Video CV Disponibile
                      </span>
                    )}
                    <Link href={`/candidates/${candidate.id}`} className="btn-submit" style={{ marginTop: '0.75rem', textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                      <i className="fas fa-user" style={{ marginRight: '0.5rem' }}></i>
                      Visualizza Profilo
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
