'use client';

import { useEffect, useMemo, useState } from 'react';

interface Competition {
  title: string;
  slug: string;
  description: string;
  bannerImage: string;
  rules?: string;
  prizePool?: number;
  entryFee: number;
  voteFee: number;
  status: 'draft' | 'active' | 'closed';
  startDate?: string;
  endDate?: string;
}

interface Contestant {
  _id: string;
  firstName: string;
  lastName: string;
  photoTitle: string;
  imageUrl: string;
  votes: number;
  shareSlug: string;
}

export default function CompetitionPage({ params }: { params: { slug: string } }) {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    let active = true;
    async function loadCompetition() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/competitions/${encodeURIComponent(params.slug)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Competition not found');
        const result: Competition = await response.json();
        if (!active) return;
        setCompetition(result);

        const contestantResponse = await fetch(
          `${apiBaseUrl}/api/competitions/${encodeURIComponent(result.slug)}/contestants`,
          { cache: 'no-store' }
        );
        if (!contestantResponse.ok) throw new Error('Unable to load contestants');
        const entries: Contestant[] = await contestantResponse.json();
        if (active) setContestants(entries);
      } catch (requestError: unknown) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load competition');
      }
    }

    loadCompetition();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, params.slug]);

  useEffect(() => {
    if (!competition) return;
    let active = true;
    const refresh = window.setInterval(() => {
      fetch(`${apiBaseUrl}/api/competitions/${encodeURIComponent(competition.slug)}/contestants`, { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) throw new Error('Unable to refresh contestants');
          const entries: Contestant[] = await response.json();
          if (active) setContestants(entries);
        })
        .catch((requestError: unknown) => {
          if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to refresh contestants');
        });
    }, 15000);
    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, [apiBaseUrl, competition]);

  const filteredContestants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return contestants;
    return contestants.filter((contestant) =>
      `${contestant.firstName} ${contestant.lastName} ${contestant.photoTitle}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [contestants, query]);

  if (error) {
    return <main className="page-shell"><h1>{error}</h1></main>;
  }
  if (!competition) {
    return <main className="page-shell"><p>Loading competition...</p></main>;
  }

  const now = Date.now();
  const startsAt = competition.startDate ? new Date(competition.startDate).getTime() : null;
  const endsAt = competition.endDate ? new Date(competition.endDate).getTime() : null;
  const active =
    competition.status === 'active' &&
    (startsAt === null || startsAt <= now) &&
    (endsAt === null || endsAt >= now);

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Competition · {competition.status}</p>
          <h1>{competition.title}</h1>
          {competition.description && <p className="muted">{competition.description}</p>}
          <p className="muted">
            Entry fee: ₦{competition.entryFee} · Each vote: ₦{competition.voteFee}
            {competition.prizePool !== undefined && ` · Prize pool: ₦${competition.prizePool}`}
          </p>
          {(competition.startDate || competition.endDate) && (
            <p className="muted">
              {competition.startDate && `Starts ${new Date(competition.startDate).toLocaleDateString()}`}
              {competition.startDate && competition.endDate && ' · '}
              {competition.endDate && `Ends ${new Date(competition.endDate).toLocaleDateString()}`}
            </p>
          )}
        </div>
      </div>

      {competition.bannerImage && (
        <img
          className="photo-card-img"
          src={competition.bannerImage}
          alt={`${competition.title} banner`}
          style={{ maxHeight: 420, objectFit: 'cover', borderRadius: 16 }}
        />
      )}

      {competition.rules && (
        <section className="card">
          <h2>Competition rules</h2>
          <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{competition.rules}</p>
        </section>
      )}

      <div className="hero-cta" style={{ marginTop: 24 }}>
        {active && <a className="btn-primary" href={`/competitions/${encodeURIComponent(competition.slug)}/register`}>Enter this competition</a>}
        {!active && <span className="muted">This competition is not accepting new entries or votes.</span>}
      </div>

      <section className="page-shell" aria-label="Approved contestants">
        <div className="page-header">
          <div>
            <p className="eyebrow">Public gallery</p>
            <h2>Meet the contestants</h2>
          </div>
        </div>
        <label className="field">
          Search contestants
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or photo title" />
        </label>
        {filteredContestants.length === 0 ? (
          <p className="muted">{contestants.length === 0 ? 'No approved contestants are available yet.' : 'No contestants match your search.'}</p>
        ) : (
          <div className="masonry">
            {filteredContestants.map((contestant) => (
              <a
                className="card photo-card"
                key={contestant._id}
                href={`/competitions/${encodeURIComponent(competition.slug)}/vote/${encodeURIComponent(contestant.shareSlug)}`}
              >
                {contestant.imageUrl && (
                  <img className="photo-card-img" src={contestant.imageUrl} alt={contestant.photoTitle || `${contestant.firstName} ${contestant.lastName}`} />
                )}
                <div style={{ padding: '1rem' }}>
                  <h3>{contestant.photoTitle || `${contestant.firstName} ${contestant.lastName}`}</h3>
                  <p className="muted">{contestant.firstName} {contestant.lastName} · {contestant.votes} votes</p>
                  <span className="btn-primary">View and vote</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
