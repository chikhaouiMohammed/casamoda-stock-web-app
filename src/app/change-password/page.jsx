'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from 'firebase/auth';
import { Label, TextInput, Button } from 'flowbite-react';
import AppNavbar from '@/components/AppNavbar';

export default function ChangePasswordPage() {
  const router = useRouter();
  const auth = getAuth();

  // Auth guard
  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/login');
      } else {
        setCheckingAuth(false);
      }
    });
    return unsub;
  }, [router, auth]);

  // Form state
  const [oldPwd, setOldPwd]       = useState('');
  const [newPwd, setNewPwd]       = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (newPwd !== confirmPwd) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (newPwd.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      setError("Impossible de récupérer l'utilisateur.");
      return;
    }

    try {
      // Réauthentifier l'utilisateur
      const cred = EmailAuthProvider.credential(user.email, oldPwd);
      await reauthenticateWithCredential(user, cred);

      // Mettre à jour le mot de passe
      await updatePassword(user, newPwd);
      setSuccess('Mot de passe mis à jour avec succès !');
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (e) {
      setError(e.message);
    }
  };

  if (checkingAuth) return null;

  return (
    <>
      <AppNavbar />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md space-y-6">
          <h1 className="text-2xl font-semibold text-gray-800 text-center">
            Modifier le mot de passe
          </h1>

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}
          {success && (
            <p className="text-green-600 text-sm text-center">{success}</p>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="oldPwd" className="block text-black">
                Ancien mot de passe
              </Label>
              <TextInput
                id="oldPwd"
                type="password"
                value={oldPwd}
                onChange={e => setOldPwd(e.target.value)}
                placeholder="••••••••"
                className="mt-1 bg-white text-gray-800"
              />
            </div>

            <div>
              <Label htmlFor="newPwd" className="block text-black">
                Nouveau mot de passe
              </Label>
              <TextInput
                id="newPwd"
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="••••••••"
                className="mt-1 bg-white text-gray-800"
              />
            </div>

            <div>
              <Label htmlFor="confirmPwd" className="block text-black">
                Confirmer le mot de passe
              </Label>
              <TextInput
                id="confirmPwd"
                type="password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="••••••••"
                className="mt-1 bg-white text-gray-800"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full bg-[#005D2F] hover:bg-[#004a24] text-white"
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </>
  );
}
