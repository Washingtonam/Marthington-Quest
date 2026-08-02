"use client";

import { useEffect, useState } from 'react';

export default function ApiTestPage() {
  const [message, setMessage] = useState('Loading...');
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://marthington-quest.onrender.com';

  useEffect(() => {
    fetch(`${apiBaseUrl}/health`)
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('API unreachable'));
  }, [apiBaseUrl]);

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Health check</p>
          <h1>API status</h1>
          <p className="muted">Confirm the backend is reachable and ready to serve the contest.</p>
        </div>
      </div>

      <div className="card">
        <p>{message}</p>
      </div>
    </main>
  );
}
