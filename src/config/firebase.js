import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCZwCeS_dxLT488qOkv76hgs-LvLjQq65k',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'sigfrota-9d26e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sigfrota-9d26e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'sigfrota-9d26e.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '144526221423',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:144526221423:web:69cd424446328438682d9a',
};

export const BOOTSTRAP_ADMIN_UID =
  import.meta.env.VITE_BOOTSTRAP_ADMIN_UID || 'e2hp11Q3wqSiVD1I1YiUGpYgGsi2';

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

const app = firebaseConfigured ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

export { app, auth, db };
