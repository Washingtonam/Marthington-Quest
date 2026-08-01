export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', lineHeight: 1.6 }}>
      <h1>Marthington Quest</h1>
      <p>Welcome to your baby competition platform starter.</p>
      <ul>
        <li>Public competition landing page</li>
        <li>Entry submission flow</li>
        <li>Voting and payment integration</li>
        <li>Admin dashboard foundation</li>
      </ul>
      <div style={{ marginTop: '1.5rem' }}>
        <h2>Quick links</h2>
        <ul>
          <li><a href="/register">Register a contestant</a></li>
          <li><a href="/vote">Vote for contestants</a></li>
          <li><a href="/admin">Admin dashboard</a></li>
          <li><a href="/api-test">API health check</a></li>
        </ul>
      </div>
      <p>Next, we can wire up contestant registration, payment hooks, and the admin panel.</p>
    </main>
  );
}
