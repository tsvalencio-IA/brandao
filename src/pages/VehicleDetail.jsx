import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, QrCode, Wrench, Trash2, Pencil } from 'lucide-react';
import QRCode from 'qrcode';
import { useEntity } from '../hooks/useEntity';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../auth/AuthContext';
import { entities } from '../data/repository';
import { can, getVehicleScopeMode, vehicleScopeFilter } from '../lib/permissions';
import { logAudit } from '../services/audit';
import { APP } from '../config/app';
import { FUEL_TYPES, VEHICLE_TYPES } from '../data/schema';
import { normalizePlate } from '../lib/format';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select } from '../components/ui';
import StatusBadge from '../components/StatusBadge';
import { dateBR, money } from '../lib/format';

const editShape=(v)=>({
  prefix:v?.prefix||'',plate:v?.plate||'',brand:v?.brand||'',model:v?.model||'',year:v?.year||'',
  vehicle_type:v?.vehicle_type||'viatura_4rodas',fuel_type:v?.fuel_type||'flex',unit:v?.unit||'',
  codigo_opm:v?.codigo_opm||'',modalidade:v?.modalidade||'',km_horimeter:v?.km_horimeter||'',
  chassis:v?.chassis||'',renavam:v?.renavam||'',patrimonio:v?.patrimonio||'',next_service_date:v?.next_service_date||''
});

export default function VehicleDetail(){
  const {id}=useParams();
  const {user,userRole}=useAuth();
  const navigate=useNavigate();
  const vehicle=useEntity('vehicles',id);
  const orderFilters={vehicle_id:id,...vehicleScopeFilter(user,'unit')};
  const opFilters={vehicle_id:id,...vehicleScopeFilter(user,'vehicle_unit')};
  const orders=useCollection('maintenanceOrders',{filters:orderFilters});
  const ops=useCollection('operationalLogs',{filters:opFilters});
  const total=useMemo(()=>orders.data.reduce((s,o)=>s+Number(o.budget_total||0),0),[orders.data]);
  const [editOpen,setEditOpen]=useState(false);
  const [form,setForm]=useState({});
  const [saving,setSaving]=useState(false);
  const canManage=can.manageVehicles(userRole,user);
  const scopedToUnit=getVehicleScopeMode(user)==='unit'&&Boolean(user?.unit);

  const openEdit=()=>{setForm(editShape(vehicle.data));setEditOpen(true)};

  const saveEdit=async(e)=>{
    e.preventDefault();
    if(!canManage||!vehicle.data)return;
    setSaving(true);
    try{
      const before={...vehicle.data};
      const after={
        ...form,
        unit:scopedToUnit?user.unit:form.unit,
        plate:normalizePlate(form.plate),
        year:Number(form.year||0),
        km_horimeter:Number(form.km_horimeter||0),
      };
      await entities.vehicles.update(id,after);
      if(vehicle.data.qr_token){
        try{await entities.publicVehicleTokens.update(vehicle.data.qr_token,{prefix:after.prefix,plate:after.plate,unit:after.unit,active:true})}catch{}
      }
      await logAudit({
        user,role:userRole,action:'VIATURA_EDITADA',entity:'Vehicle',recordId:id,before,after,
        context:{vehicle_prefix:after.prefix,vehicle_plate:after.plate,unit:after.unit}
      });
      setEditOpen(false);
    }finally{setSaving(false)}
  };

  const removeVehicle=async()=>{
    if(!canManage||!vehicle.data) return;
    if(!window.confirm('Excluir esta viatura do SIGFROTA? Ela sairá das telas, mas o histórico já registrado será preservado.')) return;
    const before={...vehicle.data};
    const after={
      deleted:true,ativo:false,status:'INATIVA',
      deleted_at:new Date().toISOString(),deleted_by_uid:user?.uid||null,deleted_by_email:user?.email||null
    };
    await entities.vehicles.update(id,after);
    try{if(vehicle.data.qr_token) await entities.publicVehicleTokens.update(vehicle.data.qr_token,{active:false})}catch{}
    await logAudit({
      user,role:userRole,action:'VIATURA_EXCLUIDA',entity:'Vehicle',recordId:id,before,after,
      context:{vehicle_prefix:vehicle.data.prefix,vehicle_plate:vehicle.data.plate,unit:vehicle.data.unit}
    });
    navigate('/viaturas');
  };

  const showQR=async()=>{
    if(!vehicle.data?.qr_token) return;
    const base=APP.publicUrl || window.location.href.split('#')[0];
    const url=base+'#/patrulha/'+vehicle.data.qr_token;
    const data=await QRCode.toDataURL(url,{width:360,margin:2});
    const w=window.open('','_blank');
    w.document.write('<title>QR '+vehicle.data.prefix+'</title><div style="font-family:Arial;text-align:center;padding:30px"><h2>'+vehicle.data.prefix+'</h2><p>'+vehicle.data.plate+'</p><img src="'+data+'"><p style="font-size:12px">'+url+'</p></div>');
  };

  if(vehicle.loading) return <div className="full-loader inline"><span className="spinner"/></div>;
  if(!vehicle.data||vehicle.data.deleted===true) return <EmptyState icon={Wrench} title="Viatura não encontrada"/>;
  const v=vehicle.data;
  return <div>
    <PageHeader title={v.prefix} description={(v.brand||'')+' '+(v.model||'')+' • '+(v.plate||'')} actions={<>
      <Link to="/viaturas"><Button variant="secondary"><ArrowLeft size={15}/>Voltar</Button></Link>
      <Button variant="outline" onClick={showQR}><QrCode size={15}/>QR Code</Button>
      {v.status==='OPERANDO'&&can.registerDown(userRole,user)&&<Link to={'/registrar-baixa?vehicle='+v.id}><Button variant="danger"><AlertTriangle size={15}/>Dar Baixa</Button></Link>}
      {canManage&&<Button variant="outline" onClick={openEdit}><Pencil size={15}/>Editar Viatura</Button>}
      {canManage&&<Button variant="danger" onClick={removeVehicle}><Trash2 size={15}/>Excluir Viatura</Button>}
    </>}/>
    {scopedToUnit&&<div className="scope-banner"><strong>Seu escopo:</strong> {user.unit}</div>}
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-top">Status</div><div style={{marginTop:16}}><StatusBadge status={v.status}/></div></div>
      <div className="stat-card"><div className="stat-top">KM atual</div><strong>{Number(v.km_horimeter||0).toLocaleString('pt-BR')}</strong></div>
      <div className="stat-card"><div className="stat-top">Ordens</div><strong>{orders.data.length}</strong></div>
      <div className="stat-card"><div className="stat-top">Custo acumulado</div><strong style={{fontSize:18}}>{money(total)}</strong></div>
    </div>
    <h2 className="section-title">Ficha técnica</h2><Card><div className="detail-grid">
      {[['Prefixo',v.prefix],['Placa',v.plate],['Marca',v.brand],['Modelo',v.model],['Ano',v.year],['OPM',v.unit],['Código OPM',v.codigo_opm],['Modalidade',v.modalidade],['Chassi',v.chassis],['RENAVAM',v.renavam],['Patrimônio',v.patrimonio],['Próxima revisão',dateBR(v.next_service_date)]].map(([a,b])=><div className="detail-item" key={a}><span>{a}</span><strong>{b||'—'}</strong></div>)}
    </div></Card>
    <h2 className="section-title">Ordens de manutenção</h2>
    {orders.data.length===0?<EmptyState icon={Wrench} title="Nenhuma ordem registrada"/>:<div className="card-list">{orders.data.map(o=><Link key={o.id} to={'/ordens/'+o.id}><Card className="record-card"><div className="record-main"><h3>{o.oes_number||'Ordem sem OES'}</h3><p>{o.defect_description}</p><p>{dateBR(o.defect_date)} • {o.workshop_name||'Sem oficina'}</p></div><div className="record-side"><StatusBadge status={o.status}/>{o.budget_total>0&&<p className="small">{money(o.budget_total)}</p>}</div></Card></Link>)}</div>}
    <h2 className="section-title">Controle operacional</h2>
    {ops.data.length===0?<EmptyState icon={QrCode} title="Nenhum lançamento via QR Code"/>:<div className="table-wrap responsive-table"><table className="data-table"><thead><tr><th>Data</th><th>Patrulheiro</th><th>KM inicial</th><th>KM final</th></tr></thead><tbody>{ops.data.map(x=><tr key={x.id}><td data-label="Data">{dateBR(x.date)}</td><td data-label="Patrulheiro">{x.rank} {x.war_name} • RE {x.re}</td><td data-label="KM inicial">{x.km_initial}</td><td data-label="KM final">{x.km_final||'—'}</td></tr>)}</tbody></table></div>}

    <Modal open={editOpen} onClose={()=>!saving&&setEditOpen(false)} title="Editar Viatura" wide>
      <form onSubmit={saveEdit} className="form-stack">
        <div className="form-grid-3">
          <Field label="Prefixo" required><Input required value={form.prefix||''} onChange={e=>setForm({...form,prefix:e.target.value})}/></Field>
          <Field label="Placa" required><Input required value={form.plate||''} onChange={e=>setForm({...form,plate:e.target.value})}/></Field>
          <Field label="Ano"><Input type="number" value={form.year||''} onChange={e=>setForm({...form,year:e.target.value})}/></Field>
          <Field label="Marca"><Input value={form.brand||''} onChange={e=>setForm({...form,brand:e.target.value})}/></Field>
          <Field label="Modelo"><Input value={form.model||''} onChange={e=>setForm({...form,model:e.target.value})}/></Field>
          <Field label="KM / Horímetro"><Input type="number" value={form.km_horimeter||''} onChange={e=>setForm({...form,km_horimeter:e.target.value})}/></Field>
          <Field label="Tipo"><Select value={form.vehicle_type||'viatura_4rodas'} onChange={e=>setForm({...form,vehicle_type:e.target.value})}>{VEHICLE_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</Select></Field>
          <Field label="Combustível"><Select value={form.fuel_type||'flex'} onChange={e=>setForm({...form,fuel_type:e.target.value})}>{FUEL_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</Select></Field>
          <Field label="Unidade (OPM)" required><Input required disabled={scopedToUnit} value={scopedToUnit?user.unit:(form.unit||'')} onChange={e=>setForm({...form,unit:e.target.value})}/></Field>
          <Field label="Código OPM"><Input value={form.codigo_opm||''} onChange={e=>setForm({...form,codigo_opm:e.target.value})}/></Field>
          <Field label="Modalidade"><Input value={form.modalidade||''} onChange={e=>setForm({...form,modalidade:e.target.value})}/></Field>
          <Field label="Chassi"><Input value={form.chassis||''} onChange={e=>setForm({...form,chassis:e.target.value})}/></Field>
          <Field label="RENAVAM"><Input value={form.renavam||''} onChange={e=>setForm({...form,renavam:e.target.value})}/></Field>
          <Field label="Patrimônio"><Input value={form.patrimonio||''} onChange={e=>setForm({...form,patrimonio:e.target.value})}/></Field>
          <Field label="Próxima revisão"><Input type="date" value={String(form.next_service_date||'').slice(0,10)} onChange={e=>setForm({...form,next_service_date:e.target.value})}/></Field>
        </div>
        <div className="form-actions"><Button variant="secondary" onClick={()=>setEditOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving?'Salvando...':'Salvar alterações'}</Button></div>
      </form>
    </Modal>
  </div>;
}
