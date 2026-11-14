'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CopyShareLink from '../../../../entry/CopyShareLink';
import VoteForm from '../../../../entry/VoteForm';

interface Competition {
  _id: string;
  title: string;
  slug: string;
  voteFee: number;
  status: 'draft' | 'active' | 'closed';
  startDate?: string;
  endDate?: string;
}

interface Contestant {
  _id: string;
  firstName: string;
  lastName: string;
  photoTitle: string;
  photoDescription: string;
  imageUrl: string;
  votes: number;
  isApproved: boolean;
  entryPaid: boolean;
}

interface VotingSettings {
  voteTimerOpen: boolean;
}

export default function ContestantVotePage({
  params,
}: {
  params: { slug: string; contestantSlug: string };
}) {
  const searchParams = useSearchParams();
  const paymentReference = searchParams.get('tx_ref');
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [contestant, setContestant] = useState<Contestant | null>(null);
  const [votingSettings, setVotingSettings] = useState<VotingSettings | null>(null);
  const [error, setError] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentCheckAttempt, setPaymentCheckAttempt] = useState(0);
  const [shareUrl, setShareUrl] = useState('');
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    let active = true;
    const competitionSlug = encodeURIComponent(params.slug);
    const contestantSlug = encodeURIComponent(params.contestantSlug);

    async function loadPage() {
      try {
        const competitionResponse = await fetch(`${apiBaseUrl}/api/competitions/${competitionSlug}`, { cache: 'no-store' });
        if (!competitionResponse.ok) throw new Error('Competition not found');
        const competitionResult: Competition = await competitionResponse.json();
        if (!active) return;
        setCompetition(competitionResult);

        const contestantUrl = `${apiBaseUrl}/api/competitions/${competitionSlug}/contestants/slug/${contestantSlug}?public=true`;
        const contestantResponse = await fetch(contestantUrl, { cache: 'no-store' });
        if (!contestantResponse.ok) throw new Error('Approved contestant not found in this competition');
        const contestantResult: Contestant = await contestantResponse.json();
        if (!active) return;
        setContestant(contestantResult);

        const settingsResponse = await fetch(
          `${apiBaseUrl}/api/settings?competitionSlug=${competitionSlug}`,
          { cache: 'no-store' }
        );
        if (!settingsResponse.ok) throw new Error('Unable to load voting settings');
        const settingsResult: VotingSettings = await settingsResponse.json();
        if (active) setVotingSettings(settingsResult);
      } catch (requestError: unknown) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load contestant');
      }
    }

    loadPage();
    const refresh = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/competitions/${competitionSlug}/contestants/slug/${contestantSlug}?public=true`,
          { cache: 'no-store' }
        );
        if (!response.ok) throw new Error('Unable to refresh contestant votes');
        const result: Contestant = await response.json();
        if (active) setContestant(result);
      } catch (requestError: unknown) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to refresh contestant');
      }
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, [apiBaseUrl, params.slug, params.contestantSlug]);

  useEffect(() => {
    if (!paymentReference) return;
    let active = true;

    async function verifyPayment() {
      setPaymentNotice('Verifying your payment with Flutterwave…');
      try {
        const response = await fetch(`${apiBaseUrl}/api/payments/flutterwave/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tx_ref: paymentReference }),
        });
        const result = await response.json();
        if (!active) return;
        if (response.status === 202) {
          setPaymentPending(true);
          setPaymentNotice(result.message || 'Payment is not confirmed yet. Please check again shortly.');
          return;
        }
        if (!response.ok) {
          throw new Error(result.message || 'Unable to verify your payment');
        }

        const contestantUrl =
          `${apiBaseUrl}/api/competitions/${encodeURIComponent(params.slug)}/contestants/slug/` +
          `${encodeURIComponent(params.contestantSlug)}?public=true`;
        const contestantResponse = await fetch(contestantUrl, { cache: 'no-store' });
        if (!contestantResponse.ok) throw new Error('Payment confirmed, but contestant votes could not be refreshed');
        const contestantResult: Contestant = await contestantResponse.json();
        if (!active) return;
        setContestant(contestantResult);
        setPaymentPending(false);
        setPaymentNotice('Payment confirmed. Your votes have been added. Thank you!');
      } catch (requestError: unknown) {
        if (active) {
          setPaymentPending(false);
          setPaymentNotice(requestError instanceof Error ? requestError.message : 'Unable to verify your payment');
        }
      }
    }

    void verifyPayment();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, params.slug, params.contestantSlug, paymentReference, paymentCheckAttempt]);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/competitions/${encodeURIComponent(params.slug)}/vote/${encodeURIComponent(params.contestantSlug)}`);
  }, [params.slug, params.contestantSlug]);

  if (error) return <main className="page-shell"><h1>{error}</h1></main>;
  if (!competition || !contestant) return <main className="page-shell"><p>Loading contestant...</p></main>;

  const now = Date.now();
  const startsAt = competition.startDate ? new Date(competition.startDate).getTime() : null;
  const endsAt = competition.endDate ? new Date(competition.endDate).getTime() : null;
  const withinCompetitionDates =
    (startsAt === null || startsAt <= now) &&
    (endsAt === null || endsAt >= now);
  const votingOpen =
    competition.status === 'active' &&
    withinCompetitionDates &&
    votingSettings?.voteTimerOpen === true;

  return (
    <main className="page-shell">
      <a className="link-secondary" href={`/competitions/${encodeURIComponent(competition.slug)}`}>
        Back to {competition.title}
      </a>
      <div className="page-header">
        <div>
          <p className="eyebrow">{competition.title} · Contestant</p>
          <h1>{contestant.photoTitle || `${contestant.firstName} ${contestant.lastName}`}</h1>
          <p className="muted">{contestant.firstName} {contestant.lastName}</p>
        </div>
      </div>

      {paymentNotice && (
        <div>
          <p className="status-message" role="status">{paymentNotice}</p>
          {paymentPending && (
            <button type="button" className="btn-secondary" onClick={() => setPaymentCheckAttempt((attempt) => attempt + 1)}>
              Check payment again
            </button>
          )}
        </div>
      )}

      <div className="entry-card card">
        {contestant.imageUrl && (
          <img
            className="photo-card-img"
            src={contestant.imageUrl}
            alt={contestant.photoTitle || `${contestant.firstName} ${contestant.lastName}`}
          />
        )}
        {contestant.photoDescription && <p>{contestant.photoDescription}</p>}
        <div className="stat-card">
          <span>Live vote count</span>
          <strong aria-live="polite">{contestant.votes}</strong>
        </div>
        <section className="info-card card" aria-label="Share contestant page">
          <h2>Share this contestant</h2>
          <CopyShareLink url={shareUrl} />
        </section>
        <section className="info-card card" aria-label="Buy votes">
          <h2>Buy vote packs</h2>
          <p className="muted">Each vote costs ₦{competition.voteFee}. Your payment supports this contestant.</p>
          {votingOpen ? (
            <VoteForm
              contestantId={contestant._id}
              competitionId={competition._id}
              initialFee={competition.voteFee}
            />
          ) : (
            <p className="status-message">Voting is currently closed for this competition.</p>
          )}
        </section>
      </div>
    </main>
  );
}
