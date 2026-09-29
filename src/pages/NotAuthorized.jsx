import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function NotAuthorized({ noProfile = false }) {
  return <div className="center-page">
    <div className="empty-icon danger-icon"><ShieldAlert size={26}/></div>
    <h1>{noProfile ? 'Perfil não configurado' : 'Acesso não autorizado'}</h1>
    <p>{noProfile ? 'O usuário está autenticado, mas ainda não possui um perfil do SIGFROTA.' : 'Seu perfil não possui permissão para acessar esta rota.'}</p>
    <Link to="/"><Button>Voltar ao Dashboard</Button></Link>
  </div>;
}
