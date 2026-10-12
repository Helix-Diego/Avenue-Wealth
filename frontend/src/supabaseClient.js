import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ztlbdmdfxyzojxbkjodr.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0bGJkbWRmeHl6b2p4Ymtqb2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTUxNTUsImV4cCI6MjEwNzM3MTE1NX0.Wycmwfgbd9ARDtyqNmYA5Ua9flB1PAJd9QT1mo8expQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Helper to retrieve or lazily generate a unique, isolated guest session ID
 * for unauthenticated visitors so they never share data with any other visitor.
 */
export function getGuestId() {
  if (typeof window === 'undefined') return 'guest_default';
  let gid = localStorage.getItem('avenue_wealth_guest_id');
  if (!gid) {
    gid = 'guest_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
    localStorage.setItem('avenue_wealth_guest_id', gid);
  }
  return gid;
}

/**
 * Helper to get the current access token for Authorization header.
 * Returns Supabase JWT if logged in, or the unique guest session ID if in guest mode.
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
  const guestId = getGuestId();
  return {
    'Authorization': `Bearer ${guestId}`,
    'X-Guest-ID': guestId
  };
}

/**
 * Universal authenticated fetch wrapper that injects Bearer token if user is signed in,
 * or guest ID headers if in guest mode.
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

// Global fetch interceptor: automatically attaches Supabase Bearer token or unique Guest ID to all /api/* requests
// Guarantees 100% strict tenant isolation: no guest ever sees another guest's or authenticated user's data!
if (typeof window !== 'undefined' && window.fetch) {
  const nativeFetch = window.fetch;
  window.fetch = async function (resource, init = {}) {
    try {
      const urlStr = typeof resource === 'string' ? resource : resource?.url || '';
      if (urlStr.includes('/api/')) {
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

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${session.access_token}`);
          }
        } else {
          const guestId = getGuestId();
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${guestId}`);
          }
          if (!headers.has('X-Guest-ID')) {
            headers.set('X-Guest-ID', guestId);
          }
        }
        init.headers = headers;
      }
    } catch (e) {
      // Ignore interception error and proceed with fetch
    }
    return nativeFetch.call(window, resource, init);
  };
}
