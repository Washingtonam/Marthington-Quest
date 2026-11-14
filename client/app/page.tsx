'use client';

import SupportAssistant from './components/SupportAssistant';

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Welcome to Quest</span>
          <h1>Every competition deserves a moment in the spotlight.</h1>
          <p>
            Discover competitions, meet their contestants, and support your favorites with a vote.
          </p>

          <div className="hero-cta">
            <a className="btn-primary" href="/competitions">Explore competitions</a>
            <a className="btn-secondary" href="/competitions">Find a competition to enter</a>
          </div>

          <div style={{ marginTop: 18 }}>
            <a className="link-secondary" href="/api-test">Check API status</a>
          </div>
        </div>

        <aside className="hero-panel card">
          <div style={{ display: 'grid', gap: 12 }}>
            <h2>Find your next competition</h2>
            <ul className="feature-list" style={{ paddingLeft: 18, margin: 0 }}>
              <li>Explore active competitions</li>
              <li>Meet contestants and learn the rules</li>
              <li>Register or vote in your chosen competition</li>
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

      <section style={{ display: 'grid', gap: 18, gridTemplateColumns: '1fr 1fr' }}>
        <a href="/competitions" className="card link-card">
          <h3>Find a competition to enter</h3>
          <p>Browse active competitions and register directly with the competition you choose.</p>
        </a>
        <a href="/competitions" className="card link-card">
          <h3>Explore and vote</h3>
          <p>Browse approved contestants and support your favorites in their competition galleries.</p>
        </a>
      </section>

      <SupportAssistant />
    </main>
  );
}
