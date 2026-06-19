import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
      setChecking(false);
    });
    return () => unsubscribe();
  }, []);
  
  if (checking) {
    return (
      <div className="min-h-screen bg-[#05070C] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#D4A843]/30 border-t-[#D4A843] rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}
