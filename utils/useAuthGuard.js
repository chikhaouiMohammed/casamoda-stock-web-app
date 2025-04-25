'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

export default function useAuthGuard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Not signed in → kick to /login
        router.replace('/login');
      } else {
        // Signed in → allow render
        setChecking(false);
      }
    });
    return unsubscribe;
  }, [router]);

  return checking;
}
