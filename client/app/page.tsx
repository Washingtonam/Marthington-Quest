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
          <span className="eyebrow">Welcome to Quest</span>
          <h1>Every competition deserves a moment in the spotlight.</h1>
          <p>
            Discover competitions, meet the contestants, and support your favorites with a vote. Marthington Baby Quest is currently featured on Quest.
          </p>

          <div className="hero-cta">
            <a className="btn-primary" href="/vote">Explore competitions</a>
            <a className="btn-secondary" href="/register">Enter Baby Quest</a>
          </div>

          <div style={{ marginTop: 18 }}>
            <a className="link-secondary" href="/api-test">Check API status</a>
          </div>
        </div>

        <aside className="hero-panel card">
          <div style={{ display: 'grid', gap: 12 }}>
            <h2>Featured competition: Marthington Baby Quest</h2>
            <ul className="feature-list" style={{ paddingLeft: 18, margin: 0 }}>
              <li>Celebrate young contestants and share their stories</li>
              <li>Support your favorites with online voting</li>
              <li>Follow the competition leaderboard</li>
            </ul>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <div className="card" style={{ padding: 12, flex: 1 }}>
                <strong>Discover</strong>
                <div className="muted">Find a competition to follow</div>
              </div>
              <div className="card" style={{ padding: 12, flex: 1 }}>
                <strong>Vote online</strong>
                <div className="muted">Support your favorites on any device</div>
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
          <h3>Enter Marthington Baby Quest</h3>
          <p>Register a young contestant and share their story in our featured competition.</p>
        </a>
        <a href="/vote" className="card link-card">
          <h3>Explore and vote</h3>
          <p>Browse contestants in Marthington Baby Quest and support your favorites.</p>
        </a>
      </section>

      <SupportAssistant />
    </main>
  );
}
