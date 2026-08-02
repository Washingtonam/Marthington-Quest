"use client";

import { useState } from 'react';

export default function VoteForm({ contestantId, initialFee }: { contestantId: string; initialFee?: number }) {
  const [email, setEmail] = useState('');
  const [count, setCount] = useState(1);
  const [status, setStatus] = useState('');
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleVote = async (e: any) => {
    e.preventDefault();
    if (!email) return setStatus('Enter your email');
    const fee = initialFee ?? Number(process.env.NEXT_PUBLIC_VOTE_FEE_NAIRA || 100);
    const amount = Number(count) * fee;

    if (amount === 0) {
      setStatus('Recording free vote...');
      try {
        const res = await fetch(`${apiBaseUrl}/api/payments/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contestantId,
            amount: 0,
            votes: Number(count),
            method: 'free',
            reference: `free_${Date.now()}`,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to record vote');

        setStatus('Vote recorded successfully. Thank you!');
        setCount(1);
      } catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
      return;
    }

    setStatus('Initializing payment...');

    try {
      const res = await fetch(`${apiBaseUrl}/api/payments/flutterwave/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'NGN',
          customer_email: email,
          payment_type: 'vote',
          meta: { contestantId, votes: Number(count) },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      if (!data.link) throw new Error('Payment link missing');
      setStatus('Redirecting to payment...');
      window.location.href = data.link;
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  return (
    <form onSubmit={handleVote} className="input-grid">
      <label className="field">
        Your email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>

      <label className="field">
        Votes
        <input type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value))} required />
      </label>

      <div className="form-actions">
        <button type="submit" className="btn-primary">Pay & Vote</button>
      </div>

      {status && <p className="status-message">{status}</p>}
    </form>
  );
}
