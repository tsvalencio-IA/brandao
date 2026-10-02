export const COLLECTIONS = {
  users: 'users',
  userPresence: 'user_presence',
  organizationalUnits: 'organizational_units',
  vehicles: 'vehicles',
  publicVehicleTokens: 'public_vehicle_tokens',
  vehicleDowns: 'vehicle_downs',
  diagnoses: 'diagnoses',
  checklists: 'checklists',
  workshops: 'workshops',
  maintenanceOrders: 'maintenance_orders',
  budgets: 'budgets',
  financialFlows: 'financial_flows',
  commitments: 'commitments',
  invoices: 'invoices',
  payments: 'payments',
  parts: 'parts',
  stockMovements: 'stock_movements',
  quickMaintenances: 'quick_maintenances',
  operationalLogs: 'operational_logs',
  attachments: 'attachments',
  auditLogs: 'audit_logs',
  oesCounters: 'oes_counters',
  saas2Integrations: 'saas2_integrations',
  saas2SyncEvents: 'saas2_sync_events',
  saas2Chat: 'saas2_chat',
};

export const VEHICLE_STATUS = [
  'OPERANDO','BAIXADA','AGUARDANDO_DIAGNOSTICO','EM_DIAGNOSTICO','AGUARDANDO_CHECKLIST',
  'CHECKLIST_CONCLUIDO','AGUARDANDO_ORCAMENTO','AGUARDANDO_APROVACAO','APROVADO','REPROVADO',
  'AGUARDANDO_VERBA','AGUARDANDO_REPARO','EM_REPARO','REPARO_REALIZADO','REPARO_REPROVADO',
  'AGUARDANDO_CONFERENCIA','LIBERADA','DESCARGA','INATIVA',
];

export const FINANCIAL_STATUS = [
  'VERBA_PENDENTE','VERBA_SOLICITADA','VERBA_DISPONIVEL','AGUARDANDO_NOTA_FISCAL',
  'NOTA_FISCAL_ENVIADA','AGUARDANDO_APROVACAO_FINAL','NOTA_FISCAL_REPROVADA',
  'APROVADO_PARA_PAGAMENTO','PAGO',
];

export const CHECKLIST_SECTIONS = [
  'Identificação','KM','Combustível','Carroceria','Pintura','Vidros','Pneus','Rodas',
  'Iluminação','Sinalização','Sirene','Bancos','Painel','Interior','Motor','Transmissão',
  'Freios','Suspensão','Direção','Acessórios','Documentação','Avarias'
];

export const DEFECT_CATEGORIES = [
  'Motor','Transmissão','Suspensão','Freios','Elétrica','Carroceria',
  'Pneus/Rodas','Ar condicionado','Comunicação/Rádio','Documentação','Outros'
];

export const VEHICLE_TYPES = [
  ['viatura_4rodas','Viatura 4 Rodas'],['viatura_2rodas','Viatura 2 Rodas'],
  ['blindada','Blindada'],['administrativa','Administrativa'],['operacional_especial','Operacional Especial'],
];

export const FUEL_TYPES = [
  ['gasolina','Gasolina'],['etanol','Etanol'],['diesel','Diesel'],['flex','Flex'],['eletrico','Elétrico'],
];
