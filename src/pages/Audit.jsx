import { useMemo, useState } from 'react';
import { Shield } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { EmptyState, Input, PageHeader } from '../components/ui';
import { dateTimeBR } from '../lib/format';

const pretty = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
};

export default function Audit(){
  const logs=useCollection('auditLogs',{orderBy:'date_time',direction:'desc',limit:500});
  const [search,setSearch]=useState('');

  const rows=useMemo(()=>logs.data.filter(x=>{
    const q=search.toLowerCase();
    return !q||[
      x.user_name,x.user_email,x.role,x.action,x.entity,x.record_id,
      x.context?.target_email,x.justification,JSON.stringify(x.context||{})
    ].some(v=>String(v||'').toLowerCase().includes(q));
  }),[logs.data,search]);

  return <div>
    <PageHeader title="Auditoria" description="Registro automático de login, liberação, edição, ativação, inativação, exclusão e demais ações institucionais."/>
    <div className="toolbar"><div className="search-field"><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar usuário, e-mail afetado, ação, entidade ou viatura..."/></div></div>

    {rows.length===0?<EmptyState icon={Shield} title="Nenhum evento de auditoria"/>:
      <div className="timeline">{rows.map(x=>{
        const target=x.context?.target_email;
        const before=pretty(x.previous_value);
        const after=pretty(x.new_value);
        return <div className="timeline-item audit-item" key={x.id}>
          <strong>{String(x.action||'AÇÃO').replaceAll('_',' ')}</strong>
          <p>{dateTimeBR(x.date_time)} • executado por <b>{x.user_name||x.user_email||'Sistema'}</b> • {x.role||'sem perfil'}</p>
          {target&&<p>Usuário afetado: <b>{target}</b></p>}
          <p>{x.entity||'—'} {x.record_id?'• '+x.record_id:''}</p>
          {x.justification&&<p><b>Justificativa:</b> {x.justification}</p>}
          {(before||after)&&<details className="audit-details"><summary>Ver alteração</summary>
            {before&&<div><span>Antes</span><pre>{before}</pre></div>}
            {after&&<div><span>Depois</span><pre>{after}</pre></div>}
          </details>}
        </div>
      })}</div>}
  </div>;
}
