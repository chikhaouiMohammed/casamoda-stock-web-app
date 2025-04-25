'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    const unsub = onAuthStateChanged(auth, user => {
      if (user) router.replace('/dashboard');
    });
    return unsub;
  }, [router]);

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/dashboard');
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl mb-6 text-center">Connexion</h1>
        {err && <p className="text-red-500 mb-4">{err}</p>}
        <Label htmlFor="email">Email</Label>
        <TextInput
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="mb-4"
        />
        <Label htmlFor="password">Mot de passe</Label>
        <TextInput
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="mb-6"
        />
        <Button onClick={handleLogin} className="w-full">
          Se connecter
        </Button>
      </div>
    </div>
  );
}
