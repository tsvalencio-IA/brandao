import { deleteApp, getApp, getApps, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase';

const SECONDARY_APP = 'sigfrota-user-creator';

function getSecondaryApp() {
  const existing = getApps().find((app) => app.name === SECONDARY_APP);
  return existing || initializeApp(firebaseConfig, SECONDARY_APP);
}

export async function createFirebaseUser({ email, password }) {
  const app = getSecondaryApp();
  const secondaryAuth = getAuth(app);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = credential.user.uid;
    await signOut(secondaryAuth);
    return { uid, email: credential.user.email };
  } finally {
    try {
      await deleteApp(app);
    } catch {
      // A instância secundária pode já ter sido encerrada.
    }
  }
}
