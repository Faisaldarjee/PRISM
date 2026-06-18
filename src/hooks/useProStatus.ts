import { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useProStatus() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state settlement first
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setIsPro(false);
        setLoading(false);
        return;
      }

      getDoc(doc(db, 'users', user.uid))
        .then(snap => {
          if (snap.exists()) {
            const data = snap.data();
            setIsPro(data?.isPro === true || data?.vIPStatus === 'PRO' || data?.vIPStatus === 'ELITE');
          } else {
            setIsPro(false);
          }
        })
        .catch((e) => {
          console.error('Error checking useProStatus:', e);
          setIsPro(false);
        })
        .finally(() => setLoading(false));
    });

    return () => unsubscribe();
  }, []);

  return { isPro, loading };
}
