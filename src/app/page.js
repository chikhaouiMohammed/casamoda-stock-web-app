// /app/page.jsx
'use client';              // ← add this

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../utils/firebase';


export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace('/dashboard');
      else     router.replace('/login');
    });
    return unsub;
  }, [router]);

  return null;
}
