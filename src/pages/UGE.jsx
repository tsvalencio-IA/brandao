import { useState } from 'react';
import { DollarSign, FileText, CheckCircle2 } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { useAuth } from '../auth/AuthContext';
import AttachmentField from '../components/AttachmentField';
import StatusBadge from '../components/StatusBadge';
import { money, todayISO } from '../lib/format';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Textarea } from '../components/ui';

const NEXT={
  VERBA_PENDENTE:['VERBA_SOLICITADA','Solicitar verba'],
  VERBA_SOLICITADA:['VERBA_DISPONIVEL','Registrar verba disponível'],
  VERBA_DISPONIVEL:['AGUARDANDO_NOTA_FISCAL','Liberar para Nota Fiscal'],
  NOTA_FISCAL_ENVIADA:['AGUARDANDO_APROVACAO_FINAL','Enviar para aprovação final'],
  APROVADO_PARA_PAGAMENTO:['PAGO','Registrar pagamento'],
};

export default function UGE(){
  const {user,userRole}=useAuth();
  const flows=useCollection('financialFlows',{orderBy:'created_at',direction:'desc'});
  const [selected,setSelected]=useState(null);
  const [files,setFiles]=useState([]); const [number,setNumber]=useState(''); const [notes,setNotes]=useState('');
  const advance=async(f)=>{
    const n=NEXT[f.status]; if(!n)return;
    if(n[0]==='PAGO'){
      setSelected(f);return;
    }
    await entities.financialFlows.update(f.id,{status:n[0],financial_notes:notes||f.financial_notes||''});
  };
  const pay=async()=>{
    const file=files[0];
    await entities.payments.create({financial_flow_id:selected.id,date_payment:todayISO(),payment_date:todayISO(),value_paid:Number(selected.approved_value||0),receipt:file?.url||'',registered_by:user.email||user.displayName});
    await entities.financialFlows.update(selected.id,{status:'PAGO',payment_file_url:file?.url||'',payment_date:todayISO(),payment_by:user.email||user.displayName,financial_notes:notes});
    setSelected(null);setFiles([]);setNotes('');
  };
  const registerCommitment=async(f)=>{
    const file=files[0];
    await entities.commitments.create({financial_flow_id:f.id,number_commitment:number,commitment_number:number,date_commitment:todayISO(),commitment_date:todayISO(),value:Number(f.approved_value||0),file_pdf:file?.url||'',uploaded_by:user.email||user.displayName});
    await entities.financialFlows.update(f.id,{empenho_file_url:file?.url||'',empenho_date:todayISO(),empenho_by:user.email||user.displayName});
    setSelected(null);setFiles([]);setNumber('');
  };

  return <div><PageHeader title="Fluxo UGE" description="Verba, empenho, nota fiscal e pagamento."/>
    {flows.data.length===0?<EmptyState icon={DollarSign} title="Nenhum processo financeiro"/>:<div className="card-list">{flows.data.map(f=><Card className="record-card" key={f.id}><div className="record-main"><h3>{f.oes_number} • {f.vehicle_prefix}</h3><p>{f.workshop_name} • {money(f.approved_value)}</p></div><div className="record-side"><StatusBadge status={f.status}/><div className="record-actions">{NEXT[f.status]&&<Button onClick={()=>advance(f)}>{NEXT[f.status][1]}</Button>}{f.status==='VERBA_DISPONIVEL'&&!f.empenho_file_url&&<Button variant="outline" onClick={()=>{setSelected({...f,mode:'empenho'});setFiles([]);setNumber('')}}><FileText size={14}/>Empenho</Button>}</div></div></Card>)}</div>}
    <Modal open={!!selected} onClose={()=>setSelected(null)} title={selected?.mode==='empenho'?'Registrar Empenho':'Registrar Pagamento'}><div className="form-stack">
      {selected?.mode==='empenho'&&<Field label="Número do empenho" required><Input value={number} onChange={e=>setNumber(e.target.value)}/></Field>}
      <AttachmentField max={1} accept=".pdf,image/*" value={files} onChange={setFiles}/>
      <Field label="Observações"><Textarea value={notes} onChange={e=>setNotes(e.target.value)}/></Field>
      <div className="form-actions"><Button variant="secondary" onClick={()=>setSelected(null)}>Cancelar</Button>{selected?.mode==='empenho'?<Button onClick={()=>registerCommitment(selected)} disabled={!number.trim()}>Salvar empenho</Button>:<Button variant="success" onClick={pay}><CheckCircle2 size={14}/>Registrar pagamento</Button>}</div>
    </div></Modal>
  </div>;
}
