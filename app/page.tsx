'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from './components/Header';
import JobCard from './components/JobCard';
import { getAllJobs } from './data/jobs';

export default function Home() {
  const [searchTitle, setSearchTitle] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Iscrizione fallita. Riprova.');
        setIsSubmitting(false);
        return;
      }

      alert('Grazie per esserti iscritto! Riceverai le nostre migliori offerte a: ' + email);
      setEmail('');
    } catch (err) {
      alert('Errore di rete. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const featuredJobs = getAllJobs().slice(0, 6);

  return (
    <>
      <Header />
      <div className="main-container">
        {/* HERO SECTION */}
        <div className="hero-blue">
          <h1>Trova Lavoro in un Click</h1>
          
          {/* SEARCH BAR */}
          <div className="search-container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
              <div className="search-input-group">
                <i className="fas fa-briefcase"></i>
                <input
                  type="text"
                  placeholder="Titolo di lavoro"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                />
              </div>
              
              <div className="search-input-group">
                <i className="fas fa-map-marker-alt"></i>
                <input
                  type="text"
                  placeholder="Posizione"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                />
              </div>
              
              <div className="search-input-group">
                <i className="fas fa-list"></i>
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                >
                  <option value="">Categoria</option>
                  <option>IT & Tech</option>
                  <option>Marketing</option>
                  <option>Design</option>
                  <option>Finance</option>
                  <option>Sales</option>
                  <option>HR</option>
                  <option>Operations</option>
                </select>
              </div>
              
              <Link href="/jobs" className="search-button">
                <i className="fas fa-search"></i>
                Cerca lavoro
              </Link>
            </div>
          </div>
          
          {/* STATISTICS */}
          <div className="hero-stats">
            <div className="stat-box">
              <h2>12.450</h2>
              <p>Freelancer Online</p>
            </div>
            <div className="stat-box" style={{ animationDelay: '0.3s' }}>
              <h2>24.338</h2>
              <p>Lavori Pubblicati</p>
            </div>
            <div className="stat-box" style={{ animationDelay: '0.4s' }}>
              <h2>8.120</h2>
              <p>Aziende Verificate</p>
            </div>
          </div>
        </div>

        {/* FEATURED JOBS */}
        <div className="card">
          <h2>
            <span style={{ marginRight: '0.5rem' }}>🔥</span>
            Offerte in Evidenza
          </h2>
          <div className="jobs-grid">
            {featuredJobs.map((job) => (
              <JobCard key={job.id} {...job} />
            ))}
          </div>
        </div>

        {/* NEWSLETTER */}
        <div className="newsletter">
          <h2>
            <i className="fas fa-envelope" style={{ marginRight: '0.5rem' }}></i>
            Resta Aggiornato
          </h2>
          <p>Ricevi le migliori offerte di lavoro direttamente nella tua inbox</p>
          <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
            <input
              type="email"
              placeholder="La tua email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loading-spinner"></span>
                  Invio...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane" style={{ marginRight: '0.5rem' }}></i>
                  Iscriviti
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
