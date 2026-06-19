import React from 'react';
import { getAuth } from 'firebase/auth';

export async function authFetch(url: string, signal?: AbortSignal) {
  const token = await getAuth().currentUser?.getIdToken();
  return fetch(url, {
    signal,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }).then(async r => {
    if (r.status === 403) {
      const user = getAuth().currentUser;
      if (user) {
        try {
          const freshToken = await user.getIdToken(true);
          const retryRes = await fetch(url, {
            signal,
            headers: {
              'Authorization': `Bearer ${freshToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (retryRes.status === 403) {
            console.warn('[API Auth] 403 persisted after token refresh in authFetch. Clearing stale session.');
            await getAuth().signOut();
            throw new Error('HTTP 440 Session Expired');
          }
          if (!retryRes.ok) throw new Error(`HTTP ${retryRes.status}`);
          return retryRes.json();
        } catch (e: any) {
          if (e.name === 'AbortError' || e.message?.includes('aborted') || signal?.aborted) {
            // Re-throw silently for expected request cancellations
            throw e;
          }
          console.error('[API Auth] Error refreshing token or retrying request:', e);
          throw e;
        }
      }
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}

export async function fetchWithRetry(
  url: string,
  signal: AbortSignal,
  retries = 2
): Promise<any> {
  const isProtected = url.includes('/api/predict') || url.includes('/api/gemini') || url.includes('/api/retrain');
  let forceRefresh = false;
  for (let i = 0; i <= retries; i++) {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (isProtected) {
        const user = getAuth().currentUser;
        if (user) {
          const token = await user.getIdToken(forceRefresh);
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      const res = await fetch(url, { signal, headers });
      if (res.status === 403 && isProtected) {
        if (!forceRefresh) {
          forceRefresh = true;
          i--; // Redo this attempt with fresh token
          continue;
        } else {
          console.warn('[API Auth] 403 persisted after token refresh in fetchWithRetry. Clearing stale session.');
          await getAuth().signOut();
          throw new Error('HTTP 440 Session Expired');
        }
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 1s, 2s backoff
    }
  }
}

export const SectionSkeleton = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-5 h-5 border-2 border-[#D4A843]/30 border-t-[#D4A843] rounded-full animate-spin" />
  </div>
);

export const SectionError = ({ message }: { message: string }) => (
  <div className="text-[#8892A4] text-sm text-center py-6 font-sans">
    {message}
  </div>
);
