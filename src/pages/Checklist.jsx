import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { CHECKLIST_SECTIONS } from '../data/schema';
import { useAuth } from '../auth/AuthContext';
import { vehicleScopeFilter } from '../lib/permissions';
import { logAudit } from '../services/audit';
import AttachmentField from '../components/AttachmentField';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from '../components/ui';

export default function Checklist(){
  const {user,userRole}=useAuth();
  const [params]=useSearchParams();
  const scopeFilters=vehicleScopeFilter(user,'unit');
  const scoped=Object.keys(scopeFilters).length>0;
  const vehicles=useCollection('vehicles',scoped?{filters:scopeFilters}:{orderBy:'prefix',direction:'asc'});
  const checklists=useCollection('checklists',scoped?{filters:scopeFilters}:{orderBy:'created_at',direction:'desc'});
  const downs=useCollection('vehicleDowns',scoped?{filters:scopeFilters}:{orderBy:'created_at',direction:'desc'});
  const diagnoses=useCollection('diagnoses',scoped?{filters:scopeFilters}:{orderBy:'created_at',direction:'desc'});

  const eligible=useMemo(()=>vehicles.data.filter(v=>v.deleted!==true&&['AGUARDANDO_CHECKLIST','CHECKLIST_CONCLUIDO'].includes(v.status)),[vehicles.data]);
  const [selected,setSelected]=useState(null);
  const initialItems=()=>Object.fromEntries(CHECKLIST_SECTIONS.map(x=>[x,{status:'OK',observation:''}]));
  const [items,setItems]=useState(initialItems());
  const [km,setKm]=useState('');
  const [fuel,setFuel]=useState('');
  const [obs,setObs]=useState('');
  const [files,setFiles]=useState([]);

  const activeDown=useMemo(()=>{
    if(!selected) return null;
    return [...downs.data]
      .filter(d=>String(d.vehicle_id)===String(selected.id)&&d.status!=='OES_GERADA')
      .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null;
  },[downs.data,selected]);

  const activeDiagnosis=useMemo(()=>{
    if(!selected) return null;
    return [...diagnoses.data]
      .filter(d=>String(d.vehicle_id)===String(selected.id))
      .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null;
  },[diagnoses.data,selected]);

  const start=(v)=>{
    setSelected(v);
    setKm(String(v.km_horimeter||''));
    setItems(initialItems());
    setFuel('');
    setObs('');
    setFiles([]);
  };

  useEffect(()=>{
    const vehicleId=params.get('vehicle');
    if(!vehicleId||selected) return;
    const target=eligible.find(v=>String(v.id)===String(vehicleId));
    if(target) start(target);
  },[params,eligible,selected]);

  const save=async(e)=>{
    e.preventDefault();
    const previous=[...checklists.data]
      .filter(c=>String(c.vehicle_id)===String(selected.id)&&['CONCLUIDO','RETIFICADO'].includes(c.status))
      .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0];

    const row=await entities.checklists.create({
      vehicle_id:selected.id,
      vehicle_prefix:selected.prefix,
      vehicle_plate:selected.plate,
      unit:selected.unit||'',
      vehicle_down_id:activeDown?.id||null,
      diagnosis_id:activeDiagnosis?.id||activeDown?.diagnosis_id||null,
      km:Number(km||0),
      fuel_level:fuel,
      items,
      photos:files,
      observations:obs,
      mechanic_id:user.uid,
      mechanic_name:user.displayName||user.name||user.email,
      status:previous?'RETIFICADO':'CONCLUIDO',
      previous_version_id:previous?.id||null
    });

    if(activeDown){
      try{
        await entities.vehicleDowns.update(activeDown.id,{status:'CHECKLIST_CONCLUIDO',checklist_id:row.id});
      }catch(error){
        console.warn('Checklist concluído; vínculo da baixa aguardando regras atualizadas.',error);
      }
    }

    await entities.vehicles.update(selected.id,{
      status:'CHECKLIST_CONCLUIDO',
      km_horimeter:Number(km||0),
      checklist_id:row.id
    });

    await logAudit({
      user,role:userRole,action:previous?'CHECKLIST_RETIFICADO':'CHECKLIST_CONCLUIDO',
      entity:'Checklist',recordId:row.id,
      context:{vehicle_id:selected.id,vehicle_down_id:activeDown?.id||null,diagnosis_id:activeDiagnosis?.id||null}
    });
    setSelected(null);
  };

  return <div>
    <PageHeader title="Checklist Técnico" description="Checklist mecânico vinculado à baixa e ao diagnóstico da viatura."/>

    {eligible.length===0?<EmptyState icon={ListChecks} title="Nenhuma viatura aguardando checklist"/>:
      <div className="card-list">{eligible.map(v=><Card className="record-card" key={v.id}>
        <div className="record-main"><h3>{v.prefix} • {v.plate}</h3><p>{v.brand} {v.model} • {v.unit}</p></div>
        <Button onClick={()=>start(v)}>{v.status==='CHECKLIST_CONCLUIDO'?'Retificar':'Preencher'}</Button>
      </Card>)}</div>
    }

    <Modal open={!!selected} onClose={()=>setSelected(null)} title={'Checklist • '+(selected?.prefix||'')} wide>
      <form onSubmit={save}>
        {(activeDown||activeDiagnosis)&&<Card className="down-context-card" style={{marginBottom:14}}>
          {activeDown&&<div className="kv"><span>Defeito da baixa</span><strong>{activeDown.defect_description||'—'}</strong></div>}
          {activeDiagnosis&&<div className="kv"><span>Diagnóstico</span><strong>{activeDiagnosis.technical_diagnosis||'—'}</strong></div>}
        </Card>}

        <div className="form-grid">
          <Field label="KM" required><Input type="number" required value={km} onChange={e=>setKm(e.target.value)}/></Field>
          <Field label="Combustível"><Input value={fuel} onChange={e=>setFuel(e.target.value)} placeholder="Ex: 3/4"/></Field>
        </div>

        <div className="checklist-grid" style={{marginTop:14}}>
          {CHECKLIST_SECTIONS.map(section=><div className="check-item" key={section}>
            <strong>{section}</strong>
            <Select value={items[section].status} onChange={e=>setItems({...items,[section]:{...items[section],status:e.target.value}})}>
              <option>OK</option><option>ATENÇÃO</option><option>TROCAR</option><option>RETIFICAR</option><option>REGULAR</option><option>LUBRIFICAR</option><option>AJUSTAR</option><option>NÃO SE APLICA</option>
            </Select>
            <Input placeholder="Observação" value={items[section].observation} onChange={e=>setItems({...items,[section]:{...items[section],observation:e.target.value}})} style={{marginTop:6}}/>
          </div>)}
        </div>

        <div style={{marginTop:14}}><Field label="Observações gerais"><Textarea value={obs} onChange={e=>setObs(e.target.value)}/></Field></div>
        <div style={{marginTop:14}}><AttachmentField max={20} value={files} onChange={setFiles}/></div>
        <div className="form-actions"><Button variant="secondary" onClick={()=>setSelected(null)}>Cancelar</Button><Button type="submit">Concluir checklist</Button></div>
      </form>
    </Modal>
  </div>;
}
