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
  ACESSO_TOTAL: 'acesso_total',
  GERENCIAR_USUARIOS: 'gerenciar_usuarios',
  VISUALIZAR_VIATURAS: 'visualizar_viaturas',
  GERENCIAR_VIATURAS: 'gerenciar_viaturas',
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

// Compatibilidade: quem já tinha as 14 permissões antigas continua sendo tratado
// como acesso total, sem precisar recadastrar as novas permissões adicionadas agora.
export const LEGACY_FULL_ACCESS_PERMISSIONS = [
  'gerenciar_usuarios',
  'registrar_baixa',
  'diagnostico',
  'checklist',
  'gerar_oes',
  'aprovar_orcamento',
  'gerenciar_oficinas',
  'gerenciar_estoque',
  'manutencao_rapida',
  'acessar_uge',
  'corrigir_operacional',
  'acessar_auditoria',
  'inativar_viatura',
  'aprovar_pagamento',
];

export const SPECIAL_PERMISSION_LABELS = {
  acesso_total: 'ACESSO TOTAL — todos os módulos e ações',
  gerenciar_usuarios: 'Cadastrar usuários e definir permissões',
  visualizar_viaturas: 'Visualizar viaturas',
  gerenciar_viaturas: 'Cadastrar, editar e excluir viaturas',
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

export function hasLegacyFullAccess(user) {
  const list = Array.isArray(user?.permissoes_especiais) ? user.permissoes_especiais : [];
  return LEGACY_FULL_ACCESS_PERMISSIONS.every((permission) => list.includes(permission));
}

export function hasFullAccess(user) {
  if (!user) return false;
  if (user.role === 'gestor') return true;
  const list = Array.isArray(user.permissoes_especiais) ? user.permissoes_especiais : [];
  return list.includes(SPECIAL_PERMISSIONS.ACESSO_TOTAL) || hasLegacyFullAccess(user);
}

export function hasAnyPermission(user) {
  return Array.isArray(user?.permissoes_especiais) && user.permissoes_especiais.length > 0;
}

export function canEnterSystem(user) {
  if (!user) return false;
  if (user.deleted === true || user.status_usuario === 'EXCLUIDO') return false;
  if (user.active === false || user.status_usuario === 'INATIVO') return false;
  if (user.status_usuario === 'PENDENTE' || user.approval_status === 'PENDENTE') return false;
  if (user.approval_status && !['APROVADO'].includes(user.approval_status)) return false;
  return Boolean(user.role) || hasAnyPermission(user);
}

export function hasSpecialPermission(user, permission) {
  if (!user) return false;
  if (hasFullAccess(user)) return true;
  return Array.isArray(user.permissoes_especiais) && user.permissoes_especiais.includes(permission);
}

// O escopo de viaturas é independente das permissões de função.
// Um usuário pode ter muitas ações liberadas e ainda assim enxergar somente a própria OPM.
export function getVehicleScopeMode(user) {
  if (!user) return 'unit';
  if (user.role === 'gestor') return 'all';
  if (user.vehicle_scope === 'all') return 'all';
  if (user.vehicle_scope === 'unit') return 'unit';
  // Compatibilidade com usuários antigos: ADM OPM já era limitado por unidade.
  if (user.role === 'adm_opm' && user.unit) return 'unit';
  return 'all';
}

export function vehicleScopeFilter(user, field = 'unit') {
  if (getVehicleScopeMode(user) !== 'unit') return {};
  return { [field]: user?.unit || '__SIGFROTA_SEM_UNIDADE__' };
}

export function canViewVehicleUnit(user, unit) {
  const mode = getVehicleScopeMode(user);
  if (mode === 'all') return true;
  return Boolean(user?.unit) && String(unit || '') === String(user.unit || '');
}

export function canAccessRoute(role, pathname, user = null) {
  if (!user) return false;
  if (hasFullAccess(user)) return true;
  if (pathname === '/') return canEnterSystem(user);

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
    ['/viaturas', SPECIAL_PERMISSIONS.VISUALIZAR_VIATURAS],
    ['/registrar-baixa', SPECIAL_PERMISSIONS.REGISTRAR_BAIXA],
    ['/diagnostico', SPECIAL_PERMISSIONS.DIAGNOSTICO],
    ['/checklist', SPECIAL_PERMISSIONS.CHECKLIST],
    ['/ordens', SPECIAL_PERMISSIONS.GERAR_OES],
    ['/aprovacoes', SPECIAL_PERMISSIONS.APROVAR_ORCAMENTO],
    ['/oficinas', SPECIAL_PERMISSIONS.GERENCIAR_OFICINAS],
    ['/estoque', SPECIAL_PERMISSIONS.GERENCIAR_ESTOQUE],
    ['/manutencao-rapida', SPECIAL_PERMISSIONS.MANUTENCAO_RAPIDA],
    ['/controle-operacional', SPECIAL_PERMISSIONS.CORRIGIR_OPERACIONAL],
    ['/uge', SPECIAL_PERMISSIONS.ACESSAR_UGE],
    ['/relatorios-uge', SPECIAL_PERMISSIONS.ACESSAR_UGE],
    ['/usuarios', SPECIAL_PERMISSIONS.GERENCIAR_USUARIOS],
    ['/auditoria', SPECIAL_PERMISSIONS.ACESSAR_AUDITORIA],
  ];

  return permissionByRoute.some(([base, permission]) =>
    (pathname === base || pathname.startsWith(base + '/')) && hasSpecialPermission(user, permission)
  );
}

export const can = {
  manageUsers: (r, u) => hasFullAccess(u) || r === 'gestor' || hasSpecialPermission(u, SPECIAL_PERMISSIONS.GERENCIAR_USUARIOS),
  viewAudit: (r, u) => hasFullAccess(u) || r === 'gestor' || hasSpecialPermission(u, SPECIAL_PERMISSIONS.ACESSAR_AUDITORIA),
  viewVehicles: (r, u) => hasFullAccess(u) || ['gestor', 'adm', 'adm_opm', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.VISUALIZAR_VIATURAS),
  manageVehicles: (r, u) => hasFullAccess(u) || ['gestor', 'adm', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.GERENCIAR_VIATURAS),
  registerDown: (r, u) => hasFullAccess(u) || ['gestor', 'adm', 'adm_opm', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.REGISTRAR_BAIXA),
  diagnosis: (r, u) => hasFullAccess(u) || ['gestor', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.DIAGNOSTICO),
  checklist: (r, u) => hasFullAccess(u) || ['gestor', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.CHECKLIST),
  createOES: (r, u) => hasFullAccess(u) || ['gestor', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.GERAR_OES),
  manageWorkshops: (r, u) => hasFullAccess(u) || ['gestor', 'adm'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.GERENCIAR_OFICINAS),
  approveBudget: (r, u) => hasFullAccess(u) || ['gestor', 'adm'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.APROVAR_ORCAMENTO),
  uge: (r, u) => hasFullAccess(u) || ['gestor', 'adm', 'uge'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.ACESSAR_UGE),
  stock: (r, u) => hasFullAccess(u) || ['gestor', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.GERENCIAR_ESTOQUE),
  quickMaintenance: (r, u) => hasFullAccess(u) || ['gestor', 'mecanico'].includes(r) || hasSpecialPermission(u, SPECIAL_PERMISSIONS.MANUTENCAO_RAPIDA),
  discharge: (r, u) => hasFullAccess(u) || ['gestor', 'adm', 'mecanico'].includes(r),
};
