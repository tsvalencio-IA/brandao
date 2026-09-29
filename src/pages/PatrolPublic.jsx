import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Car, CheckCircle2, Shield } from 'lucide-react';
import { entities } from '../data/repository';
import { todayISO } from '../lib/format';
import AttachmentField from '../components/AttachmentField';
import Footer from '../components/Footer';
import { Button, Card, EmptyState, Field, Input, Textarea } from '../components/ui';

export default function PatrolPublic(){
  const {token}=useParams();
  const [vehicle,setVehicle]=useState(null);
  const [loading,setLoading]=useState(true);
  const [sent,setSent]=useState(false);
  const [form,setForm]=useState({rank:'',re:'',war_name:'',km_initial:'',km_final:'',time_start:'',time_end:'',fuel_km:'',oil_change_km:'',oil_filter_km:'',fuel_filter_km:'',observations:'',files:[],declaration:false});

  useEffect(()=>{entities.publicVehicleTokens.get(token).then(x=>{setVehicle(x?.active===false?null:x);setLoading(false)}).catch(()=>setLoading(false))},[token]);

  const submit=async(e)=>{
    e.preventDefault();
    if(!vehicle||!form.declaration)return;
    const receipt=form.files[0]?.url||'';
    await entities.operationalLogs.create({
      public_token:token,vehicle_id:vehicle.vehicle_id,vehicle_prefix:vehicle.prefix,vehicle_plate:vehicle.plate,vehicle_unit:vehicle.unit,
      rank:form.rank,re:form.re,war_name:form.war_name,km_initial:Number(form.km_initial||0),km_final:form.km_final?Number(form.km_final):null,
      date:todayISO(),time_start:form.time_start,time_end:form.time_end,fuel_km:form.fuel_km?Number(form.fuel_km):null,
      fuel_receipt_url:receipt,oil_change_km:form.oil_change_km?Number(form.oil_change_km):null,oil_filter_km:form.oil_filter_km?Number(form.oil_filter_km):null,
      fuel_filter_km:form.fuel_filter_km?Number(form.fuel_filter_km):null,observations:form.observations,alerts:[]
    });
    setSent(true);
  };

  if(loading)return <div className="public-shell"><div className="full-loader"><span className="spinner"/></div></div>;
  if(!vehicle)return <div className="public-shell"><EmptyState icon={Shield} title="QR Code inválido ou bloqueado" text="Esta viatura não está disponível para lançamento operacional."/></div>;
  if(sent)return <div className="public-shell"><Card className="public-card"><div className="empty-icon" style={{background:'#e9f6ee',color:'#247d48'}}><CheckCircle2 size={26}/></div><h2 style={{textAlign:'center'}}>Lançamento enviado</h2><p className="muted small" style={{textAlign:'center'}}>O registro foi gravado. Para correção, procure o Motomec responsável.</p></Card><Footer/></div>;

  return <div className="public-shell">
    <Card className="public-card">
      <div className="public-brand"><div className="brand-mark"><Car size={20}/></div><div><strong>SIGFROTA</strong><span>Controle Operacional</span></div></div>
      <div className="public-vehicle"><strong>{vehicle.prefix}</strong><span>{vehicle.plate} • {vehicle.unit}</span></div>
      <form onSubmit={submit} className="form-stack">
        <div className="form-grid-3"><Field label="Posto/Graduação" required><Input required value={form.rank} onChange={e=>setForm({...form,rank:e.target.value})}/></Field><Field label="RE" required><Input required value={form.re} onChange={e=>setForm({...form,re:e.target.value})}/></Field><Field label="Nome de Guerra" required><Input required value={form.war_name} onChange={e=>setForm({...form,war_name:e.target.value})}/></Field></div>
        <div className="form-grid"><Field label="KM inicial" required><Input type="number" required value={form.km_initial} onChange={e=>setForm({...form,km_initial:e.target.value})}/></Field><Field label="KM final"><Input type="number" value={form.km_final} onChange={e=>setForm({...form,km_final:e.target.value})}/></Field><Field label="Hora inicial" required><Input type="time" required value={form.time_start} onChange={e=>setForm({...form,time_start:e.target.value})}/></Field><Field label="Hora final"><Input type="time" value={form.time_end} onChange={e=>setForm({...form,time_end:e.target.value})}/></Field></div>
        <div className="form-grid-3"><Field label="KM abastecimento"><Input type="number" value={form.fuel_km} onChange={e=>setForm({...form,fuel_km:e.target.value})}/></Field><Field label="KM troca de óleo"><Input type="number" value={form.oil_change_km} onChange={e=>setForm({...form,oil_change_km:e.target.value})}/></Field><Field label="KM filtro de óleo"><Input type="number" value={form.oil_filter_km} onChange={e=>setForm({...form,oil_filter_km:e.target.value})}/></Field><Field label="KM filtro combustível"><Input type="number" value={form.fuel_filter_km} onChange={e=>setForm({...form,fuel_filter_km:e.target.value})}/></Field></div>
        <Field label="Observações"><Textarea value={form.observations} onChange={e=>setForm({...form,observations:e.target.value})}/></Field>
        <AttachmentField max={10} value={form.files} onChange={files=>setForm({...form,files})}/>
        <label className="checkbox-row declaration"><input type="checkbox" checked={form.declaration} onChange={e=>setForm({...form,declaration:e.target.checked})}/> Declaro que as informações inseridas são verdadeiras e estou ciente de que, em caso de erro, deverei procurar o Motomec responsável para correção.</label>
        <Button type="submit" disabled={!form.declaration}>Enviar lançamento</Button>
      </form>
    </Card><Footer/>
  </div>;
}
