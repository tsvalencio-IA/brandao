import { FileBarChart, Download } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { money } from '../lib/format';
import { Button, EmptyState, PageHeader, Stat } from '../components/ui';

const esc=(v)=>'"'+String(v??'').replaceAll('"','""')+'"';

export default function UGEReports(){
  const flows=useCollection('financialFlows',{orderBy:'created_at',direction:'desc'});
  const total=flows.data.reduce((s,x)=>s+Number(x.approved_value||0),0);
  const paid=flows.data.filter(x=>x.status==='PAGO').reduce((s,x)=>s+Number(x.approved_value||0),0);
  const exportCSV=()=>{
    const head=['OES','Viatura','Placa','Oficina','Valor Aprovado','Status'];
    const rows=flows.data.map(x=>[x.oes_number,x.vehicle_prefix,x.vehicle_plate,x.workshop_name,x.approved_value,x.status]);
    const csv='\ufeff'+[head,...rows].map(r=>r.map(esc).join(';')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='sigfrota-uge.csv';a.click();URL.revokeObjectURL(a.href);
  };
  return <div><PageHeader title="Relatórios UGE" description="Consolidação financeira dos processos de manutenção." actions={<Button variant="outline" onClick={exportCSV} disabled={!flows.data.length}><Download size={15}/>Exportar CSV</Button>}/>
    <div className="stats-grid"><Stat label="Processos" value={flows.data.length} icon={FileBarChart}/><Stat label="Valor aprovado" value={money(total)}/><Stat label="Pago" value={money(paid)}/><Stat label="Pendente" value={money(total-paid)}/></div>
    <h2 className="section-title">Processos</h2>{flows.data.length===0?<EmptyState icon={FileBarChart} title="Nenhum dado financeiro"/>:<div className="table-wrap responsive-table"><table className="data-table"><thead><tr><th>OES</th><th>Viatura</th><th>Oficina</th><th>Valor</th><th>Status</th></tr></thead><tbody>{flows.data.map(x=><tr key={x.id}><td data-label="OES">{x.oes_number}</td><td data-label="Viatura">{x.vehicle_prefix} • {x.vehicle_plate}</td><td data-label="Oficina">{x.workshop_name}</td><td data-label="Valor">{money(x.approved_value)}</td><td data-label="Status">{x.status?.replaceAll('_',' ')}</td></tr>)}</tbody></table></div>}
  </div>;
}
