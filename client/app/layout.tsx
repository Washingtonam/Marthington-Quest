import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marthington Baby Quest',
  description: 'A modern baby competition platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="site-header">
            <a className="brand" href="/">Marthington Baby Quest</a>
            <nav className="nav-links">
              <a href="/register">Register</a>
              <a href="/vote">Vote</a>
              <a href="/api-test">API Test</a>
            </nav>
          </header>

          <main className="page-content">{children}</main>

          <footer className="site-footer">
            <div className="footer-brand">
              <strong>Marthington Baby Quest</strong>
              <p>Family-first celebration for adorable contestants in Abuja.</p>
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
