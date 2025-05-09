'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { TextInput, Button, Label } from 'flowbite-react';
import { auth } from '../../../utils/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr]           = useState('');

  // If already logged in, go straight to dashboard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace('/dashboard');
    });
    return unsub;
  }, [router]);

  const handleLogin = async () => {
    try {
      setErr('');
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/dashboard');
    } catch (e) {
      setErr(e.message);
    }
  };

  // submit on Enter
  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center">Connexion</h1>
        {err && <p className="text-red-500 text-sm">{err}</p>}

        <div>
          <Label htmlFor="email">Email</Label>
          <TextInput
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <TextInput
            id="password"
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={onKeyDown}
            className="mt-1"
          />
        </div>

        <Button onClick={handleLogin} className="w-full">
          Se connecter
        </Button>

        <div className="text-center">
          <Link
            href="/reset-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      </div>
    </div>
  );
}
