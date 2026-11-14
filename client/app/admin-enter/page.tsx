'use client';

import { FormEvent, useState } from 'react';

const ADMIN_SESSION_KEY = 'marthington-admin-session';

export default function AdminEntryPage() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/admin-enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });

      if (!response.ok) {
        let message = `Admin sign-in failed (${response.status})`;
        try {
          const errorData = await response.json();
          if (typeof errorData.message === 'string') {
            message = errorData.message;
          }
        } catch {
          message = `Admin sign-in failed (${response.status}). The API returned an unreadable response.`;
        }
        throw new Error(message);
      }

      window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ token, email }));
      window.location.assign('/portal-47b2c');
    } catch (error) {
      setStatus(
        error instanceof TypeError && error.message === 'Failed to fetch'
          ? `Could not reach the admin API at ${apiBaseUrl}. Check the deployed API URL, server status, and CORS configuration.`
          : error instanceof Error
            ? error.message
            : 'Unable to access admin portal'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="landing-page" style={{ maxWidth: 640, margin: '0 auto' }}>
      <section className="hero" style={{ gridTemplateColumns: '1fr', textAlign: 'center' }}>
        <div className="hero-copy">
          <span className="eyebrow">Hidden admin access</span>
          <h1>Enter your admin token</h1>
          <p>Use the token only if you are an event organizer. This page leads to the private admin console.</p>
        </div>
      </section>

      <div className="card form-card">
        <form onSubmit={handleSubmit}>
          <label className="field">
            Secret token
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Enter the hidden access token"
            />
          </label>
          <label className="field">
            Admin email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your admin email"
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading || !token || !email}>
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </div>
          {status && <p className="status-message">{status}</p>}
        </form>
      </div>
    </main>
  );
}
