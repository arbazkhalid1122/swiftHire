'use client';

import Link from 'next/link';

interface JobCardProps {
  id: number;
  title: string;
  company: string;
  logo: string;
  location: string;
  contract: string;
  salary?: string;
  distance?: number;
  tags?: string[];
}

export default function JobCard({ id, title, company, logo, location, contract, salary, distance, tags }: JobCardProps) {
  return (
    <Link href={`/jobs/${id}`} className="job-card" data-distance={distance}>
      <div className="job-card-header">
        <div className="company-logo">
          {logo}
        </div>
      </div>
      <div className="job-card-body">
        <h3 className="job-title">{title}</h3>
        <p className="job-company">{company}</p>
        <div className="job-details">
          <span className="job-tag">
            <i className="fas fa-map-marker-alt"></i> {location}
          </span>
          <span className="job-tag">
            <i className="fas fa-briefcase"></i> {contract}
          </span>
        </div>
        {tags && tags.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="job-tag" style={{ fontSize: '0.7rem' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {salary && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <p style={{ 
              color: 'var(--primary)', 
              fontSize: '1rem', 
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fas fa-euro-sign"></i> {salary}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
