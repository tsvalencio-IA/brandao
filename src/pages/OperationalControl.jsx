import { useMemo, useState } from 'react';
import { Activity, Search } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { logAudit } from '../services/audit';
import { Button, EmptyState, Field, Input, Modal, PageHeader, Textarea } from '../components/ui';
import { dateBR } from '../lib/format';

export default function OperationalControl(){
  const {user,userRole}=useAuth();
  const logs=useCollection('operationalLogs',userRole==='adm_opm'&&user?.unit?{filters:{vehicle_unit:user.unit}}:{orderBy:'created_at',direction:'desc'});
  const [search,setSearch]=useState('');
  const [edit,setEdit]=useState(null);
  const [form,setForm]=useState({km_initial:'',km_final:'',observations:'',justification:''});
  const rows=useMemo(()=>logs.data.filter(x=>{
    if(userRole==='adm_opm'&&user?.unit&&x.vehicle_unit!==user.unit)return false;
    const q=search.toLowerCase();
    return !q||[x.vehicle_prefix,x.vehicle_plate,x.rank,x.re,x.war_name,x.vehicle_unit].some(v=>String(v||'').toLowerCase().includes(q));
  }),[logs.data,search,userRole,user?.unit]);

  const openEdit=(x)=>{setEdit(x);setForm({km_initial:String(x.km_initial||''),km_final:String(x.km_final||''),observations:x.observations||'',justification:''})};
  const save=async()=>{
    if(!form.justification.trim())return;
    const before={km_initial:edit.km_initial,km_final:edit.km_final,observations:edit.observations};
    const after={km_initial:Number(form.km_initial||0),km_final:form.km_final?Number(form.km_final):null,observations:form.observations};
    await entities.operationalLogs.update(edit.id,{...after,corrected:true,correction_by:user.email||user.displayName,correction_reason:form.justification});
    await logAudit({user,role:userRole,action:'CORRECAO_LANCAMENTO_OPERACIONAL',entity:'OperationalLog',recordId:edit.id,before,after,justification:form.justification,context:{vehicle_id:edit.vehicle_id,vehicle_prefix:edit.vehicle_prefix}});
    setEdit(null);
  };

  return <div>
    <PageHeader title="Controle Operacional" description="Lançamentos feitos por QR Code, quilometragem, abastecimento e manutenção preventiva."/>
    <div className="toolbar"><div className="search-field"><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar viatura, RE, nome de guerra ou OPM..."/></div></div>
    {rows.length===0?<EmptyState icon={Activity} title="Nenhum lançamento operacional"/>:
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Data</th><th>Viatura</th><th>Patrulheiro</th><th>KM inicial</th><th>KM final</th><th>Eventos</th><th></th></tr></thead><tbody>
      {rows.map(x=><tr key={x.id}><td>{dateBR(x.date)}</td><td><strong>{x.vehicle_prefix}</strong><br/><span className="muted">{x.vehicle_plate} • {x.vehicle_unit}</span></td><td>{x.rank} {x.war_name}<br/><span className="muted">RE {x.re}</span></td><td>{Number(x.km_initial||0).toLocaleString('pt-BR')}</td><td>{x.km_final?Number(x.km_final).toLocaleString('pt-BR'):'—'}</td><td>{x.fuel_km?'Abastecimento ':''}{x.oil_change_km?'• Óleo ':''}{x.alerts?.length?'• '+x.alerts.length+' alerta(s)':''}</td><td><Button variant="outline" onClick={()=>openEdit(x)}>Corrigir</Button></td></tr>)}
    </tbody></table></div>}
    <Modal open={!!edit} onClose={()=>setEdit(null)} title="Correção de lançamento operacional"><div className="form-stack">
      <div className="form-grid"><Field label="KM inicial"><Input type="number" value={form.km_initial} onChange={e=>setForm({...form,km_initial:e.target.value})}/></Field><Field label="KM final"><Input type="number" value={form.km_final} onChange={e=>setForm({...form,km_final:e.target.value})}/></Field></div>
      <Field label="Observações"><Textarea value={form.observations} onChange={e=>setForm({...form,observations:e.target.value})}/></Field>
      <Field label="Justificativa da correção" required><Textarea required value={form.justification} onChange={e=>setForm({...form,justification:e.target.value})}/></Field>
      <div className="form-actions"><Button variant="secondary" onClick={()=>setEdit(null)}>Cancelar</Button><Button onClick={save} disabled={!form.justification.trim()}>Salvar correção</Button></div>
    </div></Modal>
  </div>;
}
