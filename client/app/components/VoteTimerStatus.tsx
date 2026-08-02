'use client';

interface VoteTimerStatusProps {
  voteTimerOpen: boolean;
  voteTimerStatus: string;
  voteTimerRemainingSeconds?: number;
  voteTimerEndsAt?: string | null;
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function VoteTimerStatus({ voteTimerOpen, voteTimerStatus, voteTimerRemainingSeconds, voteTimerEndsAt }: VoteTimerStatusProps) {
  return (
    <div className="card info-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <div>
        <strong>Voting status</strong>
        <div className="muted">{voteTimerOpen ? 'Open' : 'Closed'}</div>
      </div>
      <div>
        <strong>Timer mode</strong>
        <div className="muted">{voteTimerStatus || 'inactive'}</div>
      </div>
      {typeof voteTimerRemainingSeconds === 'number' && (
        <div>
          <strong>Remaining</strong>
          <div className="muted">{formatSeconds(voteTimerRemainingSeconds)}</div>
        </div>
      )}
      {voteTimerEndsAt && (
        <div>
          <strong>Ends at</strong>
          <div className="muted">{new Date(voteTimerEndsAt).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}
