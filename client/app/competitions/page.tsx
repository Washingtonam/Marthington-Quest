'use client';

import { useEffect, useState } from 'react';

interface Competition {
  _id: string;
  title: string;
  slug: string;
  description: string;
  bannerImage: string;
  startDate?: string;
  endDate?: string;
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/competitions`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load competitions');
        setCompetitions(await response.json());
      })
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : 'Unable to load competitions');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [apiBaseUrl]);

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Explore</p>
          <h1>Competitions</h1>
          <p className="muted">Discover active competitions and meet their contestants.</p>
        </div>
      </div>

      {error && <p className="status-message">{error}</p>}
      {loading && <p className="muted">Loading active competitions...</p>}
      {!loading && !error && competitions.length === 0 && <p className="muted">No active competitions are available right now.</p>}

      <div className="masonry">
        {competitions.map((competition) => (
          <a
            className="card photo-card"
            key={competition._id}
            href={`/competitions/${encodeURIComponent(competition.slug)}`}
          >
            {competition.bannerImage && (
              <img className="photo-card-img" src={competition.bannerImage} alt={`${competition.title} banner`} />
            )}
            <div style={{ padding: '1rem' }}>
              <h2>{competition.title}</h2>
              <p className="muted">{competition.description}</p>
              <span className="btn-primary">View competition</span>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
