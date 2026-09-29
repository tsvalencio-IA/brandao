import { Navigate, Link } from 'react-router-dom';
import { ShieldAlert, Clock3 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui';

export default function NotAuthorized({ noProfile = false }) {
  const { user } = useAuth();

  if (noProfile && user?.role && user?.active !== false && user?.status_usuario === 'ATIVO') {
    return <Navigate to="/" replace />;
  }

  const excluded = user?.deleted === true || user?.status_usuario === 'EXCLUIDO';
  const pending = !excluded && (noProfile || user?.status_usuario === 'PENDENTE' || user?.approval_status === 'PENDENTE');

  return <div className="center-page">
    <div className={'empty-icon ' + (pending ? '' : 'danger-icon')}>
      {pending ? <Clock3 size={26}/> : <ShieldAlert size={26}/>}
    </div>
    <h1>{pending ? 'Aguardando liberação' : excluded ? 'Usuário excluído' : 'Acesso não autorizado'}</h1>
    <p>
      {pending
        ? 'Seu login foi reconhecido e o pedido de acesso já apareceu automaticamente para os gestores do SIGFROTA. Não é necessário informar UID.'
        : excluded
          ? 'Este usuário foi excluído do acesso ao SIGFROTA. A credencial de autenticação não concede acesso sem um perfil autorizado.'
          : 'Seu perfil não possui permissão para acessar esta rota.'}
    </p>
    {pending && <div className="success-box" style={{maxWidth:520}}>
      Assim que um gestor escolher seu perfil e clicar em Liberar, esta tela será atualizada automaticamente.
    </div>}
    {!pending && !excluded && <Link to="/"><Button>Voltar ao Dashboard</Button></Link>}
  </div>;
}
