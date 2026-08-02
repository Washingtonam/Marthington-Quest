'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Contestant {
  _id: string;
  firstName: string;
  lastName: string;
  ageLabel: string;
  nickname: string;
  photoTitle: string;
  imageUrl: string;
  votes: number;
}

function VotePageContent() {
  const searchParams = useSearchParams();
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [selectedContestant, setSelectedContestant] = useState('');
  const [supporterEmail, setSupporterEmail] = useState('');
  const [voteCount, setVoteCount] = useState(1);
  const [status, setStatus] = useState('');
  const [voteFee, setVoteFee] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    async function loadContestants() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/contestants`, { cache: 'no-store' });
        const result = await response.json();
        setContestants(result || []);
        // fetch public settings for fees
        try {
          const s = await fetch(`${apiBaseUrl}/api/settings`);
          if (s.ok) {
            const sd = await s.json();
            setVoteFee(Number(sd.voteFee ?? process.env.NEXT_PUBLIC_VOTE_FEE_NAIRA ?? 100));
          }
        } catch (e) {
          // ignore
        }
      } catch (error) {
        setStatus('Unable to load contestants');
      }
    }

    loadContestants();
    const t = setInterval(loadContestants, 15000);
    return () => clearInterval(t);
  }, [apiBaseUrl]);

  useEffect(() => {
    const contestantId = searchParams?.get('contestantId');
    if (contestantId) {
      setSelectedContestant(contestantId);
    }
  }, [searchParams]);

  const filtered = contestants.filter((c) => {
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    return (
      (!query || name.includes(query.toLowerCase()) || (c.photoTitle || '').toLowerCase().includes(query.toLowerCase()))
    );
  });

  const handleVote = async (e: any) => {
    e.preventDefault();
    if (!selectedContestant) return setStatus('Please select a contestant');
    if (!supporterEmail) return setStatus('Please enter your email to continue');

    const fee = voteFee ?? Number(process.env.NEXT_PUBLIC_VOTE_FEE_NAIRA || 100);
    const amount = Number(voteCount) * Number(fee);

    setStatus('Initializing payment...');

    try {
      const payload = {
        amount,
        currency: 'NGN',
        customer_email: supporterEmail,
        payment_type: 'vote',
        meta: { contestantId: selectedContestant, votes: Number(voteCount) },
      };

      const initRes = await fetch(`${apiBaseUrl}/api/payments/flutterwave/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        throw new Error(initData.message || 'Failed to initialize payment');
      }

      if (!initData.link) throw new Error('Payment link not returned');

      setStatus('Redirecting to payment...');
      window.location.href = initData.link;
    } catch (err) {
      setStatus(`Payment initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Vote for your favorite</p>
          <h1>Support a contestant</h1>
          <p className="muted">Browse contestants, search by name, and purchase votes securely.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or title" style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 12, border: '1px solid #e6e6e6' }} />
          <div className="muted">Each vote: ₦{voteFee ?? process.env.NEXT_PUBLIC_VOTE_FEE_NAIRA ?? '100'}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {filtered.map((c) => (
            <article key={c._id} className="card" style={{ cursor: 'pointer' }} onClick={() => setSelectedContestant(c._id)}>
              <img src={c.imageUrl} alt={c.photoTitle || `${c.firstName} ${c.lastName}`} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12 }} />
              <div style={{ paddingTop: '0.5rem' }}>
                <strong>{c.photoTitle || `${c.firstName} ${c.lastName}`}</strong>
                <div className="muted">{c.votes} votes</div>
              </div>
            </article>
          ))}
        </div>

        <div className="card form-card" style={{ maxWidth: 680 }}>
          <h3>Vote</h3>
          <p className="muted">Select a contestant from above to begin. Or paste a share URL.</p>
          <form onSubmit={handleVote} className="input-grid">
            <label className="field">
              Supporter email
              <input type="email" value={supporterEmail} onChange={(e) => setSupporterEmail(e.target.value)} placeholder="you@example.com" required />
            </label>

            <label className="field">
              Selected contestant
              <select value={selectedContestant} onChange={(e) => setSelectedContestant(e.target.value)} required>
                <option value="">Select...</option>
                {contestants.map((contestant) => (
                  <option key={contestant._id} value={contestant._id}>
                    {contestant.photoTitle || `${contestant.firstName} ${contestant.lastName}`} ({contestant.votes} votes)
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              Number of votes
              <input type="number" min="1" value={voteCount} onChange={(e) => setVoteCount(Number(e.target.value))} required />
            </label>

            <div className="form-actions">
              <button type="submit" className="btn-primary">Pay and vote</button>
            </div>
          </form>
          {status && <p className="status-message">{status}</p>}
        </div>
      </div>
    </main>
  );
}


export default function VotePage() {
  return (
    <Suspense fallback={<main className="page-shell"><p>Loading vote page…</p></main>}>
      <VotePageContent />
    </Suspense>
  );
}
