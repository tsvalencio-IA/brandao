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

export const SPECIAL_PERMISSIONS = {
  GERENCIAR_USUARIOS: 'gerenciar_usuarios',
  REGISTRAR_BAIXA: 'registrar_baixa',
  DIAGNOSTICO: 'diagnostico',
  CHECKLIST: 'checklist',
  GERAR_OES: 'gerar_oes',
  APROVAR_ORCAMENTO: 'aprovar_orcamento',
  GERENCIAR_OFICINAS: 'gerenciar_oficinas',
  GERENCIAR_ESTOQUE: 'gerenciar_estoque',
  MANUTENCAO_RAPIDA: 'manutencao_rapida',
  ACESSAR_UGE: 'acessar_uge',
  CORRIGIR_OPERACIONAL: 'corrigir_operacional',
  ACESSAR_AUDITORIA: 'acessar_auditoria',
  INATIVAR_VIATURA: 'inativar_viatura',
  APROVAR_PAGAMENTO: 'aprovar_pagamento',
};

export const SPECIAL_PERMISSION_LABELS = {
  gerenciar_usuarios: 'Cadastrar usuários e definir permissões',
  registrar_baixa: 'Registrar baixa de viatura',
  diagnostico: 'Realizar diagnóstico técnico',
  checklist: 'Preencher e retificar checklist',
  gerar_oes: 'Gerar OES',
  aprovar_orcamento: 'Aprovar ou reprovar orçamento',
  gerenciar_oficinas: 'Cadastrar e alterar oficinas',
  gerenciar_estoque: 'Gerenciar peças e estoque',
  manutencao_rapida: 'Registrar manutenção rápida',
  acessar_uge: 'Acessar módulo financeiro UGE',
  corrigir_operacional: 'Corrigir lançamentos operacionais',
  acessar_auditoria: 'Visualizar auditoria',
  inativar_viatura: 'Inativar viatura',
  aprovar_pagamento: 'Aprovar/registrar pagamento',
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

export function hasSpecialPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'gestor') return true;
  return Array.isArray(user.permissoes_especiais) && user.permissoes_especiais.includes(permission);
}

export function canAccessRoute(role, pathname, user = null) {
  if (!role) return false;
  if (role === 'gestor') return true;

  if (pathname === '/usuarios' || pathname.startsWith('/usuarios/')) {
    return hasSpecialPermission(user, SPECIAL_PERMISSIONS.GERENCIAR_USUARIOS);
  }
  if (pathname === '/auditoria' || pathname.startsWith('/auditoria/')) {
    return hasSpecialPermission(user, SPECIAL_PERMISSIONS.ACESSAR_AUDITORIA);
  }

  const allowed = ROUTES[role] || [];
  if (allowed.includes('*')) return true;
  if (allowed.some((base) => pathname === base || (base !== '/' && pathname.startsWith(base + '/')))) return true;

  const permissionByRoute = [
    ['/registrar-baixa', SPECIAL_PERMISSIONS.REGISTRAR_BAIXA],
    ['/diagnostico', SPECIAL_PERMISSIONS.DIAGNOSTICO],
    ['/checklist', SPECIAL_PERMISSIONS.CHECKLIST],
    ['/aprovacoes', SPECIAL_PERMISSIONS.APROVAR_ORCAMENTO],
    ['/oficinas', SPECIAL_PERMISSIONS.GERENCIAR_OFICINAS],
    ['/estoque', SPECIAL_PERMISSIONS.GERENCIAR_ESTOQUE],
    ['/manutencao-rapida', SPECIAL_PERMISSIONS.MANUTENCAO_RAPIDA],
    ['/uge', SPECIAL_PERMISSIONS.ACESSAR_UGE],
    ['/relatorios-uge', SPECIAL_PERMISSIONS.ACESSAR_UGE],
  ];

  return permissionByRoute.some(([base, permission]) =>
    (pathname === base || pathname.startsWith(base + '/')) && hasSpecialPermission(user, permission)
  );
}

export const can = {
  manageUsers: (r, u) => r === 'gestor' || hasSpecialPermission(u, SPECIAL_PERMISSIONS.GERENCIAR_USUARIOS),
  viewAudit: (r, u) => r === 'gestor' || hasSpecialPermission(u, SPECIAL_PERMISSIONS.ACESSAR_AUDITORIA),
  manageVehicles: (r) => ['gestor', 'adm', 'mecanico'].includes(r),
  registerDown: (r, u) => ['gestor', 'adm', 'adm_opm', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.REGISTRAR_BAIXA),
  diagnosis: (r, u) => ['gestor', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.DIAGNOSTICO),
  checklist: (r, u) => ['gestor', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.CHECKLIST),
  createOES: (r, u) => ['gestor', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.GERAR_OES),
  manageWorkshops: (r, u) => ['gestor', 'adm'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.GERENCIAR_OFICINAS),
  approveBudget: (r, u) => ['gestor', 'adm'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.APROVAR_ORCAMENTO),
  uge: (r, u) => ['gestor', 'adm', 'uge'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.ACESSAR_UGE),
  stock: (r, u) => ['gestor', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.GERENCIAR_ESTOQUE),
  quickMaintenance: (r, u) => ['gestor', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.MANUTENCAO_RAPIDA),
  discharge: (r) => ['gestor', 'adm', 'mecanico'].includes(r),
};
