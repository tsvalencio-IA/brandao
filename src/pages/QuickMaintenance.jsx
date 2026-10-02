import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { useAuth } from '../auth/AuthContext';
import { vehicleScopeFilter } from '../lib/permissions';
import { todayISO } from '../lib/format';
import { logAudit } from '../services/audit';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from '../components/ui';

export default function QuickMaintenance(){
  const {user,userRole}=useAuth();
  const [params]=useSearchParams();
  const navigate=useNavigate();
  const vehicleFilters=vehicleScopeFilter(user,'unit');
  const maintenanceFilters=vehicleScopeFilter(user,'vehicle_unit');
  const vehicles=useCollection('vehicles',Object.keys(vehicleFilters).length?{filters:vehicleFilters}:{orderBy:'prefix',direction:'asc'});
  const downs=useCollection('vehicleDowns',Object.keys(vehicleFilters).length?{filters:vehicleFilters}:{orderBy:'created_at',direction:'desc'});
  const parts=useCollection('parts',{orderBy:'name',direction:'asc'});
  const list=useCollection('quickMaintenances',Object.keys(maintenanceFilters).length?{filters:maintenanceFilters}:{orderBy:'created_at',direction:'desc'});
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({vehicle_id:'',maintenance_type:'troca_lampada',description:'',km_current:'',part_id:'',quantity:'1',priority:'leve'});
  const usableParts=useMemo(()=>parts.data.filter(p=>p.category!=='pneus'&&p.active!==false),[parts.data]);

  const activeDown=(vehicleId)=>[...downs.data]
    .filter(d=>String(d.vehicle_id)===String(vehicleId))
    .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null;

  useEffect(()=>{
    const vehicleId=params.get('vehicle');
    if(!vehicleId||open) return;
    const vehicle=vehicles.data.find(v=>String(v.id)===String(vehicleId)&&v.deleted!==true);
    if(vehicle){
      setForm(f=>({...f,vehicle_id:vehicle.id,km_current:String(vehicle.km_horimeter||'')}));
      setOpen(true);
    }
  },[params,vehicles.data,open]);

  const closeModal=()=>{
    const vehicleId=params.get('vehicle') || form.vehicle_id || '';
    setOpen(false);
    if(params.get('vehicle')&&vehicleId){
      navigate('/viaturas/'+vehicleId,{replace:true});
    }
  };

  const save=async(e)=>{
    e.preventDefault();
    const v=vehicles.data.find(x=>x.id===form.vehicle_id);
    const p=usableParts.find(x=>x.id===form.part_id);
    const q=Number(form.quantity||0);
    if(!v)return;
    if(p&&q>Number(p.quantity||0))return alert('Saldo insuficiente.');

    const down=activeDown(v.id);
    const row=await entities.quickMaintenances.create({
      vehicle_id:v.id,
      vehicle_prefix:v.prefix,
      vehicle_plate:v.plate,
      vehicle_unit:v.unit,
      vehicle_down_id:down?.id||null,
      diagnosis_id:down?.diagnosis_id||null,
      maintenance_type:form.maintenance_type,
      description:form.description,
      km_current:Number(form.km_current||v.km_horimeter||0),
      date:todayISO(),
      mechanic_name:user.displayName||user.email,
      mechanic_email:user.email,
      parts_used:p?[{part_id:p.id,part_name:p.name,quantity:q}]:[],
      priority:form.priority,
      status:'concluido'
    });

    if(p){
      await entities.parts.update(p.id,{quantity:Number(p.quantity)-q});
      await entities.stockMovements.create({
        part_id:p.id,part_name:p.name,part_brand:p.brand||'',type:'saida',quantity:q,date:todayISO(),
        vehicle_id:v.id,vehicle_prefix:v.prefix,vehicle_plate:v.plate,usage_type:'manutencao_rapida',
        mechanic_name:user.displayName||user.email,quick_maintenance_id:row.id,reason:form.description
      });
    }

    if(down){
      await entities.vehicleDowns.update(down.id,{
        status:'MANUTENCAO_RAPIDA_CONCLUIDA',
        quick_maintenance_id:row.id
      });
    }

    await entities.vehicles.update(v.id,{
      km_horimeter:Number(form.km_current||v.km_horimeter||0),
      status:'OPERANDO'
    });

    await logAudit({
      user,role:userRole,action:'MANUTENCAO_RAPIDA_CONCLUIDA',entity:'QuickMaintenance',recordId:row.id,
      context:{vehicle_id:v.id,vehicle_down_id:down?.id||null,maintenance_type:form.maintenance_type}
    });

    setOpen(false);
    setForm({vehicle_id:'',maintenance_type:'troca_lampada',description:'',km_current:'',part_id:'',quantity:'1',priority:'leve'});
    navigate('/viaturas/'+v.id,{replace:true});
  };

  return <div>
    <PageHeader title="Manutenção Rápida" description="Serviços internos simples. Pneus não podem ser encerrados neste fluxo." actions={<Button onClick={()=>setOpen(true)}>Nova Manutenção</Button>}/>
    {list.data.length===0?<EmptyState icon={Wrench} title="Nenhuma manutenção rápida registrada"/>:
      <div className="card-list">{list.data.map(x=><Card className="record-card" key={x.id}>
        <div className="record-main"><h3>{x.vehicle_prefix} • {x.maintenance_type?.replaceAll('_',' ')}</h3><p>{x.description}</p><p>{x.date} • {x.mechanic_name} • KM {x.km_current}</p></div>
      </Card>)}</div>}

    <Modal open={open} onClose={closeModal} title="Manutenção Rápida">
      <form onSubmit={save} className="form-stack">
        <Field label="Viatura" required>
          <Select required value={form.vehicle_id} onChange={e=>setForm({...form,vehicle_id:e.target.value})}>
            <option value="">Selecione...</option>
            {vehicles.data.filter(v=>v.deleted!==true&&v.ativo!==false).map(v=><option key={v.id} value={v.id}>{v.prefix} • {v.plate}</option>)}
          </Select>
        </Field>
        <div className="form-grid">
          <Field label="Tipo"><Select value={form.maintenance_type} onChange={e=>setForm({...form,maintenance_type:e.target.value})}>{['troca_lampada','troca_palheta','troca_pastilha_freio','troca_fusivel','reparo_leve','outro'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</Select></Field>
          <Field label="KM"><Input type="number" value={form.km_current} onChange={e=>setForm({...form,km_current:e.target.value})}/></Field>
        </div>
        <Field label="Descrição" required><Textarea required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field>
        <div className="form-grid">
          <Field label="Peça utilizada"><Select value={form.part_id} onChange={e=>setForm({...form,part_id:e.target.value})}><option value="">Sem peça</option>{usableParts.map(p=><option key={p.id} value={p.id}>{p.name} • saldo {p.quantity}</option>)}</Select></Field>
          <Field label="Quantidade"><Input type="number" min="1" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></Field>
        </div>
        <div className="warning-box">Troca de pneu deve seguir Checklist → OES. Por isso peças da categoria pneus não aparecem aqui.</div>
        <div className="form-actions"><Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button><Button type="submit">Concluir</Button></div>
      </form>
    </Modal>
  </div>;
}
