'use client';

import { useEffect, useState } from 'react';

interface Contestant {
  _id: string;
  name: string;
  age: number;
  parentName: string;
  bio: string;
  imageUrl: string;
  votes: number;
}

export default function VotePage() {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [selectedContestant, setSelectedContestant] = useState('');
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

  const handleVote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedContestant) {
      setStatus('Select a contestant first.');
      return;
    }

    setStatus('Recording vote...');

    try {
      const response = await fetch(`${apiBaseUrl}/api/payments/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contestantId: selectedContestant,
          amount: voteCount * Number(process.env.NEXT_PUBLIC_VOTE_FEE_NAIRA || '100'),
          votes: voteCount,
          method: 'Flutterwave',
          reference: `vote-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Vote failed');
      }

      setStatus('Vote recorded! Thank you for supporting your favorite contestant.');
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
          Select contestant
          <select value={selectedContestant} onChange={(event) => setSelectedContestant(event.target.value)} required>
            <option value="">Select...</option>
            {contestants.map((contestant) => (
              <option key={contestant._id} value={contestant._id}>
                {contestant.name} ({contestant.votes} votes)
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

        <button type="submit" style={{ padding: '0.75rem 1.25rem' }}>
          Pay and vote
        </button>
      </form>

      {status && <p>{status}</p>}
    </main>
  );
}
