import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ztlbdmdfxyzojxbkjodr.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0bGJkbWRmeHl6b2p4Ymtqb2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTUxNTUsImV4cCI6MjEwNzM3MTE1NX0.Wycmwfgbd9ARDtyqNmYA5Ua9flB1PAJd9QT1mo8expQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Helper to get the current access token for Authorization header.
 * Returns null if not logged in or during offline/guest mode.
 */
export async function getAuthHeader() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` };
    }
  } catch (err) {
    console.warn('Could not retrieve Supabase session:', err);
  }
  return {};
}

/**
 * Universal authenticated fetch wrapper that injects Bearer token if user is signed in.
 */
export async function authFetch(url, options = {}) {
  const authHeaders = await getAuthHeader();
  const mergedHeaders = {
    ...authHeaders,
    ...(options.headers || {})
  };
  return fetch(url, {
    ...options,
    headers: mergedHeaders
  });
}

// Global fetch interceptor: automatically attaches Supabase Bearer token to all /api/* requests
// This guarantees that ANY component calling standard fetch('/api/...') or uploading files always uses the active user's session
if (typeof window !== 'undefined' && window.fetch) {
  const nativeFetch = window.fetch;
  window.fetch = async function (resource, init = {}) {
    try {
      const urlStr = typeof resource === 'string' ? resource : resource?.url || '';
      if (urlStr.includes('/api/')) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          init = init || {};
          let headers;
          if (init.headers instanceof Headers) {
            headers = init.headers;
          } else if (Array.isArray(init.headers)) {
            headers = new Headers(init.headers);
          } else if (typeof init.headers === 'object' && init.headers !== null) {
            headers = new Headers(init.headers);
          } else {
            headers = new Headers();
          }

          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${session.access_token}`);
          }
          init.headers = headers;
        }
      }
    } catch (e) {
      // Ignore interception error and proceed with fetch
    }
    return nativeFetch.call(window, resource, init);
  };
}
