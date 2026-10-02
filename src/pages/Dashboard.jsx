import { useMemo } from 'react';
import { Car, AlertTriangle, Wrench, CheckCircle2, DollarSign, Package, Clock, Building2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useCollection } from '../hooks/useCollection';
import { money } from '../lib/format';
import { EmptyState, PageHeader, Stat } from '../components/ui';
import { canAccessRoute } from '../lib/permissions';

export default function Dashboard() {
  const { user, userRole } = useAuth();

  const canVehicles = ['/viaturas','/registrar-baixa','/diagnostico','/checklist','/ordens','/manutencao-rapida','/controle-operacional']
    .some(path => canAccessRoute(userRole, path, user));
  const canDowns = ['/registrar-baixa','/diagnostico','/checklist','/ordens']
    .some(path => canAccessRoute(userRole, path, user));
  const canOrders = ['/ordens','/aprovacoes','/portal-oficina','/uge','/relatorios-uge']
    .some(path => canAccessRoute(userRole, path, user));
  const canFinance = ['/uge','/relatorios-uge'].some(path => canAccessRoute(userRole, path, user));
  const canParts = ['/estoque','/manutencao-rapida'].some(path => canAccessRoute(userRole, path, user));

  const scoped = userRole === 'adm_opm' && user?.unit;

  const vehicles = useCollection('vehicles', scoped ? {filters:{unit:user.unit},enabled:canVehicles} : {orderBy:'created_at',direction:'desc',enabled:canVehicles});
  const downs = useCollection('vehicleDowns', scoped ? {filters:{unit:user.unit},enabled:canDowns} : {orderBy:'created_at',direction:'desc',enabled:canDowns});
  const orders = useCollection('maintenanceOrders', scoped ? {filters:{unit:user.unit},enabled:canOrders} : {orderBy:'created_at',direction:'desc',enabled:canOrders});
  const flows = useCollection('financialFlows', { orderBy: 'created_at', direction: 'desc', enabled: canFinance });
  const parts = useCollection('parts', { orderBy: 'name', direction: 'asc', enabled: canParts });

  const filteredVehicles = useMemo(() => {
    if (userRole === 'adm_opm' && user?.unit) return vehicles.data.filter(v => v.unit === user.unit);
    return vehicles.data;
  }, [vehicles.data, userRole, user?.unit]);

  const content = useMemo(() => {
    const v = filteredVehicles;
    const blocked = v.filter(x => x.status !== 'OPERANDO' && x.status !== 'LIBERADA' && x.status !== 'INATIVA').length;
    const operating = v.filter(x => x.status === 'OPERANDO').length;
    const availability = v.length ? Math.round((operating / v.length) * 100) : 0;

    if (userRole === 'adm_opm') return [
      ['Total da OPM', v.length, Car],
      ['Operando', operating, CheckCircle2],
      ['Baixadas / indisponíveis', blocked, AlertTriangle],
      ['Disponibilidade', availability + '%', Clock],
    ];

    if (userRole === 'mecanico') return [
      ['Aguardando diagnóstico', v.filter(x=>x.status==='AGUARDANDO_DIAGNOSTICO').length, AlertTriangle],
      ['Checklist', v.filter(x=>['AGUARDANDO_CHECKLIST','CHECKLIST_CONCLUIDO'].includes(x.status)).length, CheckCircle2],
      ['Em reparo', v.filter(x=>['AGUARDANDO_REPARO','EM_REPARO'].includes(x.status)).length, Wrench],
      ['Conferência', v.filter(x=>x.status==='AGUARDANDO_CONFERENCIA').length, Clock],
      ['Estoque baixo', parts.data.filter(p=>Number(p.quantity||0)<=Number(p.min_stock||0)).length, Package],
    ];

    if (userRole === 'oficina') return [
      ['OES recebidas', orders.data.length, Building2],
      ['Orçamento pendente', orders.data.filter(o=>o.status==='AGUARDANDO_ORCAMENTO').length, DollarSign],
      ['Em reparo', orders.data.filter(o=>o.status==='EM_REPARO').length, Wrench],
      ['Concluídas', orders.data.filter(o=>o.status==='REPARO_REALIZADO').length, CheckCircle2],
    ];

    if (userRole === 'uge') return [
      ['Verba pendente', flows.data.filter(f=>f.status==='VERBA_PENDENTE').length, DollarSign],
      ['Verba solicitada', flows.data.filter(f=>f.status==='VERBA_SOLICITADA').length, Clock],
      ['Verba disponível', flows.data.filter(f=>f.status==='VERBA_DISPONIVEL').length, CheckCircle2],
      ['Aguardando pagamento', flows.data.filter(f=>f.status==='APROVADO_PARA_PAGAMENTO').length, DollarSign],
      ['Pago', money(flows.data.filter(f=>f.status==='PAGO').reduce((s,f)=>s+Number(f.approved_value||0),0)), CheckCircle2],
    ];

    return [
      ['Frota total', v.length, Car],
      ['Operando', operating, CheckCircle2],
      ['Fora de serviço', blocked, AlertTriangle],
      ['Ordens', orders.data.length, Wrench],
      ['Aprovação pendente', orders.data.filter(o=>o.status==='AGUARDANDO_APROVACAO').length, Clock],
      ['Financeiro aprovado', money(flows.data.reduce((s,f)=>s+Number(f.approved_value||0),0)), DollarSign],
    ];
  }, [filteredVehicles, orders.data, flows.data, parts.data, userRole]);

  const loading = vehicles.loading || orders.loading;
  return <div>
    <PageHeader title="Dashboard" description="Visão do SIGFROTA de acordo com o perfil de acesso."/>
    {loading ? <div className="full-loader inline"><span className="spinner"/></div> :
      content.every(([,value]) => value === 0 || value === 'R$ 0,00') && vehicles.data.length === 0 ?
      <EmptyState icon={Car} title="SIGFROTA pronto para receber dados" text="A estrutura está ativa, mas nenhum registro foi inserido neste ambiente."/> :
      <div className="stats-grid">{content.map(([label,value,icon])=><Stat key={label} label={label} value={value} icon={icon}/>)}</div>}
  </div>;
}
