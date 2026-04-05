'use client';

import { SessionProvider } from 'next-auth/react';
import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useStore from '@/store/useStore';
import { ensureFirebaseAnonymousAuth, isFirebaseConfigured } from '@/lib/firebase';

function StoreSessionSync() {
  const { data: session, status } = useSession();
  const { setStorageOwner, loadFromStorage } = useStore();

  useEffect(() => {
    const ownerId = session?.user?.email?.toLowerCase() ?? null;
    setStorageOwner(ownerId);
    if (ownerId) {
      void (async () => {
        if (isFirebaseConfigured) {
          await ensureFirebaseAnonymousAuth();
        }
        await loadFromStorage(ownerId);
      })();
    }
  }, [session?.user?.email, setStorageOwner, loadFromStorage]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setStorageOwner(null);
    }
  }, [status, setStorageOwner]);

  return null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <StoreSessionSync />
      {children}
    </SessionProvider>
  );
}
