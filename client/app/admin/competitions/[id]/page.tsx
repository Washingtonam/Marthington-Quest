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
  votes: number;
  isApproved: boolean;
  status?: string;
}

interface Transaction {
  _id: string;
  type: 'entry' | 'vote' | 'payout';
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  method: string;
  createdAt: string;
  contestantId?: {
    _id: string;
    firstName: string;
    lastName?: string;
    shareSlug?: string;
  } | null;
  meta?: {
    votes?: number;
    adjustment?: boolean;
    reason?: string;
  };
}

interface ContestantEditDraft {
  photoTitle: string;
  photoDescription: string;
  category: string;
  imageUrl: string;
}

type DashboardTab = 'review' | 'entries' | 'analytics' | 'voteAnalytics' | 'votes' | 'settings';

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
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingContestantId, setEditingContestantId] = useState('');
  const [contestantDraft, setContestantDraft] = useState<ContestantEditDraft | null>(null);
  const [selectedContestantId, setSelectedContestantId] = useState('');
  const [votesToAdd, setVotesToAdd] = useState('1');
  const [voteAdjustmentReason, setVoteAdjustmentReason] = useState('');
  const [loadingContestants, setLoadingContestants] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('analytics');
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

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    const availableTabs: DashboardTab[] = ['review', 'entries', 'analytics', 'voteAnalytics', 'votes', 'settings'];
    if (requestedTab && availableTabs.includes(requestedTab as DashboardTab)) {
      setActiveTab(requestedTab as DashboardTab);
    }
  }, []);

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

  useEffect(() => {
    if (!session || !['votes', 'entries', 'voteAnalytics'].includes(activeTab)) return;
    let active = true;
    setLoadingContestants(true);
    adminRequest<Contestant[]>('/api/admin/contestants', session, {
      headers: { 'x-competition-id': competitionId },
    })
      .then((result) => {
        if (!active) return;
        setContestants(result);
        setSelectedContestantId((current) =>
          result.some((contestant) => contestant._id === current) ? current : result[0]?._id || ''
        );
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load contestants.');
      })
      .finally(() => {
        if (active) setLoadingContestants(false);
      });

    return () => {
      active = false;
    };
  }, [session, activeTab, competitionId]);

  useEffect(() => {
    if (!session || activeTab !== 'voteAnalytics') return;
    let active = true;
    setLoadingTransactions(true);
    adminRequest<Transaction[]>('/api/admin/transactions', session, {
      headers: { 'x-competition-id': competitionId },
    })
      .then((result) => {
        if (active) setTransactions(result);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load vote activity.');
      })
      .finally(() => {
        if (active) setLoadingTransactions(false);
      });

    return () => {
      active = false;
    };
  }, [session, activeTab, competitionId]);

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
      setContestants((entries) => entries.map((entry) =>
        entry._id === contestantId
          ? { ...entry, isApproved: action === 'approve', status: action === 'approve' ? 'approved' : 'rejected' }
          : entry
      ));
      setNotice(action === 'approve' ? 'Entry approved.' : 'Entry rejected.');
      await loadData(session, false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Unable to ${action} entry.`);
    } finally {
      setBusyContestant('');
    }
  };

  const beginContestantEdit = (contestant: Contestant) => {
    setEditingContestantId(contestant._id);
    setContestantDraft({
      photoTitle: contestant.photoTitle || '',
      photoDescription: contestant.photoDescription || '',
      category: contestant.category || '',
      imageUrl: contestant.imageUrl || '',
    });
  };

  const saveContestant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || !editingContestantId || !contestantDraft) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await adminRequest<{ contestant: Contestant }>(
        `/api/admin/contestants/${encodeURIComponent(editingContestantId)}`,
        session,
        {
          method: 'PATCH',
          headers: { 'x-competition-id': competitionId },
          body: JSON.stringify(contestantDraft),
        }
      );
      setContestants((entries) => entries.map((entry) =>
        entry._id === result.contestant._id ? result.contestant : entry
      ));
      setEditingContestantId('');
      setContestantDraft(null);
      setNotice('Contestant details saved.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save contestant details.');
    } finally {
      setSaving(false);
    }
  };

  const uploadContestantImage = async (file?: File) => {
    if (!session || !file || !contestantDraft) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file to upload.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('The image must be smaller than 10 MB.');
      return;
    }

    setUploadingImage(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const result = await adminRequest<{ url: string }>('/api/contestants/upload', session, {
        method: 'POST',
        body: formData,
      });
      setContestantDraft((current) => current ? { ...current, imageUrl: result.url } : current);
      setNotice('Image uploaded. Save the contestant to publish it.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteContestant = async (contestant: Contestant) => {
    if (!session || !window.confirm(`Permanently delete ${contestant.firstName} ${contestant.lastName || ''} and their entry?`)) return;
    setBusyContestant(contestant._id);
    setError('');
    setNotice('');
    try {
      await adminRequest(`/api/admin/contestants/${encodeURIComponent(contestant._id)}`, session, {
        method: 'DELETE',
        headers: { 'x-competition-id': competitionId },
      });
      setContestants((entries) => entries.filter((entry) => entry._id !== contestant._id));
      setPending((entries) => entries.filter((entry) => entry._id !== contestant._id));
      setNotice('Contestant entry deleted.');
      await loadData(session, false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete contestant.');
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

  const addVotes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    const votes = Number(votesToAdd);
    if (!selectedContestantId || !Number.isInteger(votes) || votes < 1) {
      setError('Select a contestant and enter a positive whole number of votes.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await adminRequest<{ contestant: Contestant }>(
        `/api/admin/contestants/${encodeURIComponent(selectedContestantId)}/votes`,
        session,
        {
          method: 'POST',
          headers: { 'x-competition-id': competitionId },
          body: JSON.stringify({ votes, reason: voteAdjustmentReason }),
        }
      );
      setContestants((current) =>
        current.map((contestant) =>
          contestant._id === result.contestant._id ? result.contestant : contestant
        )
      );
      setVotesToAdd('1');
      setVoteAdjustmentReason('');
      setNotice(`${votes} vote${votes === 1 ? '' : 's'} added. The adjustment has been recorded.`);
      await loadData(session, false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to add votes.');
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
    { id: 'analytics', label: 'Live analytics' },
    { id: 'entries', label: 'All entries', count: stats?.totalContestants },
    { id: 'voteAnalytics', label: 'Vote activity' },
    { id: 'votes', label: 'Vote management' },
    { id: 'review', label: 'Pending approval', count: pending.length },
    { id: 'settings', label: 'Settings' },
  ];

  const openTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url);
  };

  const voteTransactions = transactions.filter((transaction) => transaction.type === 'vote');
  const voteRevenue = voteTransactions
    .filter((transaction) => transaction.status === 'completed')
    .reduce((total, transaction) => total + transaction.amount, 0);
  const contestantsWithVotes = contestants.filter((contestant) => contestant.votes > 0).length;
  const topContestants = [...contestants].sort((first, second) => second.votes - first.votes).slice(0, 10);

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
            {tabs.map((tab) => {
              const label = typeof tab.count === 'number' ? `${tab.label}, ${tab.count}` : tab.label;
              return (
                <button key={tab.id} className={activeTab === tab.id ? 'admin-tab admin-tab-active' : 'admin-tab'} aria-label={label} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => openTab(tab.id)}>
                  {tab.label}{typeof tab.count === 'number' && <span>{tab.count}</span>}
                </button>
              );
            })}
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

          {activeTab === 'entries' && (
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div><span className="admin-kicker">Entry management</span><h2>All contestants</h2><p>Review every submission, update contestant photos and details, or open vote management for an individual contestant.</p></div>
                <span className="admin-count">{contestants.length} entries</span>
              </div>
              {loadingContestants ? (
                <div className="admin-empty-inline">Loading entries…</div>
              ) : contestants.length === 0 ? (
                <div className="admin-empty-inline"><strong>No entries yet</strong><span>Contestants for this competition will appear here.</span></div>
              ) : (
                <div className="admin-entry-list">
                  {contestants.map((contestant) => (
                    <article className="admin-entry-card" key={contestant._id}>
                      {contestant.imageUrl
                        ? <img src={contestant.imageUrl} alt={`${contestant.firstName} ${contestant.lastName || ''}`} className="admin-entry-photo" />
                        : <div className="admin-entry-photo admin-entry-placeholder">No photo</div>}
                      <div className="admin-entry-info">
                        <div className="admin-entry-name-row">
                          <h3>{contestant.firstName} {contestant.lastName}</h3>
                          <span className={`admin-status-pill ${contestant.isApproved ? 'admin-status-active' : contestant.status === 'rejected' ? 'admin-status-closed' : 'admin-status-draft'}`}>
                            {contestant.status === 'rejected' ? 'rejected' : contestant.isApproved ? 'approved' : 'pending'}
                          </span>
                        </div>
                        <span className="admin-entry-email">{contestant.email}</span>
                        {contestant.photoTitle && <strong className="admin-photo-title">{contestant.photoTitle}</strong>}
                        {contestant.photoDescription && <p>{contestant.photoDescription}</p>}
                        <small>{contestant.votes.toLocaleString()} votes · Entry fee {contestant.entryPaid ? 'paid' : 'unpaid'} · Submitted {formatDate(contestant.createdAt)}</small>
                      </div>
                      <div className="admin-entry-actions">
                        <button type="button" className="admin-button admin-button-small" onClick={() => { setSelectedContestantId(contestant._id); openTab('votes'); }}>Manage votes</button>
                        <button type="button" className="admin-button admin-button-small" onClick={() => beginContestantEdit(contestant)}>Edit details / photo</button>
                        {!contestant.isApproved && (
                          <button type="button" className="admin-button admin-button-primary" disabled={saving || busyContestant === contestant._id} onClick={() => void reviewContestant(contestant._id, 'approve')}>Approve</button>
                        )}
                        {contestant.isApproved && (
                          <button type="button" className="admin-button admin-button-danger-outline" disabled={saving || busyContestant === contestant._id} onClick={() => void reviewContestant(contestant._id, 'reject')}>Reject</button>
                        )}
                        <button type="button" className="admin-button admin-button-danger-outline" disabled={busyContestant === contestant._id} onClick={() => void deleteContestant(contestant)}>Delete</button>
                      </div>
                      {editingContestantId === contestant._id && contestantDraft && (
                        <form className="admin-entry-edit-form" onSubmit={saveContestant}>
                          <div className="admin-entry-edit-photo">
                            {contestantDraft.imageUrl
                              ? <img src={contestantDraft.imageUrl} alt="Updated contestant preview" className="admin-entry-photo" />
                              : <div className="admin-entry-photo admin-entry-placeholder">No photo</div>}
                            <label className="admin-field">Upload a new photo
                              <input type="file" accept="image/*" disabled={uploadingImage} onChange={(event) => void uploadContestantImage(event.target.files?.[0])} />
                              <small>Images up to 10 MB. Save changes after upload.</small>
                            </label>
                          </div>
                          <label className="admin-field">Photo title
                            <input maxLength={160} value={contestantDraft.photoTitle} onChange={(event) => setContestantDraft({ ...contestantDraft, photoTitle: event.target.value })} />
                          </label>
                          <label className="admin-field">Category
                            <input maxLength={100} value={contestantDraft.category} onChange={(event) => setContestantDraft({ ...contestantDraft, category: event.target.value })} />
                          </label>
                          <label className="admin-field admin-entry-description-field">Photo description
                            <textarea maxLength={2000} value={contestantDraft.photoDescription} onChange={(event) => setContestantDraft({ ...contestantDraft, photoDescription: event.target.value })} />
                          </label>
                          <div className="admin-entry-edit-actions">
                            <button type="button" className="admin-button admin-button-quiet" onClick={() => { setEditingContestantId(''); setContestantDraft(null); }}>Cancel</button>
                            <button className="admin-button admin-button-primary" disabled={saving || uploadingImage}>{saving ? 'Saving…' : uploadingImage ? 'Uploading…' : 'Save contestant'}</button>
                          </div>
                        </form>
                      )}
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
                <button type="button" className="admin-metric-card admin-metric-card-button" onClick={() => openTab('entries')}><span>Total entries</span><strong>{stats?.totalContestants.toLocaleString() ?? '—'}</strong><small>{stats?.approvedEntries ?? 0} approved · {stats?.pendingEntries ?? 0} awaiting review</small><span className="admin-card-action">View and manage entries →</span></button>
                <button type="button" className="admin-metric-card admin-metric-card-button" onClick={() => openTab('voteAnalytics')}><span>Votes cast</span><strong>{stats?.totalVotes.toLocaleString() ?? '—'}</strong><small>Across all contestants</small><span className="admin-card-action">View vote analytics →</span></button>
                <button type="button" className="admin-metric-card admin-metric-card-button" onClick={() => openTab('voteAnalytics')}><span>Gross revenue</span><strong>{stats ? currency(stats.totalRevenue) : '—'}</strong><small>Completed entry and vote payments</small><span className="admin-card-action">View payment activity →</span></button>
              </div>
              <div className="admin-panel admin-revenue-note">
                <div className="admin-note-icon">↗</div><div><strong>Revenue at a glance</strong><p>Gross revenue reflects successfully completed payments only. Pending or failed transactions are excluded.</p></div>
                <div className="admin-fee-summary"><span>Entry fee <strong>{currency(competition.entryFee)}</strong></span><span>Vote fee <strong>{currency(competition.voteFee)}</strong></span></div>
              </div>
              <div className="admin-panel admin-survey-status">
                <div><span className="admin-kicker">Competition lifecycle</span><h2>Competition status: <span className={`admin-status-pill admin-status-${competition.status}`}>{competition.status}</span></h2><p>{competition.status === 'closed' ? 'The competition is closed to new entries and votes.' : 'Concluding this competition closes it to new entries and votes while preserving its records.'}</p></div>
                <div className="admin-entry-actions">
                  <button type="button" className="admin-button admin-button-quiet" onClick={() => openTab('settings')}>Manage close settings</button>
                  <button type="button" className="admin-button admin-button-warning" disabled={saving || competition.status === 'closed'} onClick={() => void concludeCompetition()}>Conclude competition</button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'voteAnalytics' && (
            <section className="admin-analytics">
              <div className="admin-analytics-heading">
                <div><span className="admin-kicker">Voting performance</span><h2>Vote activity</h2><p>Contestant standings and recorded vote-payment activity for this competition.</p></div>
                <button type="button" className="admin-button admin-button-quiet" onClick={() => openTab('votes')}>Manage contestant votes</button>
              </div>
              {loadingContestants || loadingTransactions ? (
                <div className="admin-panel admin-empty-inline">Loading vote analytics…</div>
              ) : (
                <>
                  <div className="admin-vote-summary-grid">
                    <article className="admin-metric-card"><span>Total votes</span><strong>{stats?.totalVotes.toLocaleString() ?? '—'}</strong><small>Votes currently recorded across contestants</small></article>
                    <article className="admin-metric-card"><span>Contestants with votes</span><strong>{contestantsWithVotes.toLocaleString()}</strong><small>Out of {contestants.length.toLocaleString()} total entries</small></article>
                    <article className="admin-metric-card"><span>Vote transactions</span><strong>{voteTransactions.length.toLocaleString()}</strong><small>{voteTransactions.filter((transaction) => transaction.status === 'completed').length} completed · {voteTransactions.filter((transaction) => transaction.status === 'pending').length} pending</small></article>
                    <article className="admin-metric-card"><span>Vote revenue</span><strong>{currency(voteRevenue)}</strong><small>Completed vote transactions</small></article>
                  </div>
                  <section className="admin-panel">
                    <div className="admin-panel-heading"><div><span className="admin-kicker">Leaderboard</span><h2>Votes by contestant</h2></div></div>
                    {topContestants.length === 0 ? (
                      <div className="admin-empty-inline">No contestant vote totals yet.</div>
                    ) : (
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead><tr><th>Rank</th><th>Contestant</th><th>Status</th><th>Votes</th><th /></tr></thead>
                          <tbody>{topContestants.map((contestant, index) => (
                            <tr key={contestant._id}>
                              <td>#{index + 1}</td>
                              <td>{contestant.firstName} {contestant.lastName}<small>{contestant.photoTitle || contestant.email}</small></td>
                              <td>{contestant.isApproved ? 'Approved' : contestant.status || 'Pending'}</td>
                              <td><strong>{contestant.votes.toLocaleString()}</strong></td>
                              <td><button type="button" className="admin-button admin-button-small" onClick={() => { setSelectedContestantId(contestant._id); openTab('votes'); }}>Manage votes</button></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </section>
                  <section className="admin-panel">
                    <div className="admin-panel-heading"><div><span className="admin-kicker">Payment log</span><h2>Recent vote transactions</h2><p>Includes completed, pending, failed, and admin-adjusted vote activity.</p></div><span className="admin-count">{voteTransactions.length} transactions</span></div>
                    {voteTransactions.length === 0 ? (
                      <div className="admin-empty-inline">No vote transactions recorded.</div>
                    ) : (
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead><tr><th>Date</th><th>Contestant</th><th>Votes</th><th>Amount</th><th>Status</th><th>Method / reason</th></tr></thead>
                          <tbody>{voteTransactions.slice(0, 100).map((transaction) => (
                            <tr key={transaction._id}>
                              <td>{formatDate(transaction.createdAt)}</td>
                              <td>{transaction.contestantId ? `${transaction.contestantId.firstName} ${transaction.contestantId.lastName || ''}` : 'Contestant removed'}</td>
                              <td>{Number(transaction.meta?.votes || 0).toLocaleString()}</td>
                              <td>{currency(transaction.amount)}</td>
                              <td><span className={`admin-status-pill ${transaction.status === 'completed' ? 'admin-status-active' : transaction.status === 'failed' ? 'admin-status-closed' : 'admin-status-draft'}`}>{transaction.status}</span></td>
                              <td>{transaction.meta?.adjustment ? `Admin adjustment: ${transaction.meta.reason || 'No reason provided'}` : transaction.method}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                        {voteTransactions.length > 100 && <p className="admin-table-footnote">Showing the 100 most recent vote transactions out of {voteTransactions.length} returned by the activity API.</p>}
                      </div>
                    )}
                  </section>
                </>
              )}
            </section>
          )}

          {activeTab === 'votes' && (
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-kicker">Manual adjustment</span>
                  <h2>Manage contestant votes</h2>
                  <p>Add votes when a confirmed payment needs to be reconciled. Every adjustment is recorded with its reason and admin account.</p>
                </div>
              </div>
              {loadingContestants ? (
                <div className="admin-empty-inline">Loading contestants…</div>
              ) : contestants.length === 0 ? (
                <div className="admin-empty-inline"><strong>No contestants found</strong><span>Contestants for this competition will appear here.</span></div>
              ) : (
                <form className="admin-settings-form" onSubmit={addVotes}>
                  <label className="admin-field">Contestant
                    <select
                      required
                      value={selectedContestantId}
                      onChange={(event) => setSelectedContestantId(event.target.value)}
                    >
                      {contestants.map((contestant) => (
                        <option key={contestant._id} value={contestant._id}>
                          {contestant.photoTitle || `${contestant.firstName} ${contestant.lastName || ''}`} — {contestant.votes.toLocaleString()} votes
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field">Votes to add
                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={votesToAdd}
                      onChange={(event) => setVotesToAdd(event.target.value)}
                    />
                  </label>
                  <label className="admin-field">Reason for adjustment
                    <input
                      required
                      maxLength={500}
                      value={voteAdjustmentReason}
                      onChange={(event) => setVoteAdjustmentReason(event.target.value)}
                      placeholder="For example: verified payment not reflected"
                    />
                  </label>
                  <div className="admin-form-actions">
                    <button className="admin-button admin-button-primary" disabled={saving || loadingContestants}>
                      {saving ? 'Adding votes…' : 'Add votes'}
                    </button>
                  </div>
                </form>
              )}
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
