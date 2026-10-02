import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Car, AlertTriangle, Stethoscope, ListChecks, ClipboardList,
  CheckCircle2, Wrench, Package, Building2, Activity, DollarSign, FileBarChart,
  Users, Shield, Menu, X, LogOut, Settings2, Briefcase
} from 'lucide-react';
import { APP } from '../config/app';
import { useAuth } from '../auth/AuthContext';
import { canAccessRoute, ROLE_LABELS } from '../lib/permissions';
import Footer from './Footer';
import IntegrationNotifications from './IntegrationNotifications';
import { Modal } from './ui';

const groups = [
  { label: null, items: [{ path: '/', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'FROTA', items: [
    { path: '/viaturas', label: 'Viaturas', icon: Car },
    { path: '/registrar-baixa', label: 'Registrar Baixa', icon: AlertTriangle },
    { path: '/controle-operacional', label: 'Controle Operacional', icon: Activity },
  ]},
  { label: 'MANUTENÇÃO', items: [
    { path: '/diagnostico', label: 'Diagnóstico', icon: Stethoscope },
    { path: '/checklist', label: 'Checklist', icon: ListChecks },
    { path: '/ordens', label: 'Ordens de Manutenção', icon: ClipboardList },
    { path: '/aprovacoes', label: 'Aprovações', icon: CheckCircle2 },
    { path: '/manutencao-rapida', label: 'Manutenção Rápida', icon: Wrench },
    { path: '/portal-oficina', label: 'Portal da Oficina', icon: Briefcase },
  ]},
  { label: 'LOGÍSTICA', items: [
    { path: '/estoque', label: 'Estoque', icon: Package },
    { path: '/oficinas', label: 'Oficinas Credenciadas', icon: Building2 },
  ]},
  { label: 'FINANCEIRO', items: [
    { path: '/uge', label: 'Fluxo UGE', icon: DollarSign },
    { path: '/relatorios-uge', label: 'Relatórios UGE', icon: FileBarChart },
  ]},
  { label: 'ADMINISTRAÇÃO', items: [
    { path: '/usuarios', label: 'Usuários', icon: Users },
    { path: '/auditoria', label: 'Auditoria', icon: Shield },
  ]},
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, userRole, logout, setupMode, switchSetupRole } = useAuth();
  const location = useLocation();

  return (
    <div className="shell">
      {open && <button className="overlay" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <aside className={'sidebar ' + (open ? 'sidebar-open' : '')}>
        <div className="brand">
          <div className="brand-mark"><Shield size={20}/></div>
          <div><strong>{APP.name}</strong><span>{APP.subtitle}</span></div>
          <button className="mobile-close" onClick={() => setOpen(false)}><X size={18}/></button>
        </div>

        <nav className="nav-list">
          {groups.map((group, gi) => {
            const available = group.items.filter((item) => canAccessRoute(userRole, item.path, user));
            if (!available.length) return null;
            return <div className="nav-group" key={gi}>
              {group.label && <div className="nav-group-label">{group.label}</div>}
              {available.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) => 'nav-item ' + (isActive ? 'active' : '')}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={17}/><span>{label}</span>
                </NavLink>
              ))}
            </div>;
          })}
        </nav>

        <div className="sidebar-user">
          <button
            type="button"
            className="sidebar-profile-button"
            onClick={() => setProfileOpen(true)}
            title="Ver meus dados cadastrais"
          >
            <div className="user-avatar">{(user?.displayName || user?.name || user?.email || 'U').slice(0,1).toUpperCase()}</div>
            <div className="user-meta">
              <strong>{user?.displayName || user?.name || user?.email}</strong>
              <span>{ROLE_LABELS[userRole] || userRole || 'Acesso personalizado'}</span>
            </div>
          </button>
          {!setupMode && <button className="icon-btn sidebar-logout" onClick={logout} title="Sair"><LogOut size={16}/></button>}
        </div>
      </aside>

      <div className="content-column">
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen(true)}><Menu size={20}/></button>
          <div className="topbar-context">
            <strong>{APP.name}</strong>
            <span>{location.pathname === '/' ? 'Visão geral' : 'Gestão operacional'}</span>
          </div>
          <IntegrationNotifications/>
          {!setupMode && <button className="mobile-top-logout" onClick={logout} title="Sair do SIGFROTA"><LogOut size={17}/><span>Sair</span></button>}
          {setupMode && (
            <div className="setup-role">
              <Settings2 size={14}/>
              <select value={userRole || 'gestor'} onChange={(e) => switchSetupRole(e.target.value)}>
                <option value="gestor">Gestor</option>
                <option value="adm">ADM</option>
                <option value="adm_opm">ADM OPM</option>
                <option value="mecanico">Mecânico</option>
                <option value="oficina">Oficina</option>
                <option value="uge">UGE</option>
              </select>
            </div>
          )}
        </header>
        {setupMode && <div className="setup-banner">Modo de configuração ativo — dados locais vazios. Firebase Auth/Firestore e Cloudinary serão conectados pelas variáveis de ambiente.</div>}
        <main className="page-content"><Outlet context={{ user, userRole }} /></main>
        <Footer />
      </div>

      <Modal open={profileOpen} title="Meus dados cadastrais" onClose={() => setProfileOpen(false)}>
        <div className="my-profile-card">
          <div className="my-profile-head">
            <div className="my-profile-avatar">{(user?.displayName || user?.name || user?.nome_guerra || user?.email || 'U').slice(0,1).toUpperCase()}</div>
            <div>
              <strong>{user?.nome_guerra || user?.displayName || user?.name || 'Usuário'}</strong>
              <span>{ROLE_LABELS[userRole] || userRole || 'Acesso personalizado'}</span>
            </div>
          </div>
          <div className="my-profile-grid">
            <div className="my-profile-field"><span>Nome</span><strong>{user?.name || user?.displayName || '—'}</strong></div>
            <div className="my-profile-field"><span>Nome de guerra</span><strong>{user?.nome_guerra || '—'}</strong></div>
            <div className="my-profile-field"><span>E-mail</span><strong>{user?.email || '—'}</strong></div>
            <div className="my-profile-field"><span>Perfil</span><strong>{ROLE_LABELS[userRole] || userRole || '—'}</strong></div>
            <div className="my-profile-field"><span>OPM / Unidade</span><strong>{user?.unit || '—'}</strong></div>
            <div className="my-profile-field"><span>Posto / Graduação</span><strong>{user?.posto_graduacao || '—'}</strong></div>
            <div className="my-profile-field"><span>RE</span><strong>{user?.re || '—'}</strong></div>
            <div className="my-profile-field"><span>Função</span><strong>{user?.job_function || '—'}</strong></div>
            {user?.workshop_name && <div className="my-profile-field my-profile-wide"><span>Oficina</span><strong>{user.workshop_name}</strong></div>}
            <div className="my-profile-field my-profile-wide"><span>Status</span><strong>{user?.active === false ? 'INATIVO' : (user?.status_usuario || 'ATIVO')}</strong></div>
          </div>
          <p className="my-profile-note">Dados somente para consulta. Alterações cadastrais são realizadas pela gestão de usuários.</p>
        </div>
      </Modal>
    </div>
  );
}
