'use client';

import { useParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id;

  const handleContact = () => {
    alert('Messaggio inviato al candidato!');
  };

  const handleViewVideoCV = () => {
    alert('Apertura Video CV...');
  };

  const handleDownloadCV = () => {
    alert('Download CV avviato...');
  };

  return (
    <>
      <Header />
      <div className="main-container" style={{ display: 'block' }}>
        <a href="#" className="back-button" onClick={(e) => { e.preventDefault(); router.push('/companies'); }}>
          <i className="fas fa-arrow-left"></i> Torna ai candidati
        </a>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#800000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>
              C
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '10px' }}>Nome Candidato</h1>
              <p style={{ color: '#999', fontSize: '1.1rem' }}>Categoria: IT & Tech</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
            <button className="btn-apply" onClick={handleContact}>
              <i className="fas fa-envelope"></i> Contatta Candidato
            </button>
            <button className="btn-save" onClick={handleViewVideoCV}>
              <i className="fas fa-video"></i> Visualizza Video CV
            </button>
            <button className="btn-save" onClick={handleDownloadCV}>
              <i className="fas fa-download"></i> Scarica CV
            </button>
          </div>

          <div className="section-title">
            <i className="fas fa-user"></i> Profilo Professionale
          </div>
          <div className="job-description">
            <p>Descrizione del candidato e delle sue competenze professionali...</p>
          </div>

          <div className="section-title">
            <i className="fas fa-briefcase"></i> Esperienza
          </div>
          <div className="job-description">
            <p>Dettagli dell'esperienza lavorativa del candidato...</p>
          </div>

          <div className="section-title">
            <i className="fas fa-graduation-cap"></i> Formazione
          </div>
          <div className="job-description">
            <p>Dettagli della formazione del candidato...</p>
          </div>
        </div>
      </div>
    </>
  );
}

