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
        </div>
      </body>
    </html>
  );
}
