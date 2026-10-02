import { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { useAuth } from '../auth/AuthContext';
import { logAudit } from '../services/audit';
import { Button, Card, EmptyState, Field, Modal, PageHeader, Select, Textarea } from '../components/ui';
import { dateBR } from '../lib/format';

export default function Diagnosis(){
  const {user,userRole}=useAuth();
  const downQuery=userRole==='adm_opm'&&user?.unit?{filters:{unit:user.unit}}:{orderBy:'created_at',direction:'desc'};
  const downs=useCollection('vehicleDowns',downQuery);
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState({technical_diagnosis:'',probable_cause:'',priority:'media',external_workshop:true,observations:''});
  const open=downs.data.filter(d=>d.status!=='DIAGNOSTICADA');

  const save=async(e)=>{
    e.preventDefault();
    const diag=await entities.diagnoses.create({
      vehicle_id:selected.vehicle_id, vehicle_down_id:selected.id, unit:selected.unit||'', mechanic_id:user.uid,
      reported_defect:selected.defect_description, ...form, status:'CONCLUIDO'
    });
    await entities.vehicleDowns.update(selected.id,{status:'DIAGNOSTICADA',diagnosis_id:diag.id});
    await entities.vehicles.update(selected.vehicle_id,{status:form.external_workshop?'AGUARDANDO_CHECKLIST':'EM_DIAGNOSTICO'});
    await logAudit({user,role:userRole,action:'DIAGNOSTICO_CONCLUIDO',entity:'Diagnosis',recordId:diag.id,context:{vehicle_id:selected.vehicle_id}});
    setSelected(null);
  };

  return <div><PageHeader title="Diagnóstico" description="Fila técnica das viaturas baixadas aguardando avaliação do mecânico."/>
    {open.length===0?<EmptyState icon={Stethoscope} title="Nenhuma viatura aguardando diagnóstico"/>:<div className="card-list">{open.map(d=><Card key={d.id} className="record-card"><div className="record-main"><h3>{d.vehicle_prefix} • {d.vehicle_plate}</h3><p>{d.defect_description}</p><p>{d.unit||'—'} • {dateBR(d.created_at)} • KM {Number(d.km||0).toLocaleString('pt-BR')}</p></div><div className="record-actions"><Button onClick={()=>setSelected(d)}>Diagnosticar</Button></div></Card>)}</div>}
    <Modal open={!!selected} onClose={()=>setSelected(null)} title="Diagnóstico Técnico" wide><form onSubmit={save} className="form-stack">
      <Field label="Diagnóstico técnico" required><Textarea required value={form.technical_diagnosis} onChange={e=>setForm({...form,technical_diagnosis:e.target.value})}/></Field>
      <Field label="Causa provável"><Textarea value={form.probable_cause} onChange={e=>setForm({...form,probable_cause:e.target.value})}/></Field>
      <div className="form-grid"><Field label="Prioridade"><Select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="leve">Leve</option><option value="media">Média</option><option value="critica">Crítica</option></Select></Field>
      <Field label="Destino"><Select value={form.external_workshop?'externa':'rapida'} onChange={e=>setForm({...form,external_workshop:e.target.value==='externa'})}><option value="externa">Checklist / OES / Oficina</option><option value="rapida">Manutenção rápida interna</option></Select></Field></div>
      <Field label="Observações"><Textarea value={form.observations} onChange={e=>setForm({...form,observations:e.target.value})}/></Field>
      <div className="form-actions"><Button variant="secondary" onClick={()=>setSelected(null)}>Cancelar</Button><Button type="submit">Concluir diagnóstico</Button></div>
    </form></Modal>
  </div>;
}
