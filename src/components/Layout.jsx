import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Car, AlertTriangle, ClipboardList, CheckCircle2,
  Building2, Activity, Wrench, Package, FileBarChart, DollarSign,
  Users, Shield, Briefcase, Menu, X,
} from 'lucide-react';
import { useState } from 'react';
import { APP } from '../config/app';
import Footer from './Footer';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/viaturas', label: 'Viaturas', icon: Car },
  { to: '/registrar-baixa', label: 'Registrar Baixa', icon: AlertTriangle },
  { to: '/ordens', label: 'Ordens de Manutenção', icon: ClipboardList },
  { to: '/manutencao-rapida', label: 'Manutenção Rápida', icon: Wrench },
  { to: '/estoque', label: 'Estoque de Peças', icon: Package },
  { to: '/aprovacoes', label: 'Aprovações', icon: CheckCircle2 },
  { to: '/oficinas', label: 'Oficinas', icon: Building2 },
  { to: '/controle-operacional', label: 'Controle Operacional', icon: Activity },
  { to: '/portal-oficina', label: 'Portal da Oficina', icon: Briefcase },
  { to: '/uge', label: 'Financeiro UGE', icon: DollarSign },
  { to: '/relatorios-uge', label: 'Relatórios UGE', icon: FileBarChart },
  { to: '/usuarios', label: 'Usuários', icon: Users },
  { to: '/auditoria', label: 'Auditoria', icon: Shield },
];

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="shell">
      {open && <button className="overlay" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Shield size={20} /></div>
          <div><strong>{APP.name}</strong><span>{APP.subtitle}</span></div>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>
        <nav className="nav-list">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="content-column">
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
          <div className="topbar-title">{APP.name}</div>
          <div className="status-pill"><span />Estrutura inicial</div>
        </header>
        <main className="page-content"><Outlet /></main>
        <Footer />
      </div>
    </div>
  );
}
