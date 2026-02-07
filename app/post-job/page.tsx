'use client';

import { useState } from 'react';
import Header from '../components/Header';

export default function PostJobPage() {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    contract: '',
    salary: '',
    description: '',
    requirements: '',
    category: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Annuncio pubblicato con successo! Sarà visibile entro 24 ore.');
    setFormData({
      title: '',
      company: '',
      location: '',
      contract: '',
      salary: '',
      description: '',
      requirements: '',
      category: ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <>
      <Header />
      <div className="main-container" style={{ display: 'block' }}>
        <div className="card">
          <h2>📝 Pubblica un Annuncio di Lavoro</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div>
                <label>Titolo Posizione *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Es: Frontend Developer"
                />
              </div>
              <div>
                <label>Azienda *</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                  placeholder="Nome azienda"
                />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>Località *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  placeholder="Es: Milano, IT"
                />
              </div>
              <div>
                <label>Categoria *</label>
                <select name="category" value={formData.category} onChange={handleChange} required>
                  <option value="">Seleziona categoria</option>
                  <option>IT & Tech</option>
                  <option>Marketing</option>
                  <option>Design</option>
                  <option>Finance</option>
                  <option>Sales</option>
                  <option>HR</option>
                  <option>Operations</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>Tipo Contratto *</label>
                <select name="contract" value={formData.contract} onChange={handleChange} required>
                  <option value="">Seleziona tipo</option>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contratto a progetto</option>
                  <option>Stage</option>
                </select>
              </div>
              <div>
                <label>Retribuzione</label>
                <input
                  type="text"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  placeholder="Es: 40.000 - 55.000€"
                />
              </div>
            </div>

            <div>
              <label>Descrizione Posizione *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Descrivi la posizione, le responsabilità e le opportunità..."
                rows={8}
              />
            </div>

            <div>
              <label>Requisiti Richiesti *</label>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                required
                placeholder="Elenca i requisiti richiesti (uno per riga)..."
                rows={6}
              />
            </div>

            <button type="submit" className="btn-submit">
              <i className="fas fa-paper-plane"></i> Pubblica Annuncio
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

