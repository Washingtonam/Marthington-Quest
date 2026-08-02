import type { Metadata } from 'next';
import VoteForm from '../VoteForm';
import CopyShareLink from '../CopyShareLink';

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
  shareUrl: string;
  isApproved: boolean;
  entryPaid: boolean;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const entry = await fetchEntry(params.slug);
  return {
    title: entry ? `${entry.photoTitle || `${entry.firstName} ${entry.lastName}`} · Marthington Quest` : 'Entry not found',
    description: entry ? `${entry.photoDescription}` : 'Photo entry page',
  };
}

async function fetchEntry(slug: string): Promise<Contestant | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const resp = await fetch(`${apiBaseUrl}/api/contestants/slug/${slug}`, { cache: 'no-store' });
  if (!resp.ok) return null;
  return resp.json();
}

async function fetchSettings(): Promise<any> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const resp = await fetch(`${apiBaseUrl}/api/settings`, { cache: 'no-store' });
  if (!resp.ok) {
    return { entryFee: 0, voteFee: Number(process.env.NEXT_PUBLIC_VOTE_FEE_NAIRA || 100) };
  }
  return resp.json();
}

export default async function EntryPage({ params }: { params: { slug: string } }) {
  const contestant = await fetchEntry(params.slug);
  const settings = await fetchSettings();

  if (!contestant) {
    return (
      <main className="page-shell">
        <div className="page-header">
          <div>
            <p className="eyebrow">Entry detail</p>
            <h1>Entry not found</h1>
            <p className="muted">The entry you are looking for is not live yet or has not been approved.</p>
          </div>
        </div>
      </main>
    );
  }

  const isLive = contestant.isApproved && contestant.entryPaid;
  const paymentStatus = contestant.entryPaid ? 'Paid' : 'Unpaid';
  const approvalStatus = contestant.isApproved ? 'Approved' : 'Awaiting approval';
  const statusLabel = isLive ? 'Live entry' : !contestant.entryPaid ? 'Payment pending' : 'Awaiting approval';
  const voteFee = settings.voteFee ?? Number(process.env.NEXT_PUBLIC_VOTE_FEE_NAIRA || 100);
  const voteTimerOpen = Boolean(settings.voteTimerOpen);
  const canVote = isLive && voteTimerOpen;
  const isPending = !isLive;

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Contestant entry</p>
          <h1>{contestant.photoTitle || `${contestant.firstName} ${contestant.lastName}`}</h1>
          <p className="muted">{contestant.category} • {contestant.firstName} {contestant.lastName} • {contestant.ageLabel}</p>
        </div>
      </div>

      <div className="entry-card card">
        <div className="status-pill">{statusLabel}</div>
        <div className="status-row">
          <span className="pill">Payment: {paymentStatus}</span>
          <span className="pill">Approval: {approvalStatus}</span>
        </div>
        <img className="photo-card-img" src={contestant.imageUrl} alt={contestant.photoTitle || 'Contestant entry'} />
          <div className="entry-actions">
            <div>
              <p>{contestant.photoDescription}</p>
            </div>
            <div className="stat-card">
              <span>Current votes</span>
              <strong>{contestant.votes}</strong>
            </div>

            {canVote ? (
              <div id="vote-form">
                <h4>Vote for this entry</h4>
                <VoteForm contestantId={contestant._id} initialFee={voteFee} />
              </div>
            ) : (
              <div className="info-card card">
                <p className="muted" style={{ margin: 0 }}>
                  {isLive
                    ? 'Voting is currently closed. The admin timer must be started to accept votes.'
                    : contestant.entryPaid
                      ? 'Your entry is paid and waiting for admin approval. Share this link while you wait.'
                      : 'Your payment is being confirmed. Once payment settles, your entry will be reviewed for approval.'}
                </p>
              </div>
            )}

            <div className="info-card card">
              <p className="muted" style={{ margin: 0, wordBreak: 'break-all' }}>
                <strong>Share link:</strong>
              </p>
              <CopyShareLink url={contestant.shareUrl} voteTargetId={!isPending ? 'vote-form' : undefined} />
            </div>
          </div>
      </div>
    </main>
  );
}
