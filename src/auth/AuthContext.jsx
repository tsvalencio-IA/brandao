import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { APP } from '../config/app';
import { auth, db, firebaseConfigured, BOOTSTRAP_ADMIN_UID } from '../config/firebase';

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

const bootstrapAdmin = (fbUser) => ({
  uid: fbUser.uid,
  email: fbUser.email,
  displayName: fbUser.displayName || fbUser.email,
  name: fbUser.displayName || fbUser.email,
  role: 'gestor',
  active: true,
  status_usuario: 'ATIVO',
  bootstrap: true,
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
      setAuthError(null);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        if (fbUser.uid === BOOTSTRAP_ADMIN_UID) {
          setUser(bootstrapAdmin(fbUser));
          setLoading(false);
          return;
        }

        const profile = await getDoc(doc(db, 'users', fbUser.uid));
        if (!profile.exists()) {
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email,
            role: null,
            active: true,
          });
        } else {
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            ...profile.data(),
          });
        }
      } catch (e) {
        setAuthError(e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    if (!firebaseConfigured) throw new Error('Firebase Auth ainda não configurado.');
    return signInWithEmailAndPassword(auth, email, password);
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
