import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { canViewVehicleUnit, vehicleScopeFilter } from '../lib/permissions';
import { useCollection } from '../hooks/useCollection';
import { registerVehicleDown } from '../services/workflows';
import { logAudit } from '../services/audit';
import { DEFECT_CATEGORIES } from '../data/schema';
import AttachmentField from '../components/AttachmentField';
import { Button, Card, EmptyState, Field, Input, PageHeader, Select, Textarea } from '../components/ui';

export default function RegisterBaixa(){
  const {user,userRole}=useAuth();
  const scopeFilters=vehicleScopeFilter(user,'unit');
  const vehicleQuery=Object.keys(scopeFilters).length?{filters:scopeFilters}:{orderBy:'prefix',direction:'asc'};
  const {data:vehicles}=useCollection('vehicles',vehicleQuery);
  const [params]=useSearchParams(); const navigate=useNavigate();
  const [vehicleId,setVehicleId]=useState(params.get('vehicle')||'');
  const [form,setForm]=useState({km:'',defect_description:'',defect_category:'',priority:'media',tow_required:false,observations:'',attachments:[]});
  const list=useMemo(()=>vehicles.filter(v=>v.deleted!==true&&v.ativo!==false&&v.status==='OPERANDO'&&canViewVehicleUnit(user,v.unit)),[vehicles,user]);
  const vehicle=vehicles.find(v=>v.id===vehicleId);

  useEffect(()=>{if(vehicle&&!form.km)setForm(f=>({...f,km:String(vehicle.km_horimeter||'')}));},[vehicleId]);

  const submit=async(e)=>{
    e.preventDefault();
    if(!vehicle) return;
    const down=await registerVehicleDown({vehicle,payload:form,actor:user});
    await logAudit({user,role:userRole,action:'REGISTRAR_BAIXA',entity:'VehicleDown',recordId:down.id,before:'OPERANDO',after:'AGUARDANDO_DIAGNOSTICO',context:{vehicle_id:vehicle.id,vehicle_prefix:vehicle.prefix,attachments_count:form.attachments?.length||0}});
    navigate('/viaturas/'+vehicle.id);
  };

  if(!list.length) return <div><PageHeader title="Registrar Baixa"/><EmptyState icon={AlertTriangle} title="Nenhuma viatura operando disponível" text="Somente viaturas operando podem receber uma nova baixa."/></div>;
  return <div><PageHeader title="Registrar Baixa" description="Registre o defeito relatado, KM e anexos. A baixa não substitui o diagnóstico técnico."/>
    <form onSubmit={submit} className="form-stack">
      <Card><div className="form-grid">
        <Field label="Viatura" required><Select value={vehicleId} onChange={e=>setVehicleId(e.target.value)} required><option value="">Selecione...</option>{list.map(v=><option value={v.id} key={v.id}>{v.prefix} • {v.plate} • {v.unit}</option>)}</Select></Field>
        <Field label="KM / Horímetro" required><Input type="number" value={form.km} onChange={e=>setForm({...form,km:e.target.value})} required/></Field>
        <Field label="Categoria"><Select value={form.defect_category} onChange={e=>setForm({...form,defect_category:e.target.value})}><option value="">Selecione...</option>{DEFECT_CATEGORIES.map(x=><option key={x}>{x}</option>)}</Select></Field>
        <Field label="Prioridade"><Select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="leve">Leve</option><option value="media">Média</option><option value="critica">Crítica</option></Select></Field>
      </div>
      <div style={{marginTop:12}}><Field label="Descrição do defeito" required><Textarea required value={form.defect_description} onChange={e=>setForm({...form,defect_description:e.target.value})}/></Field></div>
      <div style={{marginTop:12}}><Field label="Observações"><Textarea value={form.observations} onChange={e=>setForm({...form,observations:e.target.value})}/></Field></div>
      <label className="checkbox-row" style={{marginTop:12}}><input type="checkbox" checked={form.tow_required} onChange={e=>setForm({...form,tow_required:e.target.checked})}/> Necessita guincho</label>
      </Card>
      <Card><strong className="small">Fotos, vídeos e documentos</strong><div style={{marginTop:10}}><AttachmentField max={20} value={form.attachments} onChange={attachments=>setForm({...form,attachments})}/></div></Card>
      <div className="form-actions"><Button type="submit" variant="danger">Registrar Baixa</Button></div>
    </form>
  </div>;
}
