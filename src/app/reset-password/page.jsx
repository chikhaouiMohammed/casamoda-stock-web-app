'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuth, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { Label, TextInput, Button } from 'flowbite-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const auth = getAuth();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace('/dashboard');
    });
    return unsub;
  }, [router, auth]);

  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const handleReset = async () => {
    try {
      setError('');
      setSuccess('');
      await sendPasswordResetEmail(auth, email);
      setSuccess("Un email de réinitialisation a été envoyé !");
    } catch (e) {
      setError(e.message);
    }
  };

  // submit on Enter
  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleReset();
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center">
          Réinitialiser le mot de passe
        </h1>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <div>
          <Label htmlFor="resetEmail">Email</Label>
          <TextInput
            id="resetEmail"
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
            className="mt-1"
          />
        </div>

        <Button onClick={handleReset} className="w-full">
          Envoyer le lien
        </Button>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:underline"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
