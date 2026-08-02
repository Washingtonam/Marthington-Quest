export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Competition season is here</span>
          <h1>Marthington Baby Quest brings the cutest contestants to life.</h1>
          <p>
            Build excitement with a joyful baby photo contest that makes registration, voting, and admin management effortless for families and fans.
          </p>
          <div className="hero-cta">
            <a className="btn-primary" href="/register">Register now</a>
            <a className="btn-secondary" href="/vote">Vote today</a>
          </div>
        </div>

        <aside className="hero-panel card">
          <h2>Platform highlights</h2>
          <ul className="feature-list">
            <li>Easy contestant registration with photo upload</li>
            <li>Live voting powered by secure checkout</li>
            <li>Admin approval, fees, and stats in one dashboard</li>
            <li>Beautiful experience for parents, supporters, and judges</li>
          </ul>
        </aside>
      </section>

      <section className="cards-grid">
        <a href="/register" className="card link-card">
          <h3>Register a contestant</h3>
          <p>Submit a baby’s photo, share their story, and complete entry with a smooth checkout.</p>
        </a>
        <a href="/vote" className="card link-card">
          <h3>Vote for entries</h3>
          <p>Browse contestants, cast votes, and support the cutest pictures in the contest.</p>
        </a>
        <a href="/admin" className="card link-card">
          <h3>Admin dashboard</h3>
          <p>Approve entries, update fees, and monitor contest activity.</p>
        </a>
        <a href="/api-test" className="card link-card">
          <h3>API status</h3>
          <p>Check backend connectivity and make sure everything is ready to launch.</p>
        </a>
      </section>
    </main>
  );
}
