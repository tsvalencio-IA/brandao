import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Plus, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { useAuth } from '../auth/AuthContext';
import { can, canViewVehicleUnit, getVehicleScopeMode, vehicleScopeFilter } from '../lib/permissions';
import { logAudit } from '../services/audit';
import { FUEL_TYPES, VEHICLE_TYPES } from '../data/schema';
import { generateToken, normalizePlate } from '../lib/format';
import StatusBadge from '../components/StatusBadge';
import { Button, EmptyState, Field, Input, Modal, PageHeader, Select } from '../components/ui';

const empty = { prefix:'', plate:'', brand:'', model:'', year:'', vehicle_type:'viatura_4rodas', fuel_type:'flex', unit:'', codigo_opm:'', modalidade:'', km_horimeter:'', responsible_user_id:'' };

export default function Vehicles() {
  const { user, userRole } = useAuth();
  const scopeFilters = vehicleScopeFilter(user, 'unit');
  const scopedToUnit = getVehicleScopeMode(user) === 'unit' && Boolean(user?.unit);
  const vehicleQuery = Object.keys(scopeFilters).length ? {filters:scopeFilters} : {orderBy:'created_at',direction:'desc'};
  const { data, loading } = useCollection('vehicles', vehicleQuery);
  const users = useCollection('users',{orderBy:'name',direction:'asc'});
  const [search,setSearch]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState(empty);
  const navigate=useNavigate();
  const canManage = can.manageVehicles(userRole,user);

  const rows=useMemo(()=>data.filter(v=>{
    if(v.deleted===true) return false;
    if(!canViewVehicleUnit(user,v.unit)) return false;
    const q=search.toLowerCase();
    return !q || [v.prefix,v.plate,v.brand,v.model,v.unit].some(x=>String(x||'').toLowerCase().includes(q));
  }),[data,search,user]);

  const openCreate=()=>{
    setForm({...empty,unit:scopedToUnit ? user.unit : ''});
    setOpen(true);
  };

  const save=async(e)=>{
    e.preventDefault();
    if(!canManage) return;
    const token=generateToken();
    const responsible=users.data.find(x=>String(x.id)===String(form.responsible_user_id));
    const payload={
      ...form,
      responsible_user_id:responsible?.id||'',
      responsible_name:responsible?.nome_guerra||responsible?.name||responsible?.email||'',
      unit:scopedToUnit ? user.unit : form.unit,
      plate:normalizePlate(form.plate),
      year:Number(form.year||0),
      km_horimeter:Number(form.km_horimeter||0),
      status:'OPERANDO',ativo:true,deleted:false,qr_token:token
    };
    const vehicle=await entities.vehicles.create(payload);
    await entities.publicVehicleTokens.create({
      vehicle_id:vehicle.id, prefix:vehicle.prefix, plate:vehicle.plate, unit:vehicle.unit, active:true
    },token);
    await logAudit({
      user,role:userRole,action:'VIATURA_CADASTRADA',entity:'Vehicle',recordId:vehicle.id,
      after:payload,context:{vehicle_prefix:vehicle.prefix,vehicle_plate:vehicle.plate,unit:vehicle.unit}
    });
    setForm(empty); setOpen(false);
  };

  const importFile=async(event)=>{
    const file=event.target.files?.[0]; event.target.value='';
    if(!file||!canManage) return;
    const wb=XLSX.read(await file.arrayBuffer());
    const json=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
    let imported=0;
    for(const r of json){
      const prefix=r.prefix||r.Prefixo||r.PREFIXO;
      const plate=r.plate||r.Placa||r.PLACA;
      if(!prefix||!plate) continue;
      const rowUnit=scopedToUnit ? user.unit : (r.unit||r.Unidade||'');
      const token=generateToken();
      const v=await entities.vehicles.create({
        prefix:String(prefix), plate:normalizePlate(plate), brand:r.brand||r.Marca||'', model:r.model||r.Modelo||'',
        year:Number(r.year||r.Ano||0), vehicle_type:r.vehicle_type||'viatura_4rodas', fuel_type:r.fuel_type||'flex',
        unit:rowUnit, codigo_opm:r.codigo_opm||r['Código OPM']||'', modalidade:r.modalidade||r.Modalidade||'',
        km_horimeter:Number(r.km_horimeter||r.KM||0),
        responsible_user_id:r.responsible_user_id||r['Responsável UID']||'',
        responsible_name:r.responsible_name||r['Responsável']||'',
        status:'OPERANDO', ativo:true, deleted:false, qr_token:token
      });
      await entities.publicVehicleTokens.create({vehicle_id:v.id,prefix:v.prefix,plate:v.plate,unit:v.unit,active:true},token);
      imported++;
    }
    await logAudit({
      user,role:userRole,action:'VIATURAS_IMPORTADAS',entity:'Vehicle',recordId:'IMPORTACAO',
      after:{quantidade:imported,arquivo:file.name,unit:scopedToUnit?user.unit:'MULTIPLAS'}
    });
  };

  return <div>
    <PageHeader title="Viaturas" description={rows.length+' viatura(s) encontrada(s)'} actions={canManage&&<>
      <label className="btn btn-secondary"><Upload size={15}/> Importar Excel/CSV<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={importFile}/></label>
      <Button onClick={openCreate}><Plus size={15}/>Cadastrar Viatura</Button>
    </>}/>
    {scopedToUnit&&<div className="scope-banner"><strong>Escopo de viaturas:</strong> {user.unit}</div>}
    <div className="toolbar"><div className="search-field"><Input placeholder="Buscar por prefixo, placa, modelo ou OPM..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
    {loading?<div className="full-loader inline"><span className="spinner"/></div>:rows.length===0?<EmptyState icon={Car} title="Nenhuma viatura cadastrada" text="Nenhuma viatura está disponível dentro do seu escopo de acesso."/>:
    <div className="table-wrap responsive-table"><table className="data-table"><thead><tr><th>Prefixo</th><th>Placa</th><th>Veículo</th><th>OPM</th><th>KM</th><th>Status</th></tr></thead><tbody>{rows.map(v=><tr key={v.id} className="clickable" onClick={()=>navigate('/viaturas/'+v.id)}><td data-label="Prefixo"><strong>{v.prefix}</strong></td><td data-label="Placa">{v.plate}</td><td data-label="Veículo">{v.brand} {v.model} {v.year||''}</td><td data-label="OPM">{v.unit||'—'}</td><td data-label="KM">{Number(v.km_horimeter||0).toLocaleString('pt-BR')}</td><td data-label="Status"><StatusBadge status={v.status}/></td></tr>)}</tbody></table></div>}
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
        <Field label="Unidade (OPM)" required><Input required disabled={scopedToUnit} value={scopedToUnit?user.unit:form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></Field>
        <Field label="Código OPM"><Input value={form.codigo_opm} onChange={e=>setForm({...form,codigo_opm:e.target.value})}/></Field>
        <Field label="Modalidade"><Input value={form.modalidade} onChange={e=>setForm({...form,modalidade:e.target.value})}/></Field>
        <Field label="Responsável pela viatura" hint="Este usuário receberá as atualizações desta viatura no aplicativo."><Select value={form.responsible_user_id} onChange={e=>setForm({...form,responsible_user_id:e.target.value})}><option value="">Sem responsável definido</option>{users.data.filter(u=>u.deleted!==true&&u.active!==false&&(!form.unit||!u.unit||u.unit===form.unit)).map(u=><option key={u.id} value={u.id}>{u.nome_guerra||u.name||u.email} {u.unit?'• '+u.unit:''}</option>)}</Select></Field>
      </div><div className="form-actions"><Button variant="secondary" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
    </form></Modal>
  </div>;
}
