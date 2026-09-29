import { useMemo, useState } from 'react';
import { Shield, Search } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { EmptyState, Input, PageHeader } from '../components/ui';
import { dateTimeBR } from '../lib/format';

export default function Audit(){
  const logs=useCollection('auditLogs',{orderBy:'date_time',direction:'desc',limit:500});
  const [search,setSearch]=useState('');
  const rows=useMemo(()=>logs.data.filter(x=>{const q=search.toLowerCase();return !q||[x.user_name,x.user_email,x.role,x.action,x.entity,x.record_id,JSON.stringify(x.context||{})].some(v=>String(v||'').toLowerCase().includes(q))}),[logs.data,search]);
  return <div><PageHeader title="Auditoria" description="Registro institucional de ações, alterações de status e correções. Acesso exclusivo do Gestor."/>
    <div className="toolbar"><div className="search-field"><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar usuário, ação, entidade ou viatura..."/></div></div>
    {rows.length===0?<EmptyState icon={Shield} title="Nenhum evento de auditoria"/>:<div className="timeline">{rows.map(x=><div className="timeline-item" key={x.id}><strong>{x.action}</strong><p>{dateTimeBR(x.date_time)} • {x.user_name||x.user_email||'Sistema'} • {x.role||'—'}</p><p>{x.entity||'—'} {x.record_id?'• '+x.record_id:''}</p>{x.justification&&<p><b>Justificativa:</b> {x.justification}</p>}</div>)}</div>}
  </div>;
}
