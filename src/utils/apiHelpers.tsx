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
  }).then(r => {
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
  for (let i = 0; i <= retries; i++) {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (isProtected) {
        const token = await getAuth().currentUser?.getIdToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      const res = await fetch(url, { signal, headers });
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
