import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marthington Quest',
  description: 'A modern baby competition platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
