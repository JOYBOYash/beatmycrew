
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirebaseConfig } from './config';
export {
  useFirebaseApp,
  useFirestore,
  useAuth,
  FirebaseProvider,
} from './provider';
export { useUser } from './auth/use-user';
export { useCollection } from './firestore/use-collection';
export { useDocument } from './firestore/use-doc';

// Initializes and returns a Firebase App instance.
export function initializeFirebase(): FirebaseApp {
  const firebaseConfig = getFirebaseConfig();

  // This is a client-only app, so we can rely on `getApps`
  if (getApps().length) {
    return getApp();
  }

  return initializeApp(firebaseConfig);
}
