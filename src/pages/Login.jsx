import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield, LogIn, KeyRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { APP } from '../config/app';
import { Button, Field, Input } from '../components/ui';
import Footer from '../components/Footer';

export default function Login() {
  const { isAuthenticated, login, resetPassword, setupMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const location = useLocation();

  if (isAuthenticated) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMessage('');
    try { await login(email, password); }
    catch (err) { setMessage(err.message || 'Falha ao entrar.'); }
    finally { setBusy(false); }
  };

  const recover = async () => {
    if (!email) return setMessage('Informe o e-mail primeiro.');
    try { await resetPassword(email); setMessage('E-mail de redefinição enviado.'); }
    catch (err) { setMessage(err.message); }
  };

  return <div className="login-shell">
    <div className="login-card">
      <div className="login-brand"><div className="brand-mark"><Shield size={24}/></div><h1>{APP.name}</h1><p>{APP.subtitle}</p></div>
      {setupMode ? (
        <div className="config-note">Modo de configuração ativo. A tela de login passará a usar Firebase Auth assim que as variáveis forem preenchidas e <code>VITE_SETUP_MODE=false</code>.</div>
      ) : (
        <form onSubmit={submit} className="form-stack">
          <Field label="E-mail"><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required/></Field>
          <Field label="Senha"><Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required/></Field>
          {message && <div className="form-message">{message}</div>}
          <Button type="submit" disabled={busy}><LogIn size={16}/>{busy?'Entrando...':'Entrar'}</Button>
          <button type="button" className="link-button" onClick={recover}><KeyRound size={14}/> Esqueci minha senha</button>
        </form>
      )}
    </div>
    <Footer/>
  </div>;
}
