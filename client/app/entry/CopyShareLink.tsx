"use client";

import { useState } from 'react';

export default function CopyShareLink({ url }: { url: string }) {
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <a href={url} className="link-secondary" target="_blank" rel="noreferrer">
          {url}
        </a>
        <button type="button" className="btn-secondary" onClick={copy}>
          Copy link
        </button>
      </div>
      {status && <p className="status-message" style={{ margin: '0.5rem 0 0' }}>{status}</p>}
    </div>
  );
}
