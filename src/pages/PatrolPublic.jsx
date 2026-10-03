import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Car, CheckCircle2, Shield } from 'lucide-react';
import { entities } from '../data/repository';
import { DEFECT_CATEGORIES } from '../data/schema';
import { todayISO } from '../lib/format';
import AttachmentField from '../components/AttachmentField';
import Footer from '../components/Footer';
import { Button, Card, EmptyState, Field, Input, Select, Textarea } from '../components/ui';

const emptyEvents = {
  fuel:false,
  oil_change:false,
  oil_filter:false,
  fuel_filter:false,
  mechanical_issue:false,
};

export default function PatrolPublic(){
  const {token}=useParams();
  const [vehicle,setVehicle]=useState(null);
  const [loading,setLoading]=useState(true);
  const [sent,setSent]=useState(false);
  const [form,setForm]=useState({
    rank:'',re:'',war_name:'',km_initial:'',time_start:'',
    fuel_km:'',oil_change_km:'',oil_filter_km:'',fuel_filter_km:'',
    issue_category:'Outros',issue_description:'',
    observations:'',files:[],declaration:false,events:{...emptyEvents}
  });

  useEffect(()=>{
    entities.publicVehicleTokens.get(token)
      .then(x=>{setVehicle(x?.active===false?null:x);setLoading(false)})
      .catch(()=>setLoading(false));
  },[token]);

  const toggleEvent=(key)=>{
    const enabled=!form.events[key];
    const fieldByEvent={fuel:'fuel_km',oil_change:'oil_change_km',oil_filter:'oil_filter_km',fuel_filter:'fuel_filter_km'};
    const patch={events:{...form.events,[key]:enabled}};
    if(!enabled&&fieldByEvent[key]) patch[fieldByEvent[key]]='';
    if(key==='mechanical_issue'&&!enabled){
      patch.issue_category='Outros';
      patch.issue_description='';
    }
    setForm({...form,...patch});
  };

  const submit=async(e)=>{
    e.preventDefault();
    if(!vehicle||!form.declaration)return;

    const receipt=form.files[0]?.url||'';
    const alerts=[];
    if(form.events.fuel) alerts.push('ABASTECIMENTO');
    if(form.events.oil_change) alerts.push('TROCA_OLEO');
    if(form.events.oil_filter) alerts.push('FILTRO_OLEO');
    if(form.events.fuel_filter) alerts.push('FILTRO_COMBUSTIVEL');
    if(form.events.mechanical_issue) alerts.push('AVARIA_MECANICA');

    await entities.operationalLogs.create({
      public_token:token,
      vehicle_id:vehicle.vehicle_id,
      vehicle_prefix:vehicle.prefix,
      vehicle_plate:vehicle.plate,
      vehicle_unit:vehicle.unit,
      rank:form.rank,
      re:form.re,
      war_name:form.war_name,
      km_initial:Number(form.km_initial||0),
      date:todayISO(),
      time_start:form.time_start,
      fuel_event:Boolean(form.events.fuel),
      fuel_km:form.events.fuel&&form.fuel_km?Number(form.fuel_km):null,
      fuel_receipt_url:form.events.fuel?receipt:'',
      oil_change_event:Boolean(form.events.oil_change),
      oil_change_km:form.events.oil_change&&form.oil_change_km?Number(form.oil_change_km):null,
      oil_filter_event:Boolean(form.events.oil_filter),
      oil_filter_km:form.events.oil_filter&&form.oil_filter_km?Number(form.oil_filter_km):null,
      fuel_filter_event:Boolean(form.events.fuel_filter),
      fuel_filter_km:form.events.fuel_filter&&form.fuel_filter_km?Number(form.fuel_filter_km):null,
      mechanical_issue_event:Boolean(form.events.mechanical_issue),
      issue_category:form.events.mechanical_issue?form.issue_category:'',
      issue_description:form.events.mechanical_issue?form.issue_description:'',
      issue_status:form.events.mechanical_issue?'PENDENTE_ANALISE':'',
      issue_files:form.events.mechanical_issue?form.files:[],
      observations:form.observations,
      files:form.files,
      alerts
    });
    setSent(true);
  };

  if(loading)return <div className="public-shell"><div className="full-loader"><span className="spinner"/></div></div>;
  if(!vehicle)return <div className="public-shell"><EmptyState icon={Shield} title="QR Code inválido ou bloqueado" text="Esta viatura não está disponível para lançamento operacional."/></div>;
  if(sent)return <div className="public-shell"><Card className="public-card"><div className="empty-icon" style={{background:'#e9f6ee',color:'#247d48'}}><CheckCircle2 size={26}/></div><h2 style={{textAlign:'center'}}>Lançamento enviado</h2><p className="muted small" style={{textAlign:'center'}}>O registro foi gravado. Se você relatou uma avaria, ela seguirá para análise do responsável pela viatura.</p></Card><Footer/></div>;

  const needsFiles=form.events.fuel||form.events.oil_change||form.events.oil_filter||form.events.fuel_filter||form.events.mechanical_issue;

  return <div className="public-shell">
    <Card className="public-card">
      <div className="public-brand"><div className="brand-mark"><Car size={20}/></div><div><strong>SIGFROTA</strong><span>Controle Operacional</span></div></div>
      <div className="public-vehicle"><strong>{vehicle.prefix}</strong><span>{vehicle.plate} • {vehicle.unit}</span></div>

      <form onSubmit={submit} className="form-stack">
        <div className="form-grid-3">
          <Field label="Posto/Graduação" required><Input required value={form.rank} onChange={e=>setForm({...form,rank:e.target.value})}/></Field>
          <Field label="RE" required><Input required value={form.re} onChange={e=>setForm({...form,re:e.target.value})}/></Field>
          <Field label="Nome de Guerra" required><Input required value={form.war_name} onChange={e=>setForm({...form,war_name:e.target.value})}/></Field>
        </div>

        <div className="form-grid">
          <Field label="KM atual / inicial" required><Input type="number" required value={form.km_initial} onChange={e=>setForm({...form,km_initial:e.target.value})}/></Field>
          <Field label="Hora inicial" required><Input type="time" required value={form.time_start} onChange={e=>setForm({...form,time_start:e.target.value})}/></Field>
        </div>

        <div className="public-event-box">
          <strong>Ocorrências deste lançamento</strong>
          <span>Marque somente o que realmente aconteceu. Para problema na viatura, descreva o sintoma e envie fotos sempre que possível.</span>

          <label className="event-toggle"><input type="checkbox" checked={form.events.mechanical_issue} onChange={()=>toggleEvent('mechanical_issue')}/><span>Relatar problema / avaria na viatura</span></label>
          {form.events.mechanical_issue&&<div className="form-stack" style={{marginTop:8}}>
            <Field label="Categoria do problema" required><Select required value={form.issue_category} onChange={e=>setForm({...form,issue_category:e.target.value})}>{DEFECT_CATEGORIES.map(x=><option key={x} value={x}>{x}</option>)}</Select></Field>
            <Field label="O que está acontecendo?" required><Textarea required value={form.issue_description} onChange={e=>setForm({...form,issue_description:e.target.value})} placeholder="Descreva o problema percebido, ruído, falha, luz no painel, avaria ou condição da viatura."/></Field>
          </div>}

          <label className="event-toggle"><input type="checkbox" checked={form.events.fuel} onChange={()=>toggleEvent('fuel')}/><span>Abastecimento</span></label>
          {form.events.fuel&&<Field label="KM do abastecimento" required><Input type="number" required value={form.fuel_km} onChange={e=>setForm({...form,fuel_km:e.target.value})}/></Field>}

          <label className="event-toggle"><input type="checkbox" checked={form.events.oil_change} onChange={()=>toggleEvent('oil_change')}/><span>Troca de óleo</span></label>
          {form.events.oil_change&&<Field label="KM da troca de óleo" required><Input type="number" required value={form.oil_change_km} onChange={e=>setForm({...form,oil_change_km:e.target.value})}/></Field>}

          <label className="event-toggle"><input type="checkbox" checked={form.events.oil_filter} onChange={()=>toggleEvent('oil_filter')}/><span>Troca do filtro de óleo</span></label>
          {form.events.oil_filter&&<Field label="KM da troca do filtro de óleo" required><Input type="number" required value={form.oil_filter_km} onChange={e=>setForm({...form,oil_filter_km:e.target.value})}/></Field>}

          <label className="event-toggle"><input type="checkbox" checked={form.events.fuel_filter} onChange={()=>toggleEvent('fuel_filter')}/><span>Troca do filtro de combustível</span></label>
          {form.events.fuel_filter&&<Field label="KM da troca do filtro de combustível" required><Input type="number" required value={form.fuel_filter_km} onChange={e=>setForm({...form,fuel_filter_km:e.target.value})}/></Field>}
        </div>

        <Field label="Observações gerais"><Textarea value={form.observations} onChange={e=>setForm({...form,observations:e.target.value})}/></Field>

        {needsFiles&&
          <div>
            <div className="field-label">Fotos / comprovantes</div>
            <AttachmentField max={10} value={form.files} onChange={files=>setForm({...form,files})}/>
          </div>
        }

        <label className="checkbox-row declaration"><input type="checkbox" checked={form.declaration} onChange={e=>setForm({...form,declaration:e.target.checked})}/> Declaro que as informações inseridas são verdadeiras e estou ciente de que, em caso de erro, deverei procurar o responsável pela frota para correção.</label>
        <Button type="submit" disabled={!form.declaration}>Enviar lançamento</Button>
      </form>
    </Card><Footer/>
  </div>;
}
