'use client';

interface VoteTimerStatusProps {
  voteTimerOpen: boolean;
  voteTimerStatus: string;
  voteTimerSeconds?: number;
  voteTimerRemainingSeconds?: number;
  voteTimerEndsAt?: string | null;
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function VoteTimerStatus({
  voteTimerOpen,
  voteTimerStatus,
  voteTimerSeconds,
  voteTimerRemainingSeconds,
  voteTimerEndsAt,
}: VoteTimerStatusProps) {
  const progress = voteTimerSeconds && typeof voteTimerRemainingSeconds === 'number'
    ? Math.min(100, Math.max(0, ((voteTimerSeconds - voteTimerRemainingSeconds) / voteTimerSeconds) * 100))
    : 0;

  const isFinalCountdown = typeof voteTimerRemainingSeconds === 'number' && voteTimerRemainingSeconds <= 10 && voteTimerRemainingSeconds > 0;
  const cardClass = ['timer-status-card', voteTimerOpen ? 'open-state' : 'closed-state', isFinalCountdown ? 'final-countdown' : ''].join(' ');

  return (
    <section className={cardClass}>
      <div className="timer-status-top">
        <div>
          <p className="eyebrow">Voting timer</p>
          <h2>{voteTimerOpen ? 'Open for votes' : 'Voting is paused'}</h2>
        </div>
        <span className={`timer-pill ${voteTimerOpen ? 'open' : 'closed'}`}>
          {voteTimerOpen ? 'Open' : 'Closed'}
        </span>
      </div>

      <div className="timer-metrics">
        <div className="timer-metric">
          <strong>Mode</strong>
          <div className="muted">{voteTimerStatus || 'inactive'}</div>
        </div>
        <div className="timer-metric">
          <strong>Total duration</strong>
          <div className="muted">{typeof voteTimerSeconds === 'number' ? `${voteTimerSeconds}s` : 'Not set'}</div>
        </div>
        <div className="timer-metric">
          <strong>Remaining</strong>
          <div className="muted">{typeof voteTimerRemainingSeconds === 'number' ? formatSeconds(voteTimerRemainingSeconds) : '—'}</div>
        </div>
        {voteTimerEndsAt && (
          <div className="timer-metric">
            <strong>Ends at</strong>
            <div className="muted">{new Date(voteTimerEndsAt).toLocaleString()}</div>
          </div>
        )}
      </div>

      {voteTimerSeconds && typeof voteTimerRemainingSeconds === 'number' && (
        <div className="progress-track" aria-label="Vote timer progress">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </section>
  );
}
