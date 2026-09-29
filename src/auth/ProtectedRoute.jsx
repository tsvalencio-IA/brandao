import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { canAccessRoute } from '../lib/permissions';

export default function ProtectedRoute() {
  const { loading, isAuthenticated, user, userRole } = useAuth();
  const location = useLocation();

  if (loading) return <div className="full-loader"><span className="spinner" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user?.active === false || user?.status_usuario === 'INATIVO') return <Navigate to="/acesso-negado" replace />;
  if (!userRole) return <Navigate to="/sem-perfil" replace />;
  if (!canAccessRoute(userRole, location.pathname, user)) return <Navigate to="/acesso-negado" replace />;

  return <Outlet />;
}
