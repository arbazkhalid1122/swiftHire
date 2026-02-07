'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Link from 'next/link';

export default function CompaniesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cvType, setCvType] = useState('all');

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
      <div className="main-container" style={{ display: 'block' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' }}>
          {/* FILTRI CATEGORIE A SINISTRA */}
          <div className="filters" style={{ position: 'sticky', top: '100px' }}>
            <h3 style={{ color: 'var(--cyan)', fontSize: '0.9rem', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-users"></i> CATEGORIE CANDIDATI
            </h3>
            
            {/* Categorie Lavorative */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '10px' }}>💼 CATEGORIA</label>
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
              <label style={{ fontSize: '10px' }}>📄 TIPO CV</label>
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
          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
              <h2 style={{ color: 'var(--cyan)', fontSize: '1.2rem', margin: '0' }}>👥 Candidati Disponibili</h2>
              <p style={{ color: '#999', marginTop: '10px', fontSize: '0.9rem' }}>{candidates.length} candidati trovati</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
              {candidates.map((candidate) => (
                <div key={candidate.id} className="job-card" style={{ margin: '0' }}>
                  <div className="job-card-body">
                    <h3 className="job-title">{candidate.name}</h3>
                    <p className="job-company">Categoria: {candidate.category}</p>
                    {candidate.hasVideoCV && (
                      <span className="job-tag">
                        <i className="fas fa-video"></i> Video CV Disponibile
                      </span>
                    )}
                    <Link href={`/candidates/${candidate.id}`} className="btn-submit" style={{ marginTop: '10px', textAlign: 'center', display: 'block' }}>
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

