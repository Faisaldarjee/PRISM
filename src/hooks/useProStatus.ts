import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { checkAndUpdateProStatus, createOrGetUserProfile } from '../services/userService';

export interface UserPlan {
  isPro: boolean;
  plan: 'free' | 'pro_early' | 'pro_paid';
  earlyAccessNumber: number | null;
  earlyAccessExpiresAt: string | null;
  daysRemaining: number | null;
}

export function useProStatus(): UserPlan & { loading: boolean } {
  const [status, setStatus] = useState<UserPlan>({
    isPro: false,
    plan: 'free',
    earlyAccessNumber: null,
    earlyAccessExpiresAt: null,
    daysRemaining: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus({ 
          isPro: false, 
          plan: 'free', 
          earlyAccessNumber: null,
          earlyAccessExpiresAt: null,
          daysRemaining: null 
        });
        setLoading(false);
        return;
      }
      
      try {
        // Create profile if new user, check expiry if existing
        await createOrGetUserProfile(user);
        const data = await checkAndUpdateProStatus(user.uid);
        
        let daysRemaining = null;
        if (data?.earlyAccessExpiresAt) {
          const expiry = new Date(data.earlyAccessExpiresAt);
          const now = new Date();
          const diff = expiry.getTime() - now.getTime();
          daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }
        
        setStatus({
          isPro: data?.isPro || false,
          plan: data?.plan || 'free',
          earlyAccessNumber: data?.earlyAccessNumber || null,
          earlyAccessExpiresAt: data?.earlyAccessExpiresAt || null,
          daysRemaining,
        });
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isOffline = errMsg.toLowerCase().includes('offline') || errMsg.toLowerCase().includes('failed to get document');
        if (isOffline) {
          console.warn('[useProStatus] Client is offline, falling back to cached or default status gracefully.');
        } else {
          console.error('useProStatus error:', err);
        }
        setStatus({ 
          isPro: false, 
          plan: 'free',
          earlyAccessNumber: null,
          earlyAccessExpiresAt: null,
          daysRemaining: null
        });
      } finally {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  return { ...status, loading };
}
