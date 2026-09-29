export const ROLES = {
  GESTOR: 'gestor',
  ADM: 'adm',
  ADM_OPM: 'adm_opm',
  MECANICO: 'mecanico',
  OFICINA: 'oficina',
  UGE: 'uge',
};

export const ROLE_LABELS = {
  gestor: 'Gestor',
  adm: 'ADM',
  adm_opm: 'ADM OPM',
  mecanico: 'Mecânico',
  oficina: 'Oficina Credenciada',
  uge: 'UGE',
};

export const STATUS_LABELS = {
  OPERANDO: 'Operando',
  BAIXADA: 'Baixada',
  AGUARDANDO_DIAGNOSTICO: 'Aguardando Diagnóstico',
  EM_DIAGNOSTICO: 'Em Diagnóstico',
  AGUARDANDO_CHECKLIST: 'Aguardando Checklist',
  CHECKLIST_CONCLUIDO: 'Checklist Concluído',
  AGUARDANDO_ORCAMENTO: 'Aguardando Orçamento',
  AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  AGUARDANDO_VERBA: 'Aguardando Verba',
  AGUARDANDO_REPARO: 'Aguardando Reparo',
  EM_REPARO: 'Em Reparo',
  REPARO_REALIZADO: 'Reparo Realizado',
  REPARO_REPROVADO: 'Reparo Reprovado',
  AGUARDANDO_CONFERENCIA: 'Aguardando Conferência',
  LIBERADA: 'Liberada',
  DESCARGA: 'Descarga',
  INATIVA: 'Inativa',
};

export const FINANCIAL_LABELS = {
  VERBA_PENDENTE: 'Verba Pendente',
  VERBA_SOLICITADA: 'Verba Solicitada',
  VERBA_DISPONIVEL: 'Verba Disponível',
  AGUARDANDO_NOTA_FISCAL: 'Aguardando Nota Fiscal',
  NOTA_FISCAL_ENVIADA: 'Nota Fiscal Enviada',
  AGUARDANDO_APROVACAO_FINAL: 'Aguardando Aprovação Final',
  NOTA_FISCAL_REPROVADA: 'Nota Fiscal Reprovada',
  APROVADO_PARA_PAGAMENTO: 'Aprovado para Pagamento',
  PAGO: 'Pago',
};

const ROUTES = {
  gestor: ['*'],
  adm: ['/', '/viaturas', '/registrar-baixa', '/ordens', '/aprovacoes', '/oficinas', '/controle-operacional', '/uge', '/relatorios-uge'],
  adm_opm: ['/', '/viaturas', '/registrar-baixa', '/ordens', '/controle-operacional'],
  mecanico: ['/', '/viaturas', '/registrar-baixa', '/diagnostico', '/checklist', '/ordens', '/manutencao-rapida', '/estoque', '/oficinas', '/controle-operacional'],
  oficina: ['/', '/portal-oficina', '/ordens'],
  uge: ['/', '/uge', '/relatorios-uge'],
};

export function canAccessRoute(role, pathname) {
  if (!role) return false;
  const allowed = ROUTES[role] || [];
  if (allowed.includes('*')) return true;
  return allowed.some((base) => pathname === base || (base !== '/' && pathname.startsWith(base + '/')));
}

export const can = {
  manageUsers: (r) => r === 'gestor',
  viewAudit: (r) => r === 'gestor',
  manageVehicles: (r) => ['gestor', 'adm', 'mecanico'].includes(r),
  registerDown: (r) => ['gestor', 'adm', 'adm_opm', 'mecanico'].includes(r),
  diagnosis: (r) => ['gestor', 'mecanico'].includes(r),
  checklist: (r) => ['gestor', 'mecanico'].includes(r),
  createOES: (r) => ['gestor', 'mecanico'].includes(r),
  manageWorkshops: (r) => ['gestor', 'adm'].includes(r),
  approveBudget: (r) => ['gestor', 'adm'].includes(r),
  uge: (r) => ['gestor', 'adm', 'uge'].includes(r),
  stock: (r) => ['gestor', 'mecanico'].includes(r),
  quickMaintenance: (r) => ['gestor', 'mecanico'].includes(r),
  discharge: (r) => ['gestor', 'adm', 'mecanico'].includes(r),
};
