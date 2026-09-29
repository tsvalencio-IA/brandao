import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { APP } from '../config/app';
import { auth, db, firebaseConfigured } from '../config/firebase';

const AuthContext = createContext(null);
const SETUP_ROLE_KEY = 'sigfrota:setup-role';

const setupUser = (role) => ({
  uid: 'setup-mode',
  email: 'configuracao@local',
  displayName: 'Modo de configuração',
  name: 'Modo de configuração',
  role,
  active: true,
  unit: '',
  workshop_id: '',
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (APP.setupMode || !firebaseConfigured) {
      const role = localStorage.getItem(SETUP_ROLE_KEY) || 'gestor';
      setUser(setupUser(role));
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const profile = await getDoc(doc(db, 'users', fbUser.uid));
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          ...(profile.exists() ? profile.data() : {}),
        });
      } catch (e) {
        setAuthError(e);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    if (APP.setupMode || !firebaseConfigured) return;
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (APP.setupMode || !firebaseConfigured) return;
    await signOut(auth);
  };

  const resetPassword = async (email) => {
    if (!firebaseConfigured) throw new Error('Firebase Auth ainda não configurado.');
    await sendPasswordResetEmail(auth, email);
  };

  const switchSetupRole = (role) => {
    if (!APP.setupMode) return;
    localStorage.setItem(SETUP_ROLE_KEY, role);
    setUser(setupUser(role));
  };

  const value = useMemo(() => ({
    user,
    userRole: user?.role || null,
    isAuthenticated: Boolean(user),
    loading,
    authError,
    login,
    logout,
    resetPassword,
    switchSetupRole,
    setupMode: APP.setupMode || !firebaseConfigured,
    firebaseConfigured,
  }), [user, loading, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
};
