import { useState } from 'react';
import { Briefcase, FileText } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import AttachmentField from '../components/AttachmentField';
import StatusBadge from '../components/StatusBadge';
import { money } from '../lib/format';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Textarea } from '../components/ui';

export default function WorkshopPortal(){
  const {user}=useAuth();
  const query=user?.workshop_id?{filters:{workshop_id:user.workshop_id},orderBy:'created_at',direction:'desc'}:{orderBy:'created_at',direction:'desc'};
  const orders=useCollection('maintenanceOrders',query);
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState({parts_value:'',labor_value:'',deadline:'',observations:'',files:[]});
  const submit=async(e)=>{
    e.preventDefault();
    const total=Number(form.parts_value||0)+Number(form.labor_value||0);
    const file=form.files[0];
    const b=await entities.budgets.create({maintenance_order_id:selected.id,workshop_id:selected.workshop_id,parts_value:Number(form.parts_value||0),labor_value:Number(form.labor_value||0),total_value:total,deadline:form.deadline,observations:form.observations,file_url:file?.url||'',status:'PENDENTE'});
    await entities.maintenanceOrders.update(selected.id,{status:'AGUARDANDO_APROVACAO',budget_id:b.id,budget_parts_value:Number(form.parts_value||0),budget_labor_value:Number(form.labor_value||0),budget_total:total,budget_deadline:form.deadline,budget_observations:form.observations,budget_file_url:file?.url||''});
    await entities.vehicles.update(selected.vehicle_id,{status:'AGUARDANDO_APROVACAO'});
    setSelected(null);setForm({parts_value:'',labor_value:'',deadline:'',observations:'',files:[]});
  };
  return <div><PageHeader title="Portal da Oficina" description="OES vinculadas à oficina credenciada e envio de orçamento."/>
    {orders.data.length===0?<EmptyState icon={Briefcase} title="Nenhuma OES disponível para esta oficina"/>:<div className="card-list">{orders.data.map(o=><Card className="record-card" key={o.id}><div className="record-main"><h3>{o.oes_number} • {o.vehicle_prefix}</h3><p>{o.services_requested||o.defect_description}</p><p>{o.vehicle_plate} • {o.unit}</p></div><div className="record-side"><StatusBadge status={o.status}/>{o.budget_total>0&&<p className="small">{money(o.budget_total)}</p>}<div className="record-actions">{o.status==='AGUARDANDO_ORCAMENTO'&&<Button onClick={()=>setSelected(o)}><FileText size={14}/>Enviar Orçamento</Button>}</div></div></Card>)}</div>}
    <Modal open={!!selected} onClose={()=>setSelected(null)} title="Enviar Orçamento"><form onSubmit={submit} className="form-stack"><div className="form-grid"><Field label="Peças" required><Input type="number" step="0.01" required value={form.parts_value} onChange={e=>setForm({...form,parts_value:e.target.value})}/></Field><Field label="Mão de obra" required><Input type="number" step="0.01" required value={form.labor_value} onChange={e=>setForm({...form,labor_value:e.target.value})}/></Field></div><Field label="Prazo"><Input value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></Field><Field label="Observações"><Textarea value={form.observations} onChange={e=>setForm({...form,observations:e.target.value})}/></Field><AttachmentField max={1} accept=".pdf,image/*" value={form.files} onChange={files=>setForm({...form,files})}/><div className="form-actions"><Button variant="secondary" onClick={()=>setSelected(null)}>Cancelar</Button><Button type="submit">Enviar</Button></div></form></Modal>
  </div>;
}
