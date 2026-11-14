'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminRequest, AdminSession } from '../adminApi';
import useAdminSession from '../useAdminSession';

interface Competition {
  _id: string;
  title: string;
  slug: string;
  status: 'draft' | 'active' | 'closed';
  prizePool: number;
  entryFee: number;
  voteFee: number;
  startDate?: string | null;
  endDate?: string | null;
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

interface Contestant {
  _id: string;
  firstName: string;
  lastName?: string;
  email: string;
  category?: string;
  imageUrl?: string;
  photoTitle?: string;
  photoDescription?: string;
  createdAt: string;
  entryPaid: boolean;
}

type DashboardTab = 'review' | 'analytics' | 'settings';

function currency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function makeDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function CompetitionDetailsPage() {
  const params = useParams<{ id: string }>();
  const competitionId = params.id;
  const { session, ready, signOut } = useAdminSession();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<Contestant[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('review');
  const [entryFee, setEntryFee] = useState('0');
  const [voteFee, setVoteFee] = useState('0');
  const [status, setStatus] = useState<Competition['status']>('draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyContestant, setBusyContestant] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async (admin: AdminSession, includePending = true) => {
    setError('');
    try {
      const requests = [
        adminRequest<Competition>('/api/admin/competition', admin, {
          headers: { 'x-competition-id': competitionId },
        }),
        adminRequest<Stats>('/api/admin/stats', admin, {
          headers: { 'x-competition-id': competitionId },
        }),
      ] as const;
      const [competitionData, statsData] = await Promise.all(requests);
      setCompetition(competitionData);
      setStats(statsData);
      setEntryFee(String(competitionData.entryFee ?? 0));
      setVoteFee(String(competitionData.voteFee ?? 0));
      setStatus(competitionData.status);
      setStartDate(makeDateInput(competitionData.startDate));
      setEndDate(makeDateInput(competitionData.endDate));
      if (includePending) {
        const pendingData = await adminRequest<Contestant[]>('/api/admin/contestants/pending', admin, {
          headers: { 'x-competition-id': competitionId },
        });
        setPending(pendingData);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load competition details.');
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    if (session) void loadData(session);
    else if (ready) setLoading(false);
  }, [session, ready, loadData]);

  useEffect(() => {
    if (!session) return;
    const refreshStats = async () => {
      try {
        const [latestStats, latestPending] = await Promise.all([
          adminRequest<Stats>('/api/admin/stats', session, {
            headers: { 'x-competition-id': competitionId },
          }),
          adminRequest<Contestant[]>('/api/admin/contestants/pending', session, {
            headers: { 'x-competition-id': competitionId },
          }),
        ]);
        setStats(latestStats);
        setPending(latestPending);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to refresh analytics.');
      }
    };
    const timer = window.setInterval(() => void refreshStats(), 30000);
    return () => window.clearInterval(timer);
  }, [session, competitionId]);

  const reviewContestant = async (contestantId: string, action: 'approve' | 'reject') => {
    if (!session) return;
    setBusyContestant(contestantId);
    setError('');
    setNotice('');
    try {
      await adminRequest(`/api/admin/contestants/${encodeURIComponent(contestantId)}/${action}`, session, {
        method: 'PATCH',
        headers: { 'x-competition-id': competitionId },
      });
      setPending((entries) => entries.filter((entry) => entry._id !== contestantId));
      setNotice(action === 'approve' ? 'Entry approved.' : 'Entry rejected.');
      await loadData(session, false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Unable to ${action} entry.`);
    } finally {
      setBusyContestant('');
    }
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    if (endDate && startDate && new Date(endDate) <= new Date(startDate)) {
      setError('The end date must be after the start date.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await adminRequest<{ competition: Competition }>('/api/admin/competition', session, {
        method: 'PATCH',
        headers: { 'x-competition-id': competitionId },
        body: JSON.stringify({
          entryFee: Number(entryFee),
          voteFee: Number(voteFee),
          status,
          startDate: startDate ? new Date(startDate).toISOString() : null,
          endDate: endDate ? new Date(endDate).toISOString() : null,
        }),
      });
      setCompetition(result.competition);
      setNotice('Competition settings saved.');
      await loadData(session, false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const concludeCompetition = async () => {
    if (!session || !competition) return;
    if (!window.confirm(`Conclude "${competition.title}"? It will be closed to new entries and votes.`)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await adminRequest<{ competition: Competition }>('/api/admin/competition', session, {
        method: 'PATCH',
        headers: { 'x-competition-id': competitionId },
        body: JSON.stringify({ status: 'closed' }),
      });
      setCompetition(result.competition);
      setStatus('closed');
      setNotice('Competition concluded. It is now closed.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to conclude competition.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCompetition = async () => {
    if (!session || !competition) return;
    if (!window.confirm(`Permanently delete "${competition.title}" and its entries and transactions? This cannot be undone.`)) return;
    setSaving(true);
    setError('');
    try {
      await adminRequest('/api/admin/competition', session, {
        method: 'DELETE',
        headers: { 'x-competition-id': competitionId },
      });
      window.location.assign('/admin/competitions');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete competition.');
      setSaving(false);
    }
  };

  if (!ready || loading) {
    return <main className="admin-page"><div className="admin-loading">Loading competition…</div></main>;
  }

  if (!session) {
    return (
      <main className="admin-page">
        <div className="admin-empty-state">
          <span className="admin-kicker">Private workspace</span>
          <h1>Sign in to manage competitions</h1>
          <p>Admin access is required to review entries and update competition settings.</p>
          <Link className="admin-button admin-button-primary" href="/admin-enter">Go to admin sign in</Link>
        </div>
      </main>
    );
  }

  const tabs: { id: DashboardTab; label: string; count?: number }[] = [
    { id: 'review', label: 'Pending approval', count: pending.length },
    { id: 'analytics', label: 'Live analytics' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/admin/competitions"><span className="admin-brand-mark">Q</span> Quest <span>ADMIN</span></Link>
        <div className="admin-user">
          <Link className="admin-back-link" href="/admin/competitions">← All competitions</Link>
          <span>{session.email}</span>
          <button className="admin-button admin-button-quiet" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="admin-detail-heading">
        <div>
          <span className="admin-kicker">Competition workspace</span>
          <div className="admin-title-row">
            <h1>{competition?.title || 'Competition'}</h1>
            {competition && <span className={`admin-status-pill admin-status-${competition.status}`}>{competition.status}</span>}
          </div>
          <p>{competition ? `/${competition.slug} · ${formatDate(competition.startDate)} — ${formatDate(competition.endDate)}` : 'Competition details could not be found.'}</p>
        </div>
        {competition && <Link className="admin-button admin-button-quiet" href={`/competitions/${competition.slug}`} target="_blank">View public page ↗</Link>}
      </section>

      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {notice && <div className="admin-alert admin-alert-success" role="status">{notice}</div>}

      {competition && (
        <>
          <nav className="admin-tabs" aria-label="Competition management sections">
            {tabs.map((tab) => (
              <button key={tab.id} className={activeTab === tab.id ? 'admin-tab admin-tab-active' : 'admin-tab'} onClick={() => setActiveTab(tab.id)}>
                {tab.label}{typeof tab.count === 'number' && <span>{tab.count}</span>}
              </button>
            ))}
          </nav>

          {activeTab === 'review' && (
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div><span className="admin-kicker">Entry review</span><h2>Contestants pending approval</h2><p>Review each submission before it appears on the public competition page.</p></div>
                <span className="admin-count">{pending.length} to review</span>
              </div>
              {pending.length === 0 ? (
                <div className="admin-empty-inline"><strong>You’re all caught up</strong><span>New registrations for this competition will appear here.</span></div>
              ) : (
                <div className="admin-entry-list">
                  {pending.map((contestant) => (
                    <article className="admin-entry-card" key={contestant._id}>
                      {contestant.imageUrl ? <img src={contestant.imageUrl} alt="" className="admin-entry-photo" /> : <div className="admin-entry-photo admin-entry-placeholder">No photo</div>}
                      <div className="admin-entry-info">
                        <div className="admin-entry-name-row">
                          <h3>{contestant.firstName} {contestant.lastName}</h3>
                          {contestant.category && <span className="admin-category-pill">{contestant.category}</span>}
                        </div>
                        <span className="admin-entry-email">{contestant.email}</span>
                        {contestant.photoTitle && <strong className="admin-photo-title">{contestant.photoTitle}</strong>}
                        {contestant.photoDescription && <p>{contestant.photoDescription}</p>}
                        <small>Submitted {formatDate(contestant.createdAt)} · Entry fee {contestant.entryPaid ? 'paid' : 'unpaid'}</small>
                      </div>
                      <div className="admin-entry-actions">
                        <button className="admin-button admin-button-danger-outline" disabled={saving || busyContestant === contestant._id} onClick={() => void reviewContestant(contestant._id, 'reject')}>{busyContestant === contestant._id ? 'Saving…' : 'Reject'}</button>
                        <button className="admin-button admin-button-primary" disabled={saving || busyContestant === contestant._id} onClick={() => void reviewContestant(contestant._id, 'approve')}>Approve entry</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'analytics' && (
            <section className="admin-analytics">
              <div className="admin-analytics-heading">
                <div><span className="admin-kicker">Performance</span><h2>Live analytics</h2><p>Numbers refresh automatically every 30 seconds.</p></div>
                <span className="admin-live-indicator"><i /> Live</span>
              </div>
              <div className="admin-metric-grid">
                <article className="admin-metric-card"><span>Total entries</span><strong>{stats?.totalContestants.toLocaleString() ?? '—'}</strong><small>{stats?.approvedEntries ?? 0} approved · {stats?.pendingEntries ?? 0} awaiting review</small></article>
                <article className="admin-metric-card"><span>Votes cast</span><strong>{stats?.totalVotes.toLocaleString() ?? '—'}</strong><small>Across all contestants</small></article>
                <article className="admin-metric-card"><span>Gross revenue</span><strong>{stats ? currency(stats.totalRevenue) : '—'}</strong><small>Completed entry and vote payments</small></article>
              </div>
              <div className="admin-panel admin-revenue-note">
                <div className="admin-note-icon">↗</div><div><strong>Revenue at a glance</strong><p>Gross revenue reflects successfully completed payments only. Pending or failed transactions are excluded.</p></div>
                <div className="admin-fee-summary"><span>Entry fee <strong>{currency(competition.entryFee)}</strong></span><span>Vote fee <strong>{currency(competition.voteFee)}</strong></span></div>
              </div>
            </section>
          )}

          {activeTab === 'settings' && (
            <section className="admin-settings-layout">
              <form className="admin-panel admin-settings-form" onSubmit={saveSettings}>
                <div className="admin-panel-heading"><div><span className="admin-kicker">Configuration</span><h2>Competition settings</h2><p>Changes apply to new registrations and votes.</p></div></div>
                <label className="admin-field">Entry fee <span>(₦)</span>
                  <input required type="number" min="0" step="0.01" value={entryFee} onChange={(event) => setEntryFee(event.target.value)} />
                </label>
                <label className="admin-field">Vote fee <span>(₦ per vote)</span>
                  <input required type="number" min="0" step="0.01" value={voteFee} onChange={(event) => setVoteFee(event.target.value)} />
                </label>
                <label className="admin-field">Competition status
                  <select value={status} onChange={(event) => setStatus(event.target.value as Competition['status'])}>
                    <option value="draft">Draft — hidden from the public</option>
                    <option value="active">Active — accepting entries and votes</option>
                    <option value="closed">Closed — no new entries or votes</option>
                  </select>
                </label>
                <div className="admin-form-grid admin-settings-dates">
                  <label className="admin-field">Start date<input type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
                  <label className="admin-field">End date<input type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
                </div>
                <div className="admin-form-actions"><button className="admin-button admin-button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button></div>
              </form>

              <aside className="admin-panel admin-danger-zone">
                <span className="admin-kicker">Competition lifecycle</span><h2>Conclude or delete</h2>
                <p>Concluding closes this competition to entries and voting while preserving its records. Deleting permanently removes the competition and all associated data.</p>
                <button className="admin-button admin-button-warning" disabled={saving || competition.status === 'closed'} onClick={() => void concludeCompetition()}>Conclude competition</button>
                <button className="admin-button admin-button-danger" disabled={saving} onClick={() => void deleteCompetition()}>Delete competition</button>
              </aside>
            </section>
          )}
        </>
      )}
    </main>
  );
}
