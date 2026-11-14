import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quest | Online Voting Competitions',
  description: 'Discover competitions, support your favorites, and cast your vote on Quest.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="site-header">
            <a className="brand" href="/">Quest</a>
            <nav className="nav-links">
              <a href="/register">Register</a>
              <a href="/vote">Vote</a>
              <a href="/api-test">API Test</a>
            </nav>
          </header>

          <main className="page-content">{children}</main>

          <footer className="site-footer">
            <div className="footer-brand">
              <strong>Quest</strong>
              <p>An online home for competitions and community voting, starting with Marthington Baby Quest.</p>
            </div>
            <div className="footer-links">
              <a href="/about-us">About us</a>
              <a href="/terms-and-conditions">Terms &amp; conditions</a>
              <a href="mailto:admin@marthington.com">Email us</a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
