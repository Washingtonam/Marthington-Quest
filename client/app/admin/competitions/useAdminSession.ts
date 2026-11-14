'use client';

import { useEffect, useState } from 'react';
import { ADMIN_SESSION_KEY, AdminSession } from './adminApi';

export default function useAdminSession() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (
          parsed &&
          typeof parsed === 'object' &&
          'token' in parsed &&
          'email' in parsed &&
          typeof parsed.token === 'string' &&
          typeof parsed.email === 'string'
        ) {
          setSession({ token: parsed.token, email: parsed.email });
        } else {
          window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
        }
      }
    } catch {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  const signOut = () => {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setSession(null);
  };

  return { session, ready, signOut };
}
