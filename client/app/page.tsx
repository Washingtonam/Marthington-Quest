export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Competition season is here</span>
          <h1>Meet the cutest entries and support your favorites with every vote.</h1>
          <p>
            Marthington Quest makes registration, voting, and management effortless. Launch a lively baby competition with compelling storytelling, secure payments, and an elegant experience for families and fans.
          </p>
          <div className="hero-cta">
            <a className="btn-primary" href="/register">Register now</a>
            <a className="btn-secondary" href="/vote">Vote today</a>
          </div>
        </div>

        <aside className="hero-panel card">
          <h2>Platform highlights</h2>
          <ul className="feature-list">
            <li>Beautiful landing page and onboarding flow</li>
            <li>Secure entry registration with photo upload</li>
            <li>Integrated vote checkout experience</li>
            <li>Simple admin controls and approval workflow</li>
          </ul>
        </aside>
      </section>

      <section className="cards-grid">
        <a href="/register" className="card link-card">
          <h3>Register a contestant</h3>
          <p>Submit a child’s photo, details, and complete entry payment with ease.</p>
        </a>
        <a href="/vote" className="card link-card">
          <h3>Vote for entries</h3>
          <p>Support your favorite contestants with secure voting and instant checkout.</p>
        </a>
        <a href="/admin" className="card link-card">
          <h3>Admin dashboard</h3>
          <p>Review pending entries, approve contestants, and monitor platform stats.</p>
        </a>
        <a href="/api-test" className="card link-card">
          <h3>API status</h3>
          <p>Confirm the backend health and make sure your competition is ready to run.</p>
        </a>
      </section>
    </main>
  );
}
