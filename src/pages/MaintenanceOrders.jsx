import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus, Search } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { useAuth } from '../auth/AuthContext';
import { can, vehicleScopeFilter } from '../lib/permissions';
import { nextOesNumber } from '../services/workflows';
import { logAudit } from '../services/audit';
import StatusBadge from '../components/StatusBadge';
import { Button, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea, Card } from '../components/ui';
import { dateBR, money } from '../lib/format';

export default function MaintenanceOrders(){
  const {user,userRole}=useAuth();
  const scopeFilters=vehicleScopeFilter(user,'unit');
  const scoped=Object.keys(scopeFilters).length>0;
  const orders=useCollection('maintenanceOrders',scoped?{filters:scopeFilters}:{orderBy:'created_at',direction:'desc'});
  const vehicles=useCollection('vehicles',scoped?{filters:scopeFilters}:{orderBy:'prefix',direction:'asc'});
  const workshops=useCollection('workshops',{orderBy:'name',direction:'asc'});
  const [search,setSearch]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({vehicle_id:'',workshop_id:'',priority:'media',services_requested:'',observations:''});

  const eligible=vehicles.data.filter(v=>v.deleted!==true&&['CHECKLIST_CONCLUIDO','AGUARDANDO_ORCAMENTO','AGUARDANDO_CHECKLIST'].includes(v.status));
  const filtered=useMemo(()=>orders.data.filter(o=>{
    if(userRole==='oficina' && user?.workshop_id && o.workshop_id!==user.workshop_id) return false;
    const q=search.toLowerCase();
    return !q||[o.oes_number,o.vehicle_prefix,o.vehicle_plate,o.workshop_name,o.defect_description].some(x=>String(x||'').toLowerCase().includes(q));
  }),[orders.data,search,userRole,user?.unit,user?.workshop_id]);

  const save=async(e)=>{
    e.preventDefault();
    const v=vehicles.data.find(x=>x.id===form.vehicle_id);
    const w=workshops.data.find(x=>x.id===form.workshop_id);
    if(!v||!w) return;
    const number=await nextOesNumber(w);
    const row=await entities.maintenanceOrders.create({
      vehicle_id:v.id,vehicle_prefix:v.prefix,vehicle_plate:v.plate,unit:v.unit,
      workshop_id:w.id,workshop_name:w.name,workshop_code:w.codigo||w.oes_code||'',
      oes_number:number,priority:form.priority,services_requested:form.services_requested,
      observations:form.observations,status:'AGUARDANDO_ORCAMENTO',
      checklist_id:v.checklist_id||null,created_by:user.email||user.displayName
    });
    await entities.vehicles.update(v.id,{status:'AGUARDANDO_ORCAMENTO',active_order_id:row.id});
    await logAudit({user,role:userRole,action:'OES_GERADA',entity:'MaintenanceOrder',recordId:row.id,context:{vehicle_id:v.id,oes_number:number}});
    setForm({vehicle_id:'',workshop_id:'',priority:'media',services_requested:'',observations:''}); setOpen(false);
  };

  return <div><PageHeader title="Ordens de Manutenção" description={filtered.length+' ordem(ns)'} actions={can.createOES(userRole,user)&&<Button onClick={()=>setOpen(true)}><Plus size={15}/>Gerar OES</Button>}/>
    <div className="toolbar"><div className="search-field"><Input placeholder="Buscar por OES, viatura ou oficina..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
    {filtered.length===0?<EmptyState icon={ClipboardList} title="Nenhuma ordem de manutenção"/>:<div className="card-list">{filtered.map(o=><Link key={o.id} to={'/ordens/'+o.id}><Card className="record-card"><div className="record-main"><h3>{o.oes_number||'Ordem'}</h3><p>{o.vehicle_prefix} • {o.vehicle_plate} • {o.workshop_name||'Sem oficina'}</p><p>{o.services_requested||o.defect_description||'Sem descrição'} • {dateBR(o.created_at)}</p></div><div className="record-side"><StatusBadge status={o.status}/>{Number(o.budget_total||0)>0&&<p className="small">{money(o.budget_total)}</p>}</div></Card></Link>)}</div>}
    <Modal open={open} onClose={()=>setOpen(false)} title="Gerar OES" wide><form onSubmit={save} className="form-stack">
      <div className="form-grid"><Field label="Viatura" required><Select required value={form.vehicle_id} onChange={e=>setForm({...form,vehicle_id:e.target.value})}><option value="">Selecione...</option>{eligible.map(v=><option key={v.id} value={v.id}>{v.prefix} • {v.plate}</option>)}</Select></Field>
      <Field label="Oficina" required><Select required value={form.workshop_id} onChange={e=>setForm({...form,workshop_id:e.target.value})}><option value="">Selecione...</option>{workshops.data.filter(w=>w.active!==false).map(w=><option key={w.id} value={w.id}>{w.codigo||w.oes_code||'--'} • {w.name}</option>)}</Select></Field></div>
      <Field label="Prioridade"><Select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="leve">Leve</option><option value="media">Média</option><option value="critica">Crítica</option></Select></Field>
      <Field label="Serviços solicitados" required><Textarea required value={form.services_requested} onChange={e=>setForm({...form,services_requested:e.target.value})}/></Field>
      <Field label="Observações"><Textarea value={form.observations} onChange={e=>setForm({...form,observations:e.target.value})}/></Field>
      <div className="form-actions"><Button variant="secondary" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit">Gerar OES</Button></div>
    </form></Modal>
  </div>;
}
