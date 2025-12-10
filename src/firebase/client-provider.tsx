
'use client';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseApp } from 'firebase/app';
import { ReactNode, useEffect, useState } from 'react';

type FirebaseClientProviderProps = {
  children: ReactNode;
};

export default function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const [firebase, setFirebase] = useState<{
    app: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
  } | null>(null);

  useEffect(() => {
    // This check ensures that Firebase is only initialized on the client side.
    if (typeof window !== 'undefined' && !firebase) {
      const app = initializeFirebase();
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      setFirebase({ app, auth, firestore });
    }
  }, [firebase]);

  // Render children only after Firebase has been initialized.
  if (!firebase) {
    return <>{children}</>;
  }

  return (
    <FirebaseProvider
      firebaseApp={firebase.app}
      auth={firebase.auth}
      firestore={firebase.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
