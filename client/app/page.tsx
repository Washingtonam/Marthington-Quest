'use client';

import { useEffect, useState } from 'react';
import SupportAssistant from './components/SupportAssistant';
import VoteTimerStatus from './components/VoteTimerStatus';

export default function HomePage() {
  const [settings, setSettings] = useState<any>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/settings`, { cache: 'no-store' });
        if (res.ok) {
          setSettings(await res.json());
        }
      } catch (e) {
        // ignore
      }
    }
    loadSettings();
  }, [apiBaseUrl]);

  return (
    <main className="landing-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Competition season is here</span>
          <h1>Marthington Baby Quest — celebrate the cutest moments</h1>
          <p>
            Join parents and fans in a joyful photo contest. Register a contestant, share their story, and let the community vote for the cutest entries.
          </p>

          <div className="hero-cta">
            <a className="btn-primary" href="/register">Register a baby</a>
            <a className="btn-secondary" href="/vote">Browse & vote</a>
          </div>

          <div style={{ marginTop: 18 }}>
            <a className="link-secondary" href="/api-test">Check API status</a>
          </div>
        </div>

        <aside className="hero-panel card">
          <div style={{ display: 'grid', gap: 12 }}>
            <h2>Why people love this</h2>
            <ul className="feature-list" style={{ paddingLeft: 18, margin: 0 }}>
              <li>Simple registration with photo upload and shareable links</li>
              <li>Secure vote processing and transparent leaderboard</li>
              <li>Admin tools kept private and protected for organizers</li>
            </ul>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <div className="card" style={{ padding: 12, flex: 1 }}>
                <strong>Fast setup</strong>
                <div className="muted">Ready in minutes for your event</div>
              </div>
              <div className="card" style={{ padding: 12, flex: 1 }}>
                <strong>Mobile-friendly</strong>
                <div className="muted">Easy voting on phones</div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {settings && (
        <section style={{ marginTop: 24 }}>
          <VoteTimerStatus
            voteTimerOpen={settings.voteTimerOpen}
            voteTimerStatus={settings.voteTimerEffectiveStatus || settings.voteTimerStatus}
            voteTimerSeconds={settings.voteTimerSeconds}
            voteTimerRemainingSeconds={settings.voteTimerRemainingSeconds}
            voteTimerEndsAt={settings.voteTimerEndsAt}
          />
        </section>
      )}

      <section style={{ display: 'grid', gap: 18, gridTemplateColumns: '1fr 1fr' }}>
        <a href="/register" className="card link-card">
          <h3>Register</h3>
          <p>Upload a photo, add details, and complete entry with checkout.</p>
        </a>
        <a href="/vote" className="card link-card">
          <h3>Vote</h3>
          <p>Support your favorites and help them climb the leaderboard.</p>
        </a>
      </section>

      <SupportAssistant />
    </main>
  );
}
