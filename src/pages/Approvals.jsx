import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { useAuth } from '../auth/AuthContext';
import { createFinancialFlow } from '../services/workflows';
import { logAudit } from '../services/audit';
import { money } from '../lib/format';
import { Button, Card, EmptyState, Field, Modal, PageHeader, Textarea } from '../components/ui';

export default function Approvals(){
  const {user,userRole}=useAuth();
  const orders=useCollection('maintenanceOrders',{filters:{status:'AGUARDANDO_APROVACAO'},orderBy:'created_at',direction:'desc'});
  const budgets=useCollection('budgets',{orderBy:'created_at',direction:'desc'});
  const [selected,setSelected]=useState(null); const [decision,setDecision]=useState(''); const [justification,setJustification]=useState('');
  const decide=async()=>{
    const budget=budgets.data.find(b=>b.maintenance_order_id===selected.id);
    if(!budget) return;
    const approved=decision==='APROVADO';
    await entities.budgets.update(budget.id,{status:approved?'APROVADO':'REPROVADO',approved_by:user.email||user.displayName,approval_justification:justification});
    await entities.maintenanceOrders.update(selected.id,{status:approved?'APROVADO':'REPROVADO',approval_status:approved?'aprovado':'reprovado',approval_justification:justification,approved_by:user.email||user.displayName});
    await entities.vehicles.update(selected.vehicle_id,{status:approved?'AGUARDANDO_VERBA':'REPROVADO'});
    if(approved) await createFinancialFlow(selected,budget);
    await logAudit({user,role:userRole,action:approved?'ORCAMENTO_APROVADO':'ORCAMENTO_REPROVADO',entity:'MaintenanceOrder',recordId:selected.id,justification,before:'AGUARDANDO_APROVACAO',after:approved?'APROVADO':'REPROVADO'});
    setSelected(null);setDecision('');setJustification('');
  };
  return <div><PageHeader title="Aprovações" description="Decisão administrativa de orçamento. O mecânico não aprova o próprio orçamento."/>
    {orders.data.length===0?<EmptyState icon={CheckCircle2} title="Nenhum orçamento aguardando aprovação"/>:<div className="card-list">{orders.data.map(o=>{const b=budgets.data.find(x=>x.maintenance_order_id===o.id);return <Card className="record-card" key={o.id}><div className="record-main"><h3>{o.oes_number} • {o.vehicle_prefix}</h3><p>{o.workshop_name}</p><p>{b?money(b.total_value):'Orçamento não localizado'}</p></div><div className="record-actions"><Button variant="success" onClick={()=>{setSelected(o);setDecision('APROVADO')}}><CheckCircle2 size={14}/>Aprovar</Button><Button variant="danger" onClick={()=>{setSelected(o);setDecision('REPROVADO')}}><XCircle size={14}/>Reprovar</Button></div></Card>})}</div>}
    <Modal open={!!selected} onClose={()=>setSelected(null)} title={decision==='APROVADO'?'Aprovar orçamento':'Reprovar orçamento'}><Field label="Justificativa / observação" required><Textarea required value={justification} onChange={e=>setJustification(e.target.value)}/></Field><div className="form-actions"><Button variant="secondary" onClick={()=>setSelected(null)}>Cancelar</Button><Button variant={decision==='APROVADO'?'success':'danger'} onClick={decide} disabled={!justification.trim()}>Confirmar</Button></div></Modal>
  </div>;
}
