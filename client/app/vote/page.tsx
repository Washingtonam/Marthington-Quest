'use client';

import { useEffect, useState } from 'react';
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

export default function VotePage() {
  const searchParams = useSearchParams();
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [selectedContestant, setSelectedContestant] = useState('');
  const [supporterEmail, setSupporterEmail] = useState('');
  const [voteCount, setVoteCount] = useState(1);
  const [status, setStatus] = useState('');
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    async function loadContestants() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/contestants`);
        const result = await response.json();
        setContestants(result);
      } catch (error) {
        setStatus('Unable to load contestants');
      }
    }

    loadContestants();
  }, [apiBaseUrl]);

  useEffect(() => {
    const contestantId = searchParams?.get('contestantId');
    if (contestantId) {
      setSelectedContestant(contestantId);
    }
  }, [searchParams]);

  const handleVote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedContestant) {
      setStatus('Select a contestant first.');
      return;
    }

    setStatus('Recording vote...');

    try {
      // initialize a Flutterwave payment and redirect to the payment link
      const amountValue = voteCount * Number(process.env.NEXT_PUBLIC_VOTE_FEE_NAIRA || '100');
      const initRes = await fetch(`${apiBaseUrl}/api/payments/flutterwave/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountValue,
          currency: 'NGN',
          customer_email: supporterEmail,
          payment_type: 'vote',
          meta: { contestantId: selectedContestant, votes: voteCount },
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.link) {
        throw new Error(initData.message || 'Failed to initialize payment');
      }

      // Redirect user to Flutterwave payment page
      window.location.href = initData.link;
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Vote for a Baby</h1>
      <p>Pick a contestant, choose how many votes to purchase, and submit your support.</p>

      <form onSubmit={handleVote} style={{ display: 'grid', gap: '1rem', maxWidth: 560 }}>
        <label>
          Supporter email
          <input
            type="email"
            value={supporterEmail}
            onChange={(event) => setSupporterEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Select contestant
          <select value={selectedContestant} onChange={(event) => setSelectedContestant(event.target.value)} required>
            <option value="">Select...</option>
            {contestants.map((contestant) => (
              <option key={contestant._id} value={contestant._id}>
                {contestant.photoTitle || `${contestant.firstName} ${contestant.lastName}`} ({contestant.votes} votes)
              </option>
            ))}
          </select>
        </label>

        <label>
          Number of votes
          <input
            type="number"
            min="1"
            value={voteCount}
            onChange={(event) => setVoteCount(Number(event.target.value))}
            required
          />
        </label>

        <p className="muted">Each vote costs ₦{process.env.NEXT_PUBLIC_VOTE_FEE_NAIRA || '100'}.</p>

        <button type="submit" style={{ padding: '0.75rem 1.25rem' }}>
          Pay and vote
        </button>
      </form>

      {status && <p>{status}</p>}
    </main>
  );
}
