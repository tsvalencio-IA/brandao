import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBGP3xeCIWPPCz5dbZRYzuLyKVj8ZaoHOo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'sigfrota-d64d0.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sigfrota-d64d0',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'sigfrota-d64d0.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '99786546073',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:99786546073:web:6b1edeb23c21e7f3665108',
};

export const BOOTSTRAP_ADMIN_UID =
  import.meta.env.VITE_BOOTSTRAP_ADMIN_UID || 'uwUU8OkzRbfBtlVR1oeT72H0jYE2';

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
