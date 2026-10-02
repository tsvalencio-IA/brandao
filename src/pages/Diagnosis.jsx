import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Stethoscope } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { useAuth } from '../auth/AuthContext';
import { vehicleScopeFilter } from '../lib/permissions';
import { logAudit } from '../services/audit';
import { Button, Card, EmptyState, Field, Modal, PageHeader, Select, Textarea } from '../components/ui';
import { dateBR } from '../lib/format';

const mediaName=(a,i)=>a?.name||a?.original_filename||('Arquivo '+(i+1));
const isImage=(a)=>String(a?.type||'').startsWith('image/')||/\.(png|jpe?g|webp|gif)$/i.test(String(a?.url||''));

export default function Diagnosis(){
  const {user,userRole}=useAuth();
  const [params]=useSearchParams();
  const navigate=useNavigate();
  const scopeFilters=vehicleScopeFilter(user,'unit');
  const downQuery=Object.keys(scopeFilters).length?{filters:scopeFilters}:{orderBy:'created_at',direction:'desc'};
  const downs=useCollection('vehicleDowns',downQuery);
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState({technical_diagnosis:'',probable_cause:'',priority:'media',external_workshop:true,observations:''});

  const open=useMemo(()=>downs.data
    .filter(d=>d.status!=='DIAGNOSTICADA'&&d.status!=='CHECKLIST_CONCLUIDO'&&d.status!=='OES_GERADA')
    .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))),[downs.data]);

  useEffect(()=>{
    const vehicleId=params.get('vehicle');
    if(!vehicleId||selected) return;
    const target=open.find(d=>String(d.vehicle_id)===String(vehicleId));
    if(target) setSelected(target);
  },[params,open,selected]);

  const save=async(e)=>{
    e.preventDefault();
    const diag=await entities.diagnoses.create({
      vehicle_id:selected.vehicle_id,
      vehicle_down_id:selected.id,
      unit:selected.unit||'',
      mechanic_id:user.uid,
      mechanic_name:user.displayName||user.name||user.email,
      reported_defect:selected.defect_description,
      down_attachments:selected.attachments||[],
      ...form,
      status:'CONCLUIDO'
    });
    await entities.vehicleDowns.update(selected.id,{status:'DIAGNOSTICADA',diagnosis_id:diag.id});
    await entities.vehicles.update(selected.vehicle_id,{
      status:form.external_workshop?'AGUARDANDO_CHECKLIST':'EM_DIAGNOSTICO',
      diagnosis_id:diag.id
    });
    await logAudit({
      user,role:userRole,action:'DIAGNOSTICO_CONCLUIDO',entity:'Diagnosis',recordId:diag.id,
      context:{vehicle_id:selected.vehicle_id,vehicle_down_id:selected.id,destino:form.external_workshop?'CHECKLIST_OES':'MANUTENCAO_RAPIDA'}
    });
    const vehicleId=selected.vehicle_id;
    setSelected(null);
    navigate('/viaturas/'+vehicleId);
  };

  return <div>
    <PageHeader title="Diagnóstico" description="Fila técnica das viaturas baixadas aguardando avaliação do mecânico."/>

    {open.length===0?<EmptyState icon={Stethoscope} title="Nenhuma viatura aguardando diagnóstico"/>:
      <div className="card-list">{open.map(d=><Card key={d.id} className="record-card">
        <div className="record-main">
          <h3>{d.vehicle_prefix} • {d.vehicle_plate}</h3>
          <p>{d.defect_description}</p>
          <p>{d.unit||'—'} • {dateBR(d.created_at)} • KM {Number(d.km||0).toLocaleString('pt-BR')}</p>
          {!!d.attachments?.length&&<p><Camera size={12} style={{verticalAlign:'middle'}}/> {d.attachments.length} anexo(s) da baixa</p>}
        </div>
        <div className="record-actions"><Button onClick={()=>setSelected(d)}>Diagnosticar</Button></div>
      </Card>)}</div>
    }

    <Modal open={!!selected} onClose={()=>setSelected(null)} title="Diagnóstico Técnico" wide>
      <form onSubmit={save} className="form-stack">
        {selected&&<Card className="down-context-card">
          <div className="kv"><span>Defeito informado na baixa</span><strong>{selected.defect_description||'—'}</strong></div>
          <div className="kv"><span>Observações da baixa</span><strong>{selected.observations||'—'}</strong></div>
          <div className="kv"><span>KM da baixa</span><strong>{Number(selected.km||0).toLocaleString('pt-BR')}</strong></div>
          {!!selected.attachments?.length&&<div className="down-media-grid">
            {selected.attachments.map((a,i)=>isImage(a)
              ?<a href={a.url} target="_blank" rel="noreferrer" className="down-media-item" key={a.public_id||a.url||i}><img src={a.url} alt={mediaName(a,i)}/><span>{mediaName(a,i)}</span></a>
              :<a href={a.url} target="_blank" rel="noreferrer" className="down-file-link" key={a.public_id||a.url||i}>Abrir {mediaName(a,i)}</a>
            )}
          </div>}
        </Card>}

        <Field label="Diagnóstico técnico" required><Textarea required value={form.technical_diagnosis} onChange={e=>setForm({...form,technical_diagnosis:e.target.value})}/></Field>
        <Field label="Causa provável"><Textarea value={form.probable_cause} onChange={e=>setForm({...form,probable_cause:e.target.value})}/></Field>
        <div className="form-grid">
          <Field label="Prioridade"><Select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="leve">Leve</option><option value="media">Média</option><option value="critica">Crítica</option></Select></Field>
          <Field label="Próxima etapa"><Select value={form.external_workshop?'externa':'rapida'} onChange={e=>setForm({...form,external_workshop:e.target.value==='externa'})}><option value="externa">Checklist → O.S. → Oficina</option><option value="rapida">Manutenção rápida interna</option></Select></Field>
        </div>
        <Field label="Observações"><Textarea value={form.observations} onChange={e=>setForm({...form,observations:e.target.value})}/></Field>
        <div className="form-actions"><Button variant="secondary" onClick={()=>setSelected(null)}>Cancelar</Button><Button type="submit">Concluir e avançar</Button></div>
      </form>
    </Modal>
  </div>;
}
