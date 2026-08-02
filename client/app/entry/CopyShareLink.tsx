"use client";

import { useState } from 'react';

export default function CopyShareLink({
  url,
  voteTargetId,
}: {
  url: string;
  voteTargetId?: string;
}) {
  const [status, setStatus] = useState('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Copied!');
      setTimeout(() => setStatus(''), 1800);
    } catch (error) {
      setStatus('Copy failed');
      setTimeout(() => setStatus(''), 1800);
    }
  };

  const goToVote = () => {
    if (!voteTargetId) return;
    const target = document.getElementById(voteTargetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.location.hash = `#${voteTargetId}`;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <a href={url} className="link-secondary" target="_blank" rel="noreferrer">
          {url}
        </a>
        <button type="button" className="btn-secondary" onClick={copy}>
          Copy link
        </button>
        {voteTargetId && (
          <button type="button" className="btn-primary" onClick={goToVote}>
            Vote now
          </button>
        )}
      </div>
      {status && <p className="status-message" style={{ margin: '0.5rem 0 0' }}>{status}</p>}
    </div>
  );
}
