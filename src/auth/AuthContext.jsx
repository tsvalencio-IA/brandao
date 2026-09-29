import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from 'firebase/auth';
import {
  addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc
} from 'firebase/firestore';
import { APP } from '../config/app';
import { auth, db, firebaseConfigured, BOOTSTRAP_ADMIN_UID } from '../config/firebase';

const AuthContext = createContext(null);
const SETUP_ROLE_KEY = 'sigfrota:setup-role';
const SESSION_KEY = 'sigfrota:session-id';

const setupUser = (role) => ({
  uid: 'setup-mode',
  email: 'configuracao@local',
  displayName: 'Modo de configuração',
  name: 'Modo de configuração',
  role,
  active: true,
  status_usuario: 'ATIVO',
  unit: '',
  workshop_id: '',
});

const sessionId = () => {
  let value = sessionStorage.getItem(SESSION_KEY);
  if (!value) {
    value = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, value);
  }
  return value;
};

async function writeAuditEvent(fbUser, action, extra = {}) {
  if (!db || !fbUser?.uid) return;
  try {
    await addDoc(collection(db, 'audit_logs'), {
      user_id: fbUser.uid,
      user_name: fbUser.displayName || fbUser.email || 'Usuário',
      user_email: fbUser.email || null,
      role: extra.role || null,
      action,
      entity: extra.entity || 'Auth',
      record_id: extra.record_id || fbUser.uid,
      previous_value: extra.before ?? null,
      new_value: extra.after ?? null,
      justification: extra.justification || null,
      context: {
        session_id: sessionId(),
        source: 'SIGFROTA_WEB',
        ...(extra.context || {}),
      },
      date_time: new Date().toISOString(),
      created_at_server: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Falha ao registrar auditoria automática:', error);
  }
}

const pendingProfile = (fbUser) => ({
  email: fbUser.email || '',
  name: fbUser.displayName || fbUser.email || '',
  role: null,
  unit: '',
  workshop_id: '',
  workshop_name: '',
  job_function: '',
  posto_graduacao: '',
  re: '',
  nome_guerra: '',
  active: false,
  status_usuario: 'PENDENTE',
  approval_status: 'PENDENTE',
  deleted: false,
  permissoes_especiais: [],
  requested_at: serverTimestamp(),
  auth_provider: fbUser.providerData?.[0]?.providerId || 'password',
});

const bootstrapProfile = (fbUser) => ({
  email: fbUser.email || '',
  name: fbUser.displayName || fbUser.email || '',
  role: 'gestor',
  active: true,
  status_usuario: 'ATIVO',
  approval_status: 'APROVADO',
  permissoes_especiais: [],
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

    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setAuthError(null);

      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const profileRef = doc(db, 'users', fbUser.uid);
        const initialProfile = await getDoc(profileRef);

        if (!initialProfile.exists()) {
          if (fbUser.uid === BOOTSTRAP_ADMIN_UID) {
            await setDoc(profileRef, {
              ...bootstrapProfile(fbUser),
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
            }, { merge: true });
          } else {
            await setDoc(profileRef, {
              ...pendingProfile(fbUser),
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
            }, { merge: true });

            await writeAuditEvent(fbUser, 'USUARIO_SOLICITOU_ACESSO', {
              entity: 'User',
              context: { approval_status: 'PENDENTE' },
            });
          }
        }

        unsubscribeProfile = onSnapshot(profileRef, (snap) => {
          if (!snap.exists()) {
            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email,
              role: null,
              active: false,
              status_usuario: 'PENDENTE',
              approval_status: 'PENDENTE',
            });
            setLoading(false);
            return;
          }

          const data = snap.data();
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || data.name || fbUser.email,
            ...data,
          });
          setLoading(false);
        }, (error) => {
          setAuthError(error);
          setLoading(false);
        });

        try {
          await setDoc(profileRef, {
            online: true,
            last_seen: serverTimestamp(),
            last_login_at: serverTimestamp(),
            presence_session_id: sessionId(),
          }, { merge: true });
        } catch (presenceError) {
          console.warn('Falha ao marcar usuário online:', presenceError);
        }

        const loginMarker = 'sigfrota:login-audit:' + fbUser.uid + ':' + sessionId();
        if (!sessionStorage.getItem(loginMarker)) {
          sessionStorage.setItem(loginMarker, '1');
          await writeAuditEvent(fbUser, 'LOGIN', { entity: 'Auth' });
        }
      } catch (error) {
        console.error('Falha ao carregar/criar perfil:', error);
        setAuthError(error);
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email,
          role: null,
          active: false,
          status_usuario: 'PENDENTE',
        });
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  useEffect(() => {
    if (APP.setupMode || !firebaseConfigured || !user?.uid || user.uid === 'setup-mode') return undefined;
    if (user.status_usuario === 'EXCLUIDO') return undefined;

    const presenceRef = doc(db, 'users', user.uid);
    let disposed = false;

    const mark = async (online) => {
      if (disposed && online) return;
      try {
        await setDoc(presenceRef, {
          online,
          presence_session_id: sessionId(),
          last_seen: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.warn('Falha ao atualizar presença:', error);
      }
    };

    mark(true);
    const heartbeat = window.setInterval(() => mark(true), 30000);
    const onPageHide = () => mark(false);
    const onPageShow = () => mark(true);

    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      disposed = true;
      window.clearInterval(heartbeat);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      mark(false);
    };
  }, [user?.uid, user?.email, user?.role, user?.status_usuario]);

  const login = async (email, password) => {
    setAuthError(null);
    if (!firebaseConfigured) throw new Error('Firebase Auth ainda não configurado.');
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (APP.setupMode || !firebaseConfigured) return;
    const fbUser = auth.currentUser;

    if (fbUser) {
      try {
        await setDoc(doc(db, 'users', fbUser.uid), {
          online: false,
          last_seen: serverTimestamp(),
          last_logout_at: serverTimestamp(),
          presence_session_id: sessionId(),
        }, { merge: true });
      } catch {}
      await writeAuditEvent(fbUser, 'LOGOUT', { entity: 'Auth', role: user?.role || null });
    }

    sessionStorage.removeItem(SESSION_KEY);
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
