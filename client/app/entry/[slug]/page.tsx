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
      <main style={{ padding: '2rem' }}>
        <h1>Entry not found</h1>
        <p>The entry you are looking for is not live yet or has not been approved.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
        <article style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, color: '#6b21a8', fontWeight: 700 }}>Category: {contestant.category}</p>
              <h1 style={{ margin: '0.3rem 0 0' }}>{contestant.photoTitle || `${contestant.firstName} ${contestant.lastName}`}</h1>
              <p style={{ margin: 0, color: '#6b7280' }}>By {contestant.firstName} {contestant.lastName} • {contestant.ageLabel}</p>
            </div>
            <img src={contestant.imageUrl} alt={contestant.photoTitle || 'Contestant entry'} style={{ width: '100%', borderRadius: 16, objectFit: 'cover', maxHeight: 560 }} />
            <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: 16 }}>
              <p style={{ margin: 0, color: '#334155' }}>{contestant.photoDescription}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '1rem', alignItems: 'start' }}>
            <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 0.5rem', color: '#4b5563' }}>Current votes</p>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{contestant.votes}</p>
            </div>
            <a href={`/vote?contestantId=${contestant._id}`} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '1rem 1.25rem', background: '#6b21a8', color: 'white', border: 'none', borderRadius: 999, cursor: 'pointer' }}>
                Vote for this photo
              </button>
            </a>
            <div style={{ background: '#f7f7ff', padding: '1rem', borderRadius: 16, border: '1px solid #e5e7eb' }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Share this entry</p>
              <a href={contestant.shareUrl} style={{ color: '#475569', wordBreak: 'break-all', textDecoration: 'underline' }}>
                {contestant.shareUrl}
              </a>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
