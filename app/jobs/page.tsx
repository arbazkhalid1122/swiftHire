'use client';

import { useState } from 'react';
import Header from '../components/Header';
import JobCard from '../components/JobCard';
import { getAllJobs } from '../data/jobs';

export default function JobsPage() {
  const [distanceEnabled, setDistanceEnabled] = useState(true);
  const [distance, setDistance] = useState(50);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedExperience, setSelectedExperience] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const allJobs = getAllJobs();

  const toggleDistance = () => {
    setDistanceEnabled(!distanceEnabled);
  };

  const updateDistance = (value: string) => {
    setDistance(Number(value));
  };

  const filterCandidatesByCategory = (category: string) => {
    setSelectedCategory(category);
  };

  const applyFilters = () => {
    // Filter logic would go here
    alert('Filtri applicati!');
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedExperience('');
    setDistance(50);
    alert('Filtri cancellati!');
  };

  return (
    <>
      <Header />
      <div className="main-container">
        {/* DISTANCE FILTER AT TOP CENTER */}
        <div className="distance-filter-top">
          <div className="distance-header">
            <span className="distance-label">
              <label><i className="fas fa-map-marker-alt"></i>&nbsp; Filtro Distanza</label>
            </span>
            <div
              className={`distance-toggle ${distanceEnabled ? 'active' : ''}`}
              id="distanceToggle"
              onClick={toggleDistance}
            ></div>
          </div>
          {distanceEnabled && (
            <div className="distance-slider-container active" id="distanceSliderContainer">
              <div className="distance-value" id="distanceValue">{distance} km</div>
              <input
                type="range"
                min="0"
                max="100"
                value={distance}
                className="slider"
                id="distanceSlider"
                onChange={(e) => updateDistance(e.target.value)}
              />
              <div className="slider-range-labels">
                <span>0 km</span>
                <span>100 km</span>
              </div>
            </div>
          )}
        </div>

        {/* Filter Overlay for Mobile */}
        <div 
          className={`filters-overlay ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(false)}
        ></div>

        <div className="jobs-layout">
          {/* FILTRI A SINISTRA */}
          <div className={`filters filters-sidebar ${showFilters ? 'mobile-open' : ''}`}>
            <div className="filters-header-mobile">
              <h3>🔍 FILTRI RICERCA</h3>
              <button 
                className="mobile-filters-close"
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="filter-grid">
              <div className="filter-item">
                <label>📍 POSIZIONE</label>
                <input type="text" placeholder="Città, Regione..." />
              </div>
              
              <div className="filter-item">
                <label>💼 CATEGORIA</label>
                <select>
                  <option value="">Tutte le categorie</option>
                  <option>IT & Tech</option>
                  <option>Marketing</option>
                  <option>Design</option>
                  <option>Finance</option>
                  <option>Sales</option>
                  <option>HR</option>
                  <option>Operations</option>
                </select>
              </div>
              
              <div className="filter-item">
                <label>💰 STIPENDIO</label>
                <select>
                  <option value="">Qualsiasi</option>
                  <option>20.000 - 30.000€</option>
                  <option>30.000 - 40.000€</option>
                  <option>40.000 - 50.000€</option>
                  <option>50.000 - 70.000€</option>
                  <option>70.000+€</option>
                </select>
              </div>
              
              <div className="filter-item">
                <label>⏱️ ESPERIENZA</label>
                <select value={selectedExperience} onChange={(e) => setSelectedExperience(e.target.value)}>
                  <option value="">Seleziona livello</option>
                  <option>Nessuna esperienza</option>
                  <option>Junior (0-2 anni)</option>
                  <option>Mid (3-5 anni)</option>
                  <option>Senior (5+ anni)</option>
                </select>
              </div>
            </div>

            <button className="btn-submit" onClick={applyFilters} style={{ margin: '0 0 10px 0', fontSize: '0.85rem', padding: '12px' }}>
              <i className="fas fa-search"></i> APPLICA FILTRI
            </button>
            <button className="btn-submit" onClick={clearFilters} style={{ margin: '0', background: '#333', fontSize: '0.85rem', padding: '12px' }}>
              <i className="fas fa-times"></i> CANCELLA FILTRI
            </button>
          </div>

          {/* RISULTATI A DESTRA */}
          <div className="jobs-results">
            <div className="jobs-results-header">
              <div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0', fontWeight: '700' }}>🔥 Risultati Ricerca</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>{allJobs.length} opportunità trovate</p>
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
              {allJobs.map((job) => (
                <JobCard key={job.id} {...job} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
