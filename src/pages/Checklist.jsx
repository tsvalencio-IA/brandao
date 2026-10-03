import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const navigate=useNavigate();
  const scopeFilters=vehicleScopeFilter(user,'unit');
  const scoped=Object.keys(scopeFilters).length>0;
  const vehicles=useCollection('vehicles',scoped?{filters:scopeFilters}:{orderBy:'prefix',direction:'asc'});
  const checklists=useCollection('checklists',scoped?{filters:scopeFilters}:{orderBy:'created_at',direction:'desc'});
  const downs=useCollection('vehicleDowns',scoped?{filters:scopeFilters}:{orderBy:'created_at',direction:'desc'});
  const diagnoses=useCollection('diagnoses',scoped?{filters:scopeFilters}:{orderBy:'created_at',direction:'desc'});

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
    return {down,diagnosis,checklist};
  };

  const eligible=useMemo(()=>vehicles.data.filter(v=>{
    if(v.deleted===true) return false;
    const cycle=cycleForVehicle(v.id);
    return Boolean(cycle.down && cycle.diagnosis && cycle.diagnosis.external_workshop!==false);
  }),[vehicles.data,downs.data,diagnoses.data,checklists.data]);
  const [selected,setSelected]=useState(null);
  const initialItems=()=>Object.fromEntries(CHECKLIST_SECTIONS.map(x=>[x,{status:'OK',observation:''}]));
  const [items,setItems]=useState(initialItems());
  const [km,setKm]=useState('');
  const [fuel,setFuel]=useState('');
  const [obs,setObs]=useState('');
  const [files,setFiles]=useState([]);

  const activeCycle=useMemo(()=>selected?cycleForVehicle(selected.id):{down:null,diagnosis:null,checklist:null},[selected,downs.data,diagnoses.data,checklists.data]);
  const activeDown=activeCycle.down;
  const activeDiagnosis=activeCycle.diagnosis;

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
    const previous=activeCycle.checklist;

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
      responsible_id:user.uid,
      responsible_name:user.displayName||user.name||user.email,
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
    const vehicleId=selected.id;
    setSelected(null);
    navigate('/viaturas/'+vehicleId,{replace:true});
  };

  const closeChecklist=()=>{
    const vehicleId=params.get('vehicle') || selected?.id || '';
    setSelected(null);
    if(params.get('vehicle') && vehicleId){
      navigate('/viaturas/'+vehicleId,{replace:true});
    }
  };

  return <div>
    <PageHeader title="Checklist de Encaminhamento" description="Conferência da viatura antes do envio à oficina. Registre itens, observações e fotos; elas serão incorporadas ao PDF de solicitação de orçamento."/>

    {eligible.length===0?<EmptyState icon={ListChecks} title="Nenhuma viatura aguardando checklist"/>:
      <div className="card-list">{eligible.map(v=><Card className="record-card" key={v.id}>
        <div className="record-main"><h3>{v.prefix} • {v.plate}</h3><p>{v.brand} {v.model} • {v.unit}</p></div>
        <Button onClick={()=>start(v)}>{v.status==='CHECKLIST_CONCLUIDO'?'Retificar':'Preencher'}</Button>
      </Card>)}</div>
    }

    <Modal open={!!selected} onClose={closeChecklist} title={'Checklist • '+(selected?.prefix||'')} wide>
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
        <div style={{marginTop:14}}><div className="field-label">Fotos da viatura / evidências para a oficina</div><div className="config-note" style={{marginBottom:8}}>As imagens anexadas aqui acompanham o checklist e entram no PDF de solicitação de orçamento.</div><AttachmentField max={20} value={files} onChange={setFiles}/></div>
        <div className="form-actions"><Button type="button" variant="secondary" onClick={closeChecklist}>Cancelar</Button><Button type="submit">Concluir checklist</Button></div>
      </form>
    </Modal>
  </div>;
}
