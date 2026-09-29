import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, FileText } from 'lucide-react';
import { useEntity } from '../hooks/useEntity';
import { useCollection } from '../hooks/useCollection';
import StatusBadge from '../components/StatusBadge';
import { Button, Card, EmptyState, PageHeader } from '../components/ui';
import { dateBR, money } from '../lib/format';

export default function OrderDetail(){
  const {id}=useParams();
  const order=useEntity('maintenanceOrders',id);
  const budgets=useCollection('budgets',{filters:{maintenance_order_id:id},orderBy:'created_at',direction:'desc'});
  const audit=useCollection('auditLogs',{filters:{record_id:id},orderBy:'date_time',direction:'desc'});
  if(order.loading) return <div className="full-loader inline"><span className="spinner"/></div>;
  if(!order.data) return <EmptyState icon={ClipboardList} title="Ordem não encontrada"/>;
  const o=order.data; const budget=budgets.data[0];
  return <div>
    <PageHeader title={o.oes_number||'Ordem de Manutenção'} description={o.vehicle_prefix+' • '+o.vehicle_plate+' • '+(o.workshop_name||'Sem oficina')} actions={<Link to="/ordens"><Button variant="secondary"><ArrowLeft size={15}/>Voltar</Button></Link>}/>
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-top">Status</div><div style={{marginTop:16}}><StatusBadge status={o.status}/></div></div>
      <div className="stat-card"><div className="stat-top">Prioridade</div><strong>{o.priority||'—'}</strong></div>
      <div className="stat-card"><div className="stat-top">Orçamento</div><strong style={{fontSize:18}}>{money(o.budget_total||budget?.total_value||0)}</strong></div>
      <div className="stat-card"><div className="stat-top">Criada em</div><strong style={{fontSize:16}}>{dateBR(o.created_at)}</strong></div>
    </div>
    <h2 className="section-title">Solicitação</h2><Card><div className="kv"><span>Serviços solicitados</span><strong>{o.services_requested||o.defect_description||'—'}</strong></div><div className="kv"><span>Oficina</span><strong>{o.workshop_name||'—'}</strong></div><div className="kv"><span>Observações</span><strong>{o.observations||'—'}</strong></div></Card>
    {budget&&<><h2 className="section-title">Orçamento</h2><Card><div className="detail-grid"><div className="detail-item"><span>Peças</span><strong>{money(budget.parts_value)}</strong></div><div className="detail-item"><span>Mão de obra</span><strong>{money(budget.labor_value)}</strong></div><div className="detail-item"><span>Total</span><strong>{money(budget.total_value)}</strong></div><div className="detail-item"><span>Prazo</span><strong>{budget.deadline||'—'}</strong></div><div className="detail-item"><span>Status</span><strong>{budget.status||'—'}</strong></div></div>{budget.file_url&&<a className="btn btn-outline" style={{marginTop:12}} href={budget.file_url} target="_blank" rel="noreferrer"><FileText size={15}/>Abrir orçamento</a>}</Card></>}
    <h2 className="section-title">Auditoria desta ordem</h2>{audit.data.length===0?<EmptyState title="Nenhum evento registrado"/>:<div className="timeline">{audit.data.map(a=><div className="timeline-item" key={a.id}><strong>{a.action}</strong><p>{a.user_name||a.user_email||'Sistema'} • {dateBR(a.date_time)}</p></div>)}</div>}
  </div>;
}
