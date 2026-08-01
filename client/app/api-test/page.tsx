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
    <main style={{ padding: '2rem' }}>
      <h1>API health check</h1>
      <p>{message}</p>
    </main>
  );
}
