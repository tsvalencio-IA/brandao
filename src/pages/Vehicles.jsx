import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Plus, Search, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { useAuth } from '../auth/AuthContext';
import { can } from '../lib/permissions';
import { FUEL_TYPES, VEHICLE_TYPES } from '../data/schema';
import { generateToken, normalizePlate } from '../lib/format';
import StatusBadge from '../components/StatusBadge';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select } from '../components/ui';

const empty = { prefix:'', plate:'', brand:'', model:'', year:'', vehicle_type:'viatura_4rodas', fuel_type:'flex', unit:'', codigo_opm:'', modalidade:'', km_horimeter:'' };

export default function Vehicles() {
  const { user, userRole } = useAuth();
  const vehicleQuery = userRole==='adm_opm' && user?.unit ? {filters:{unit:user.unit}} : {orderBy:'created_at',direction:'desc'};
  const { data, loading } = useCollection('vehicles', vehicleQuery);
  const [search,setSearch]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState(empty);
  const navigate=useNavigate();

  const rows=useMemo(()=>data.filter(v=>{
    if(userRole==='adm_opm' && user?.unit && v.unit!==user.unit) return false;
    const q=search.toLowerCase();
    return !q || [v.prefix,v.plate,v.brand,v.model,v.unit].some(x=>String(x||'').toLowerCase().includes(q));
  }),[data,search,userRole,user?.unit]);

  const save=async(e)=>{
    e.preventDefault();
    const token=generateToken();
    const vehicle=await entities.vehicles.create({
      ...form, plate:normalizePlate(form.plate), year:Number(form.year||0), km_horimeter:Number(form.km_horimeter||0),
      status:'OPERANDO', ativo:true, qr_token:token
    });
    await entities.publicVehicleTokens.create({
      vehicle_id:vehicle.id, prefix:vehicle.prefix, plate:vehicle.plate, unit:vehicle.unit, active:true
    },token);
    setForm(empty); setOpen(false);
  };

  const importFile=async(event)=>{
    const file=event.target.files?.[0]; event.target.value='';
    if(!file) return;
    const wb=XLSX.read(await file.arrayBuffer());
    const json=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
    for(const r of json){
      const prefix=r.prefix||r.Prefixo||r.PREFIXO;
      const plate=r.plate||r.Placa||r.PLACA;
      if(!prefix||!plate) continue;
      const token=generateToken();
      const v=await entities.vehicles.create({
        prefix:String(prefix), plate:normalizePlate(plate), brand:r.brand||r.Marca||'', model:r.model||r.Modelo||'',
        year:Number(r.year||r.Ano||0), vehicle_type:r.vehicle_type||'viatura_4rodas', fuel_type:r.fuel_type||'flex',
        unit:r.unit||r.Unidade||'', codigo_opm:r.codigo_opm||r['Código OPM']||'', modalidade:r.modalidade||r.Modalidade||'',
        km_horimeter:Number(r.km_horimeter||r.KM||0), status:'OPERANDO', ativo:true, qr_token:token
      });
      await entities.publicVehicleTokens.create({vehicle_id:v.id,prefix:v.prefix,plate:v.plate,unit:v.unit,active:true},token);
    }
  };

  return <div>
    <PageHeader title="Viaturas" description={rows.length+' viatura(s) encontrada(s)'} actions={can.manageVehicles(userRole,user)&&<>
      <label className="btn btn-secondary"><Upload size={15}/> Importar Excel/CSV<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={importFile}/></label>
      <Button onClick={()=>setOpen(true)}><Plus size={15}/>Cadastrar Viatura</Button>
    </>}/>
    <div className="toolbar"><div className="search-field"><Input placeholder="Buscar por prefixo, placa, modelo ou OPM..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
    {loading?<div className="full-loader inline"><span className="spinner"/></div>:rows.length===0?<EmptyState icon={Car} title="Nenhuma viatura cadastrada" text="A frota será exibida aqui assim que os registros forem cadastrados ou importados."/>:
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Prefixo</th><th>Placa</th><th>Veículo</th><th>OPM</th><th>KM</th><th>Status</th></tr></thead><tbody>{rows.map(v=><tr key={v.id} className="clickable" onClick={()=>navigate('/viaturas/'+v.id)}><td><strong>{v.prefix}</strong></td><td>{v.plate}</td><td>{v.brand} {v.model} {v.year||''}</td><td>{v.unit||'—'}</td><td>{Number(v.km_horimeter||0).toLocaleString('pt-BR')}</td><td><StatusBadge status={v.status}/></td></tr>)}</tbody></table></div>}
    <Modal open={open} onClose={()=>setOpen(false)} title="Cadastrar Viatura" wide><form onSubmit={save}>
      <div className="form-grid-3">
        <Field label="Prefixo" required><Input required value={form.prefix} onChange={e=>setForm({...form,prefix:e.target.value})}/></Field>
        <Field label="Placa" required><Input required value={form.plate} onChange={e=>setForm({...form,plate:e.target.value})}/></Field>
        <Field label="Ano" required><Input type="number" required value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></Field>
        <Field label="Marca" required><Input required value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></Field>
        <Field label="Modelo" required><Input required value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></Field>
        <Field label="KM / Horímetro"><Input type="number" value={form.km_horimeter} onChange={e=>setForm({...form,km_horimeter:e.target.value})}/></Field>
        <Field label="Tipo"><Select value={form.vehicle_type} onChange={e=>setForm({...form,vehicle_type:e.target.value})}>{VEHICLE_TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="Combustível"><Select value={form.fuel_type} onChange={e=>setForm({...form,fuel_type:e.target.value})}>{FUEL_TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="Unidade (OPM)" required><Input required value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></Field>
        <Field label="Código OPM"><Input value={form.codigo_opm} onChange={e=>setForm({...form,codigo_opm:e.target.value})}/></Field>
        <Field label="Modalidade"><Input value={form.modalidade} onChange={e=>setForm({...form,modalidade:e.target.value})}/></Field>
      </div><div className="form-actions"><Button variant="secondary" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
    </form></Modal>
  </div>;
}
