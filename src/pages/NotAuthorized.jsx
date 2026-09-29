import { useState } from 'react';
import { ShieldAlert, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui';

export default function NotAuthorized({ noProfile = false }) {
  const { user } = useAuth();
  const [copied,setCopied] = useState(false);

  const copyUid = async () => {
    if(!user?.uid) return;
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(()=>setCopied(false),1500);
    } catch {}
  };

  return <div className="center-page">
    <div className="empty-icon danger-icon"><ShieldAlert size={26}/></div>
    <h1>{noProfile?'Perfil não configurado':'Acesso não autorizado'}</h1>
    <p>{noProfile?'O usuário está autenticado, mas ainda não possui um perfil do SIGFROTA.':'Seu perfil não possui permissão para acessar esta rota.'}</p>

    {noProfile&&user?.uid&&<div className="uid-box">
      <span>UID do usuário</span>
      <code>{user.uid}</code>
      <Button variant="outline" onClick={copyUid}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copiado':'Copiar UID'}</Button>
      <small>Um Gestor deve abrir Usuários → Vincular usuário existente e informar este UID.</small>
    </div>}

    {!noProfile&&<Link to="/"><Button>Voltar ao Dashboard</Button></Link>}
  </div>;
}
