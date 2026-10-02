import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { useAuth } from '../auth/AuthContext';
import { can, vehicleScopeFilter } from '../lib/permissions';
import { nextOesNumber } from '../services/workflows';
import { logAudit } from '../services/audit';
import StatusBadge from '../components/StatusBadge';
import { Button, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea, Card } from '../components/ui';
import { dateBR, money } from '../lib/format';

const buildServicesFromChecklist=(checklist)=>{
  if(!checklist?.items) return '';
  return Object.entries(checklist.items)
    .filter(([,item])=>item&&item.status&& !['OK','NÃO SE APLICA'].includes(item.status))
    .map(([section,item])=>section+' — '+item.status+(item.observation?' — '+item.observation:''))
    .join('\n');
};

export default function MaintenanceOrders(){
  const {user,userRole}=useAuth();
  const [params]=useSearchParams();
  const navigate=useNavigate();
  const scopeFilters=vehicleScopeFilter(user,'unit');
  const scoped=Object.keys(scopeFilters).length>0;

  const orders=useCollection('maintenanceOrders',scoped?{filters:scopeFilters}:{orderBy:'created_at',direction:'desc'});
  const vehicles=useCollection('vehicles',scoped?{filters:scopeFilters}:{orderBy:'prefix',direction:'asc'});
  const workshops=useCollection('workshops',{orderBy:'name',direction:'asc'});
  const downs=useCollection('vehicleDowns',scoped?{filters:scopeFilters}:{orderBy:'created_at',direction:'desc'});
  const diagnoses=useCollection('diagnoses',scoped?{filters:scopeFilters}:{orderBy:'created_at',direction:'desc'});
  const checklists=useCollection('checklists',scoped?{filters:scopeFilters}:{orderBy:'created_at',direction:'desc'});

  const [search,setSearch]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({vehicle_id:'',workshop_id:'',priority:'media',services_requested:'',observations:''});

  const filtered=useMemo(()=>orders.data.filter(o=>{
    if(userRole==='oficina' && user?.workshop_id && o.workshop_id!==user.workshop_id) return false;
    const q=search.toLowerCase();
    return !q||[o.oes_number,o.vehicle_prefix,o.vehicle_plate,o.workshop_name,o.defect_description].some(x=>String(x||'').toLowerCase().includes(q));
  }),[orders.data,search,userRole,user?.workshop_id]);

  const cycleForVehicle=(vehicleId)=>{
    const down=[...downs.data]
      .filter(d=>String(d.vehicle_id)===String(vehicleId))
      .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null;
    const diagnosis=down ? [...diagnoses.data]
      .filter(d=>String(d.vehicle_down_id||'')===String(down.id) || String(d.id||'')===String(down.diagnosis_id||''))
      .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null : null;
    const checklist=down ? [...checklists.data]
      .filter(ch=>
        String(ch.vehicle_down_id||'')===String(down.id) ||
        (diagnosis && String(ch.diagnosis_id||'')===String(diagnosis.id)) ||
        String(ch.id||'')===String(down.checklist_id||'')
      )
      .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null : null;
    const order=down ? [...orders.data]
      .filter(o=>
        String(o.vehicle_down_id||'')===String(down.id) ||
        (checklist && String(o.checklist_id||'')===String(checklist.id)) ||
        String(o.id||'')===String(down.maintenance_order_id||'')
      )
      .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null : null;
    return {down,diagnosis,checklist,order};
  };

  const eligible=vehicles.data.filter(v=>{
    if(v.deleted===true) return false;
    const cycle=cycleForVehicle(v.id);
    return Boolean(cycle.down && cycle.diagnosis && cycle.checklist && !cycle.order);
  });

  const latestChecklist=(vehicleId)=>cycleForVehicle(vehicleId).checklist;
  const latestDown=(vehicleId)=>cycleForVehicle(vehicleId).down;
  const latestDiagnosis=(vehicleId)=>cycleForVehicle(vehicleId).diagnosis;

  const chooseVehicle=(vehicleId)=>{
    const checklist=latestChecklist(vehicleId);
    const down=latestDown(vehicleId);
    const diagnosis=latestDiagnosis(vehicleId);
    const suggested=buildServicesFromChecklist(checklist)||diagnosis?.technical_diagnosis||down?.defect_description||'';
    setForm(f=>({...f,vehicle_id:vehicleId,services_requested:f.vehicle_id===vehicleId?f.services_requested:suggested}));
  };

  useEffect(()=>{
    const vehicleId=params.get('vehicle');
    if(!vehicleId||open) return;
    const target=eligible.find(v=>String(v.id)===String(vehicleId));
    if(target){
      chooseVehicle(target.id);
      setOpen(true);
    }
  },[params,eligible,open]);

  const save=async(e)=>{
    e.preventDefault();
    const v=vehicles.data.find(x=>x.id===form.vehicle_id);
    const w=workshops.data.find(x=>x.id===form.workshop_id);
    if(!v||!w) return;

    const down=latestDown(v.id);
    const diagnosis=latestDiagnosis(v.id);
    const checklist=latestChecklist(v.id);
    const number=await nextOesNumber(w);

    const row=await entities.maintenanceOrders.create({
      vehicle_id:v.id,
      vehicle_prefix:v.prefix,
      vehicle_plate:v.plate,
      unit:v.unit,
      vehicle_down_id:down?.id||null,
      diagnosis_id:diagnosis?.id||down?.diagnosis_id||null,
      checklist_id:checklist?.id||v.checklist_id||null,
      defect_description:down?.defect_description||diagnosis?.reported_defect||'',
      workshop_id:w.id,
      workshop_name:w.name,
      workshop_code:w.codigo||w.oes_code||'',
      oes_number:number,
      priority:form.priority,
      services_requested:form.services_requested,
      observations:form.observations,
      status:'AGUARDANDO_ORCAMENTO',
      created_by:user.email||user.displayName||user.name
    });

    if(down){
      try{
        await entities.vehicleDowns.update(down.id,{status:'OES_GERADA',maintenance_order_id:row.id});
      }catch(error){
        console.warn('O.S. gerada; vínculo da baixa aguardando regras atualizadas.',error);
      }
    }

    await entities.vehicles.update(v.id,{
      status:'AGUARDANDO_ORCAMENTO',
      active_order_id:row.id
    });

    await logAudit({
      user,role:userRole,action:'OES_GERADA',entity:'MaintenanceOrder',recordId:row.id,
      context:{vehicle_id:v.id,vehicle_down_id:down?.id||null,diagnosis_id:diagnosis?.id||null,checklist_id:checklist?.id||null,oes_number:number}
    });

    setForm({vehicle_id:'',workshop_id:'',priority:'media',services_requested:'',observations:''});
    setOpen(false);
    navigate('/viaturas/'+v.id,{replace:true});
  };

  const closeOrderModal=()=>{
    const vehicleId=params.get('vehicle') || form.vehicle_id || '';
    setOpen(false);
    if(params.get('vehicle') && vehicleId){
      navigate('/viaturas/'+vehicleId,{replace:true});
    }
  };

  return <div>
    <PageHeader title="Ordens de Manutenção" description={filtered.length+' ordem(ns)'} actions={can.createOES(userRole,user)&&<Button onClick={()=>setOpen(true)}><Plus size={15}/>Gerar OES</Button>}/>

    <div className="toolbar"><div className="search-field"><Input placeholder="Buscar por OES, viatura ou oficina..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>

    {filtered.length===0?<EmptyState icon={ClipboardList} title="Nenhuma ordem de manutenção"/>:
      <div className="card-list">{filtered.map(o=><Link key={o.id} to={'/ordens/'+o.id}><Card className="record-card">
        <div className="record-main">
          <h3>{o.oes_number||'Ordem'}</h3>
          <p>{o.vehicle_prefix} • {o.vehicle_plate} • {o.workshop_name||'Sem oficina'}</p>
          <p>{o.services_requested||o.defect_description||'Sem descrição'} • {dateBR(o.created_at)}</p>
        </div>
        <div className="record-side"><StatusBadge status={o.status}/>{Number(o.budget_total||0)>0&&<p className="small">{money(o.budget_total)}</p>}</div>
      </Card></Link>)}</div>
    }

    <Modal open={open} onClose={closeOrderModal} title="Gerar OES" wide>
      <form onSubmit={save} className="form-stack">
        <div className="form-grid">
          <Field label="Viatura" required>
            <Select required value={form.vehicle_id} onChange={e=>chooseVehicle(e.target.value)}>
              <option value="">Selecione...</option>
              {eligible.map(v=><option key={v.id} value={v.id}>{v.prefix} • {v.plate}</option>)}
            </Select>
          </Field>
          <Field label="Oficina" required>
            <Select required value={form.workshop_id} onChange={e=>setForm({...form,workshop_id:e.target.value})}>
              <option value="">Selecione...</option>
              {workshops.data.filter(w=>w.active!==false).map(w=><option key={w.id} value={w.id}>{w.codigo||w.oes_code||'--'} • {w.name}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Prioridade">
          <Select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
            <option value="leve">Leve</option><option value="media">Média</option><option value="critica">Crítica</option>
          </Select>
        </Field>

        <Field label="Serviços solicitados" required hint="Quando houver checklist, os itens de atenção/troca são sugeridos automaticamente.">
          <Textarea required value={form.services_requested} onChange={e=>setForm({...form,services_requested:e.target.value})}/>
        </Field>

        <Field label="Observações"><Textarea value={form.observations} onChange={e=>setForm({...form,observations:e.target.value})}/></Field>
        <div className="form-actions"><Button type="button" variant="secondary" onClick={closeOrderModal}>Cancelar</Button><Button type="submit">Gerar OES</Button></div>
      </form>
    </Modal>
  </div>;
}
