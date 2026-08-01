"use client";

import { useEffect, useState } from 'react';

export default function ApiTestPage() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/health`)
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('API unreachable'));
  }, []);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>API health check</h1>
      <p>{message}</p>
    </main>
  );
}
