'use client';

import { useEffect, useState } from 'react';

interface Contestant {
  _id: string;
  firstName: string;
  lastName: string;
  ageLabel: string;
  nickname: string;
  whatsapp: string;
  photoTitle: string;
  photoDescription: string;
  category: string;
  imageUrl: string;
  votes: number;
  uploadAllowance: number;
  status: string;
  shareUrl: string;
}

interface Stats {
  totalContestants: number;
  pendingEntries: number;
  approvedEntries: number;
  totalVotes: number;
  totalRevenue: number;
  entryFee: number;
  voteFee: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<Contestant[]>([]);
  const [status, setStatus] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!adminToken) return;

    async function loadAdminData() {
      try {
        const [statsRes, pendingRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/admin/stats?adminToken=${adminToken}`),
          fetch(`${apiBaseUrl}/api/admin/contestants/pending?adminToken=${adminToken}`),
        ]);

        if (!statsRes.ok || !pendingRes.ok) {
          throw new Error('Failed to load admin data');
        }

        setStats(await statsRes.json());
        setPending(await pendingRes.json());
      } catch (error) {
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unable to load admin data'}`);
      }
    }

    loadAdminData();
  }, [adminToken, apiBaseUrl]);

  const handleApprove = async (id: string) => {
    if (!adminToken) {
      setStatus('Admin token required');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/contestants/${id}/approve?adminToken=${encodeURIComponent(adminToken)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Approval failed');
      }

      setPending((prev) => prev.filter((entry) => entry._id !== id));
      setStatus('Contestant approved successfully');
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unable to approve'}`);
    }
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Admin Dashboard</h1>
      <p>Manage contestant approvals, view stats, and tune entry/voting fees.</p>

      <label style={{ display: 'block', marginBottom: '1rem' }}>
        Admin token
        <input
          type="password"
          value={adminToken}
          onChange={(event) => setAdminToken(event.target.value)}
          style={{ display: 'block', marginTop: '0.5rem', width: '100%', maxWidth: 400 }}
        />
      </label>

      {stats ? (
        <div style={{ marginBottom: '2rem' }}>
          <h2>Platform stats</h2>
          <ul>
            <li>Total contestants: {stats.totalContestants}</li>
            <li>Pending entries: {stats.pendingEntries}</li>
            <li>Approved entries: {stats.approvedEntries}</li>
            <li>Total votes: {stats.totalVotes}</li>
            <li>Total revenue: ₦{stats.totalRevenue}</li>
            <li>Entry fee: ₦{stats.entryFee}</li>
            <li>Vote fee: ₦{stats.voteFee}</li>
          </ul>
        </div>
      ) : (
        <p>Enter the admin token to load dashboard data.</p>
      )}

      {pending.length > 0 && (
        <section>
          <h2>Pending submissions</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {pending.map((contestant) => (
              <article key={contestant._id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <img src={contestant.imageUrl} alt={contestant.photoTitle} style={{ width: 120, borderRadius: 12, objectFit: 'cover' }} />
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem' }}>{contestant.photoTitle || `${contestant.firstName} ${contestant.lastName}`}</h3>
                    <p style={{ margin: '0.25rem 0' }}>Category: {contestant.category}</p>
                    <p style={{ margin: '0.25rem 0' }}>Contestant: {contestant.firstName} {contestant.lastName}</p>
                    <p style={{ margin: '0.25rem 0' }}>Votes: {contestant.votes}</p>
                    <p style={{ margin: '0.25rem 0' }}>Upload allowance: {contestant.uploadAllowance}</p>
                  </div>
                </div>
                <p style={{ marginTop: '1rem' }}>{contestant.photoDescription}</p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => handleApprove(contestant._id)} style={{ background: '#6b21a8', color: '#fff', padding: '0.75rem 1rem', border: 'none', borderRadius: 999, cursor: 'pointer' }}>
                    Approve submission
                  </button>
                  <a href={contestant.shareUrl} target="_blank" rel="noreferrer" style={{ color: '#374151', textDecoration: 'underline' }}>
                    View share link
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {status && <p>{status}</p>}
    </main>
  );
}
