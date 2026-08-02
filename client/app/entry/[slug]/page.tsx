import type { Metadata } from 'next';

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
  const resp = await fetch(`${apiBaseUrl}/api/contestants/slug/${slug}`);
  if (!resp.ok) return null;
  return resp.json();
}

export default async function EntryPage({ params }: { params: { slug: string } }) {
  const contestant = await fetchEntry(params.slug);

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

  const isPending = !contestant.isApproved || !contestant.entryPaid;
  const statusLabel = contestant.isApproved
    ? 'Live entry'
    : contestant.entryPaid
    ? 'Awaiting approval'
    : 'Payment pending';

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
        <img src={contestant.imageUrl} alt={contestant.photoTitle || 'Contestant entry'} />
        <div className="entry-actions">
          <div>
            <p>{contestant.photoDescription}</p>
          </div>
          <div className="stat-card">
            <span>Current votes</span>
            <strong>{contestant.votes}</strong>
          </div>
          {isPending ? (
            <div className="info-card card">
              <p className="muted" style={{ margin: 0 }}>
                {contestant.entryPaid
                  ? 'Your entry is paid and waiting for admin approval. Share this link while you wait.'
                  : 'Your payment is being confirmed. Once payment settles, your entry will be reviewed for approval.'}
              </p>
            </div>
          ) : (
            <a href={`/vote?contestantId=${contestant._id}`} className="btn-primary">Vote for this photo</a>
          )}
          <div className="info-card card">
            <p className="muted" style={{ margin: 0, wordBreak: 'break-all' }}>
              <strong>Share link:</strong>
              <br />
              <a href={contestant.shareUrl} className="link-secondary">{contestant.shareUrl}</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
