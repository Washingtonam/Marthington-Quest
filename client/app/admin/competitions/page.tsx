'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { adminRequest, AdminSession } from './adminApi';
import useAdminSession from './useAdminSession';

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

interface CompetitionSummary {
  totalContestants: number;
  pendingEntries: number;
  totalVotes: number;
  totalRevenue: number;
}

interface SummaryResponse {
  competitions: Record<string, CompetitionSummary>;
  totals: {
    activeCompetitions: number;
    totalContestants: number;
    totalVotes: number;
    totalRevenue: number;
  };
}

interface CompetitionDraft {
  title: string;
  slug: string;
  entryFee: string;
  voteFee: string;
  startDate: string;
  endDate: string;
  prizePool: string;
}

const emptyDraft: CompetitionDraft = {
  title: '',
  slug: '',
  entryFee: '0',
  voteFee: '0',
  startDate: '',
  endDate: '',
  prizePool: '0',
};

function createSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function currency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
}

export default function CompetitionManagerPage() {
  const { session, ready, signOut } = useAdminSession();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [draft, setDraft] = useState<CompetitionDraft>(emptyDraft);
  const [slugTouched, setSlugTouched] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCompetitions = useCallback(async (admin: AdminSession) => {
    setError('');
    try {
      const [competitionList, overview] = await Promise.all([
        adminRequest<Competition[]>('/api/admin/competitions', admin),
        adminRequest<SummaryResponse>('/api/admin/competitions/summary', admin),
      ]);
      setCompetitions(competitionList);
      setSummary(overview);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load competitions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) void loadCompetitions(session);
    else if (ready) setLoading(false);
  }, [session, ready, loadCompetitions]);

  const activeCount = summary?.totals.activeCompetitions ?? competitions.filter((item) => item.status === 'active').length;
  const currentSlug = useMemo(() => createSlug(draft.title), [draft.title]);

  const updateDraft = (field: keyof CompetitionDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === 'title' && !slugTouched ? { slug: createSlug(value) } : {}),
    }));
  };

  const createCompetition = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    if (draft.endDate && draft.startDate && new Date(draft.endDate) <= new Date(draft.startDate)) {
      setError('The end date must be after the start date.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await adminRequest<Competition>('/api/competitions', session, {
        method: 'POST',
        body: JSON.stringify({
          title: draft.title.trim(),
          slug: draft.slug || currentSlug,
          entryFee: Number(draft.entryFee),
          voteFee: Number(draft.voteFee),
          prizePool: Number(draft.prizePool),
          startDate: draft.startDate ? new Date(draft.startDate).toISOString() : null,
          endDate: draft.endDate ? new Date(draft.endDate).toISOString() : null,
          status: 'draft',
        }),
      });
      setCompetitions((items) => [created, ...items]);
      setDraft(emptyDraft);
      setSlugTouched(false);
      setShowCreateForm(false);
      setNotice('Competition created as a draft.');
      await loadCompetitions(session);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create competition.');
    } finally {
      setSaving(false);
    }
  };

  if (!ready || loading) {
    return <main className="admin-page"><div className="admin-loading">Loading competition manager…</div></main>;
  }

  if (!session) {
    return (
      <main className="admin-page">
        <div className="admin-empty-state">
          <span className="admin-kicker">Private workspace</span>
          <h1>Sign in to manage competitions</h1>
          <p>Admin access is required to view competition performance and settings.</p>
          <Link className="admin-button admin-button-primary" href="/admin-enter">Go to admin sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/admin/competitions"><span className="admin-brand-mark">Q</span> Quest <span>ADMIN</span></Link>
        <div className="admin-user">
          <span>{session.email}</span>
          <button className="admin-button admin-button-quiet" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="admin-intro">
        <div>
          <span className="admin-kicker">Workspace / competitions</span>
          <h1>Competition manager</h1>
          <p>Run every competition from one place. Review performance, manage entries, and keep settings current.</p>
        </div>
        <button className="admin-button admin-button-primary" onClick={() => { setShowCreateForm((open) => !open); setNotice(''); }}>
          <span aria-hidden="true">＋</span> New competition
        </button>
      </section>

      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {notice && <div className="admin-alert admin-alert-success" role="status">{notice}</div>}

      <section className="admin-overview-grid" aria-label="Competition overview">
        <article className="admin-overview-card">
          <span>All competitions</span><strong>{competitions.length}</strong><small>Across every status</small>
        </article>
        <article className="admin-overview-card">
          <span>Active now</span><strong>{activeCount}</strong><small>Open to participants</small>
        </article>
        <article className="admin-overview-card">
          <span>Total entries</span><strong>{summary?.totals.totalContestants.toLocaleString() ?? '—'}</strong><small>Registered contestants</small>
        </article>
        <article className="admin-overview-card">
          <span>Gross revenue</span><strong>{summary ? currency(summary.totals.totalRevenue) : '—'}</strong><small>Completed payments</small>
        </article>
      </section>

      {showCreateForm && (
        <section className="admin-panel admin-create-panel">
          <div className="admin-panel-heading">
            <div><span className="admin-kicker">New workspace</span><h2>Create a competition</h2></div>
            <button type="button" className="admin-icon-button" aria-label="Close form" onClick={() => setShowCreateForm(false)}>×</button>
          </div>
          <form className="admin-form-grid" onSubmit={createCompetition}>
            <label className="admin-field">Competition title
              <input required maxLength={120} value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} placeholder="e.g. Summer Talent Quest" />
            </label>
            <label className="admin-field">URL slug
              <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={draft.slug} onChange={(event) => { setSlugTouched(true); updateDraft('slug', event.target.value); }} placeholder={currentSlug || 'summer-talent-quest'} />
              <small>Public link: /competitions/{draft.slug || currentSlug || 'your-slug'}</small>
            </label>
            <label className="admin-field">Entry fee <span>(₦)</span>
              <input required type="number" min="0" step="0.01" value={draft.entryFee} onChange={(event) => updateDraft('entryFee', event.target.value)} />
            </label>
            <label className="admin-field">Vote fee <span>(₦ per vote)</span>
              <input required type="number" min="0" step="0.01" value={draft.voteFee} onChange={(event) => updateDraft('voteFee', event.target.value)} />
            </label>
            <label className="admin-field">Start date
              <input type="datetime-local" value={draft.startDate} onChange={(event) => updateDraft('startDate', event.target.value)} />
            </label>
            <label className="admin-field">End date
              <input type="datetime-local" value={draft.endDate} onChange={(event) => updateDraft('endDate', event.target.value)} />
            </label>
            <label className="admin-field">Prize pool <span>(₦)</span>
              <input required type="number" min="0" step="0.01" value={draft.prizePool} onChange={(event) => updateDraft('prizePool', event.target.value)} />
            </label>
            <div className="admin-form-actions">
              <button type="button" className="admin-button admin-button-quiet" onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button className="admin-button admin-button-primary" disabled={saving}>{saving ? 'Creating…' : 'Create draft'}</button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div><span className="admin-kicker">Portfolio</span><h2>Your competitions</h2></div>
          <span className="admin-count">{competitions.length} total</span>
        </div>
        {competitions.length === 0 ? (
          <div className="admin-empty-inline"><strong>No competitions yet</strong><span>Create your first competition to get started.</span></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Competition</th><th>Status</th><th>Entries</th><th>Votes</th><th>Revenue</th><th>Schedule</th><th /></tr></thead>
              <tbody>
                {competitions.map((competition) => {
                  const data = summary?.competitions[competition._id];
                  return (
                    <tr key={competition._id}>
                      <td><Link className="admin-competition-link" href={`/admin/competitions/${competition._id}`}>{competition.title}<small>/{competition.slug}</small></Link></td>
                      <td><span className={`admin-status-pill admin-status-${competition.status}`}>{competition.status}</span></td>
                      <td>{data?.totalContestants.toLocaleString() ?? '—'}{data?.pendingEntries ? <small className="admin-pending-note">{data.pendingEntries} awaiting review</small> : null}</td>
                      <td>{data?.totalVotes.toLocaleString() ?? '—'}</td>
                      <td>{data ? currency(data.totalRevenue) : '—'}</td>
                      <td><span>{formatDate(competition.startDate)}</span><small>to {formatDate(competition.endDate)}</small></td>
                      <td><Link className="admin-button admin-button-small" href={`/admin/competitions/${competition._id}`}>Manage <span aria-hidden="true">→</span></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
