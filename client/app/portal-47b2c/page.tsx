"use client";

import { useEffect, useState } from 'react';

interface Contestant {
  _id: string;
  email: string;
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
  shareSlug: string;
  isApproved: boolean;
  entryPaid: boolean;
  entryTransactionRef?: string;
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
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [selectedContestant, setSelectedContestant] = useState<Contestant | null>(null);
  const [status, setStatus] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [settings, setSettings] = useState<{ entryFee?: number; voteFee?: number } | null>(null);
  const [voteEdit, setVoteEdit] = useState<number>(0);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const loadAdminData = async () => {
    if (!adminToken || !adminEmail) return;

    const headers = {
      Authorization: `Bearer ${adminToken}`,
      'x-admin-email': adminEmail,
    };

    try {
      const [statsRes, pendingRes, allRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/admin/stats`, { headers }),
        fetch(`${apiBaseUrl}/api/admin/contestants/pending`, { headers }),
        fetch(`${apiBaseUrl}/api/admin/contestants`, { headers }),
      ]);

      if (!statsRes.ok || !pendingRes.ok || !allRes.ok) {
        throw new Error('Failed to load admin data');
      }

      setStats(await statsRes.json());
      setPending(await pendingRes.json());
      const allContestants = await allRes.json();
      setContestants(allContestants);
      // fetch settings
      try {
        const sres = await fetch(`${apiBaseUrl}/api/admin/settings`, {
          headers: { Authorization: `Bearer ${adminToken}`, 'x-admin-email': adminEmail },
        });
        if (sres.ok) setSettings(await sres.json());
      } catch (e) {
        // ignore
      }
      if (!selectedContestant && allContestants.length > 0) {
        setSelectedContestant(allContestants[0]);
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unable to load admin data'}`);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [adminToken, adminEmail, apiBaseUrl]);

  const handleApprove = async (id: string) => {
    if (!adminToken || !adminEmail) {
      setStatus('Admin token and email required');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/contestants/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
          'x-admin-email': adminEmail,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Approval failed');
      }

      const { contestant: approvedContestant } = await response.json();
      setPending((prev) => prev.filter((entry) => entry._id !== id));
      setContestants((prev) => prev.map((entry) => (entry._id === id ? approvedContestant : entry)));
      if (selectedContestant?._id === id) {
        setSelectedContestant(approvedContestant);
      }
      await loadAdminData();
      setStatus('Contestant approved successfully');
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unable to approve'}`);
    }
  };

  const handleSaveSettings = async () => {
    if (!adminToken || !adminEmail || !settings) return setStatus('Admin token and email required');
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-admin-email': adminEmail },
        body: JSON.stringify({ entryFee: Number(settings.entryFee || 0), voteFee: Number(settings.voteFee || 0) }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to save settings');
      setStatus('Settings saved');
      await loadAdminData();
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unable to save settings'}`);
    }
  };

  const handleTogglePaid = async (id: string, current: boolean) => {
    if (!adminToken || !adminEmail) return setStatus('Admin token and email required');
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/contestants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-admin-email': adminEmail },
        body: JSON.stringify({ entryPaid: !current }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to update payment status');
      setStatus('Payment status updated');
      await loadAdminData();
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unable to update'}`);
    }
  };

  const handleDeleteContestant = async (id: string) => {
    if (!adminToken || !adminEmail) return setStatus('Admin token and email required');
    if (!confirm('Delete this contestant? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/contestants/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}`, 'x-admin-email': adminEmail },
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Delete failed');
      setStatus('Contestant deleted');
      await loadAdminData();
      setSelectedContestant(null);
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unable to delete'}`);
    }
  };

  const handleSelectContestant = (contestant: Contestant) => {
    setSelectedContestant(contestant);
    setStatus('');
    setVoteEdit(contestant.votes || 0);
  };

  const handleUpdateVotes = async (id: string) => {
    if (!adminToken || !adminEmail) return setStatus('Admin token and email required');
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/contestants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-admin-email': adminEmail },
        body: JSON.stringify({ votes: Number(voteEdit) }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to update votes');
      setStatus('Votes updated');
      await loadAdminData();
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unable to update votes'}`);
    }
  };

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1>Manage the competition</h1>
          <p className="muted">Approve entries, inspect contestant profiles, and review platform details.</p>
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
        <label className="field">
          Admin email
          <input
            type="email"
            value={adminEmail}
            onChange={(event) => setAdminEmail(event.target.value)}
            placeholder="Enter your authorized admin email"
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

      {settings && (
        <div className="card form-card">
          <h3>Platform settings</h3>
          <label className="field">
            Entry fee (₦)
            <input type="number" value={settings.entryFee ?? 0} onChange={(e) => setSettings({ ...settings, entryFee: Number(e.target.value) })} />
          </label>
          <label className="field">
            Vote fee (₦)
            <input type="number" value={settings.voteFee ?? 0} onChange={(e) => setSettings({ ...settings, voteFee: Number(e.target.value) })} />
          </label>
          <div className="form-actions">
            <button type="button" className="btn-primary" onClick={handleSaveSettings}>Save settings</button>
          </div>
        </div>
      )}

      <div className="admin-grid">
        <section className="card contestant-list">
          <div className="section-heading">
            <h2>Contestants</h2>
            <p className="muted">Browse all entries and select a profile to review details.</p>
          </div>
          <div className="list-group">
            {contestants.map((contestant) => (
              <button
                key={contestant._id}
                type="button"
                className={`entry-row ${selectedContestant?._id === contestant._id ? 'selected' : ''}`}
                onClick={() => handleSelectContestant(contestant)}
              >
                <div>
                  <strong>{contestant.photoTitle || `${contestant.firstName} ${contestant.lastName}`}</strong>
                  <p className="muted">{contestant.category} • {contestant.isApproved ? 'Approved' : 'Pending'}</p>
                </div>
                <span className="status-pill">{contestant.entryPaid ? 'Paid' : 'Unpaid'}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card detail-panel">
          {selectedContestant ? (
            <div>
              <div className="section-heading">
                <h2>Contestant profile</h2>
                <p className="muted">View details, share link, and approve from here.</p>
              </div>

              <div className="entry-preview">
                <img src={selectedContestant.imageUrl} alt={selectedContestant.photoTitle} />
              </div>

              <div className="detail-grid">
                <div>
                  <h3>{selectedContestant.photoTitle || `${selectedContestant.firstName} ${selectedContestant.lastName}`}</h3>
                  <p className="muted">{selectedContestant.category} • {selectedContestant.ageLabel}</p>
                  <p>{selectedContestant.photoDescription}</p>
                </div>
                <div>
                  <div className="stat-card">
                    <span>Votes</span>
                    <strong>{selectedContestant.votes}</strong>
                    <div style={{ marginTop: 8 }}>
                      <input type="number" value={voteEdit} onChange={(e) => setVoteEdit(Number(e.target.value))} style={{ width: 120 }} />
                      <button type="button" className="btn-primary" onClick={() => handleUpdateVotes(selectedContestant._id)} style={{ marginLeft: 8 }}>Save</button>
                    </div>
                  </div>
                  <div className="stat-card">
                    <span>Status</span>
                    <strong>{selectedContestant.isApproved ? 'Approved' : 'Pending approval'}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Payment</span>
                    <strong>{selectedContestant.entryPaid ? 'Paid' : 'Not paid'}</strong>
                  </div>
                </div>
              </div>

              <div className="entry-actions">
                {!selectedContestant.isApproved && (
                  <button type="button" className="btn-primary" onClick={() => handleApprove(selectedContestant._id)}>
                    Approve entry
                  </button>
                )}
                <button type="button" className="btn-primary" onClick={() => handleTogglePaid(selectedContestant._id, selectedContestant.entryPaid)}>
                  Mark {selectedContestant.entryPaid ? 'Unpaid' : 'Paid'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => handleDeleteContestant(selectedContestant._id)} style={{ marginLeft: 8 }}>
                  Delete contestant
                </button>
                <a href={selectedContestant.shareUrl} target="_blank" rel="noreferrer" className="link-secondary">
                  Open profile
                </a>
              </div>

              <div className="info-card card">
                <p className="muted" style={{ margin: 0 }}>
                  Email: {selectedContestant.email}
                  <br />
                  WhatsApp: {selectedContestant.whatsapp || 'N/A'}
                  <br />
                  Share path: <code>{selectedContestant.shareSlug}</code>
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h3>Select a contestant from the list to see details.</h3>
            </div>
          )}
        </section>
      </div>

      {pending.length > 0 && (
        <section className="pending-list">
          <h2>Pending approvals</h2>
          <div className="pending-grid">
            {pending.map((contestant) => (
              <article key={contestant._id} className="card entry-card">
                <div className="entry-preview">
                  <img src={contestant.imageUrl} alt={contestant.photoTitle} />
                  <div>
                    <h3>{contestant.photoTitle || `${contestant.firstName} ${contestant.lastName}`}</h3>
                    <p className="muted">Category: {contestant.category}</p>
                    <p className="muted">Contestant: {contestant.firstName} {contestant.lastName}</p>
                    <p className="muted">Status: {contestant.entryPaid ? 'Paid' : 'Unpaid'}</p>
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
