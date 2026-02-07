'use client';

import { useParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { getJobById } from '../../data/jobs';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = Number(params.id);
  const job = getJobById(jobId);

  if (!job) {
    return (
      <>
        <Header />
        <div className="main-container" style={{ display: 'block' }}>
          <p>Lavoro non trovato</p>
        </div>
      </>
    );
  }

  const handleApply = () => {
    alert('Candidatura inviata! Ti contatteremo presto.');
  };

  const handleSave = () => {
    alert('Offerta salvata nei preferiti!');
  };

  return (
    <>
      <Header />
      <div className="main-container" style={{ display: 'block' }}>
        <div className="job-detail-container">
          <a href="#" className="back-button" onClick={(e) => { e.preventDefault(); router.push('/jobs'); }}>
            <i className="fas fa-arrow-left"></i> Torna alle offerte
          </a>

          <div className="job-detail-header">
            <div className="job-detail-header-content">
              <div className="job-detail-company">
                <div className="job-detail-logo">{job.logo}</div>
                <div className="job-detail-company-info">
                  <h1>{job.title}</h1>
                  <p>{job.company}</p>
                </div>
              </div>

              <div className="job-detail-tags">
                <div className="job-detail-tag">
                  <i className="fas fa-map-marker-alt"></i>
                  {job.location}
                </div>
                <div className="job-detail-tag">
                  <i className="fas fa-briefcase"></i>
                  {job.contract}
                </div>
                <div className="job-detail-tag">
                  <i className="fas fa-euro-sign"></i>
                  {job.salary}
                </div>
                <div className="job-detail-tag">
                  <i className="fas fa-graduation-cap"></i>
                  {job.experience}
                </div>
              </div>

              <div className="job-detail-actions">
                <button className="btn-apply" onClick={handleApply}>
                  <i className="fas fa-paper-plane"></i> Candidati Ora
                </button>
                <button className="btn-save" onClick={handleSave}>
                  <i className="fas fa-bookmark"></i> Salva Offerta
                </button>
              </div>
            </div>
          </div>

          <div className="job-detail-body">
            <div className="job-detail-main">
              <div className="section-title">
                <i className="fas fa-file-alt"></i> Descrizione Posizione
              </div>
              <div className="job-description" dangerouslySetInnerHTML={{ __html: job.description }} />

              <div className="section-title">
                <i className="fas fa-check-circle"></i> Requisiti Richiesti
              </div>
              <ul className="requirements-list">
                {job.requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>

              <div className="section-title">
                <i className="fas fa-gift"></i> Cosa Offriamo
              </div>
              <ul className="benefits-list">
                {job.benefits.map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>

              <div className="section-title">
                <i className="fas fa-building"></i> L'Azienda
              </div>
              <div className="job-description">
                <p>{job.companyDescription}</p>
              </div>
            </div>

            <div className="job-detail-sidebar">
              <div className="sidebar-card">
                <h3><i className="fas fa-info-circle"></i> Dettagli Offerta</h3>
                <div className="sidebar-info-item">
                  <div className="sidebar-info-icon">
                    <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div className="sidebar-info-text">
                    <label>Località</label>
                    <span>{job.location}</span>
                  </div>
                </div>
                <div className="sidebar-info-item">
                  <div className="sidebar-info-icon">
                    <i className="fas fa-briefcase"></i>
                  </div>
                  <div className="sidebar-info-text">
                    <label>Tipo Contratto</label>
                    <span>{job.contract}</span>
                  </div>
                </div>
                <div className="sidebar-info-item">
                  <div className="sidebar-info-icon">
                    <i className="fas fa-euro-sign"></i>
                  </div>
                  <div className="sidebar-info-text">
                    <label>Retribuzione</label>
                    <span>{job.salary}</span>
                  </div>
                </div>
                <div className="sidebar-info-item">
                  <div className="sidebar-info-icon">
                    <i className="fas fa-graduation-cap"></i>
                  </div>
                  <div className="sidebar-info-text">
                    <label>Esperienza</label>
                    <span>{job.experience}</span>
                  </div>
                </div>
                <div className="sidebar-info-item">
                  <div className="sidebar-info-icon">
                    <i className="fas fa-calendar-alt"></i>
                  </div>
                  <div className="sidebar-info-text">
                    <label>Data Pubblicazione</label>
                    <span>{job.date}</span>
                  </div>
                </div>
              </div>

              <div className="sidebar-card">
                <h3><i className="fas fa-share-alt"></i> Condividi Offerta</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="btn-share" onClick={() => alert('Link copiato negli appunti!')} style={{ flex: '1' }}>
                    <i className="fas fa-link"></i> Copia Link
                  </button>
                  <button className="btn-share" onClick={() => alert('Condiviso su LinkedIn!')} style={{ flex: '1' }}>
                    <i className="fab fa-linkedin"></i> LinkedIn
                  </button>
                </div>
              </div>

              <div className="sidebar-card">
                <button className="btn-apply" style={{ width: '100%', justifyContent: 'center' }} onClick={handleApply}>
                  <i className="fas fa-paper-plane"></i> Candidati Ora
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

