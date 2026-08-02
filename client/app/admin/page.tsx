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
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1>Manage the competition</h1>
          <p className="muted">Approve entries, monitor platform metrics, and keep the contest running smoothly.</p>
        </div>
      </div>

      <div className="card form-card">
        <label className="field">
          Admin token
          <input
            type="password"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            placeholder="Enter admin token"
          />
        </label>
      </div>

      {stats ? (
        <div className="stats-grid">
          <div className="stat-card">
            <span>Total contestants</span>
            <strong>{stats.totalContestants}</strong>
          </div>
          <div className="stat-card">
            <span>Pending entries</span>
            <strong>{stats.pendingEntries}</strong>
          </div>
          <div className="stat-card">
            <span>Approved entries</span>
            <strong>{stats.approvedEntries}</strong>
          </div>
          <div className="stat-card">
            <span>Total votes</span>
            <strong>{stats.totalVotes}</strong>
          </div>
          <div className="stat-card">
            <span>Total revenue</span>
            <strong>₦{stats.totalRevenue}</strong>
          </div>
          <div className="stat-card">
            <span>Entry fee</span>
            <strong>₦{stats.entryFee}</strong>
          </div>
        </div>
      ) : (
        <div className="card info-card">
          <p>Enter the admin token to load dashboard data.</p>
        </div>
      )}

      {pending.length > 0 && (
        <section className="pending-list">
          <h2>Pending submissions</h2>
          <div className="pending-grid">
            {pending.map((contestant) => (
              <article key={contestant._id} className="card entry-card">
                <div className="entry-preview">
                  <img src={contestant.imageUrl} alt={contestant.photoTitle} />
                  <div>
                    <h3>{contestant.photoTitle || `${contestant.firstName} ${contestant.lastName}`}</h3>
                    <p className="muted">Category: {contestant.category}</p>
                    <p className="muted">Contestant: {contestant.firstName} {contestant.lastName}</p>
                    <p className="muted">Votes: {contestant.votes}</p>
                    <p className="muted">Upload allowance: {contestant.uploadAllowance}</p>
                  </div>
                </div>
                <p>{contestant.photoDescription}</p>
                <div className="entry-actions">
                  <button type="button" onClick={() => handleApprove(contestant._id)} className="btn-primary">
                    Approve submission
                  </button>
                  <a href={contestant.shareUrl} target="_blank" rel="noreferrer" className="link-secondary">
                    View share link
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {status && <p className="status-message">{status}</p>}
    </main>
  );
}
