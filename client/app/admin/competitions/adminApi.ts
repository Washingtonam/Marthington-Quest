export const ADMIN_SESSION_KEY = 'marthington-admin-session';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface AdminSession {
  token: string;
  email: string;
}

export async function adminRequest<T>(
  path: string,
  session: AdminSession,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.token}`);
  headers.set('x-admin-email', session.email);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText || 'Request failed'}`;
    try {
      const body = await response.json();
      const messages = [body?.message, body?.error].filter(
        (value): value is string => typeof value === 'string' && value.length > 0
      );
      if (messages.length) detail = messages.join('; ');
    } catch {
      detail += ': The API returned an unreadable response.';
    }
    if (response.status === 401) {
      throw new Error(`Admin access was rejected (${detail}). Sign in again and check the backend admin settings.`);
    }
    throw new Error(detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
