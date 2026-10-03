import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Download, FileSpreadsheet, FileText, Upload } from 'lucide-react';
import { useEntity } from '../hooks/useEntity';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../auth/AuthContext';
import { entities } from '../data/repository';
import { can } from '../lib/permissions';
import { logAudit } from '../services/audit';
import { uploadToCloudinary } from '../services/cloudinary';
import { buildWorkshopRequestPdf, downloadPdfBlob } from '../services/requestPdf';
import { parseBudgetFile } from '../services/budgetImport';
import StatusBadge from '../components/StatusBadge';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Textarea } from '../components/ui';
import { dateBR, money, normalizePlate } from '../lib/format';

export default function OrderDetail(){
  const {id}=useParams();
  const {user,userRole}=useAuth();
  const order=useEntity('maintenanceOrders',id);
  const vehicle=useEntity('vehicles',order.data?.vehicle_id);
  const down=useEntity('vehicleDowns',order.data?.vehicle_down_id);
  const diagnosis=useEntity('diagnoses',order.data?.diagnosis_id);
  const checklist=useEntity('checklists',order.data?.checklist_id);
  const budgets=useCollection('budgets',{filters:{maintenance_order_id:id},orderBy:'created_at',direction:'desc'});
  const audit=useCollection('auditLogs',{filters:{record_id:id},orderBy:'date_time',direction:'desc'});

  const [pdfBusy,setPdfBusy]=useState(false);
  const [importOpen,setImportOpen]=useState(false);
  const [sourceFile,setSourceFile]=useState(null);
  const [parsed,setParsed]=useState(null);
  const [parseBusy,setParseBusy]=useState(false);
  const [importBusy,setImportBusy]=useState(false);
  const [manual,setManual]=useState({parts_value:'',labor_value:'',deadline:'',observations:''});
  const [importError,setImportError]=useState('');

  if(order.loading) return <div className="full-loader inline"><span className="spinner"/></div>;
  if(!order.data) return <EmptyState icon={ClipboardList} title="Ordem não encontrada"/>;

  const o=order.data;
  const budget=budgets.data[0];
  const canImport=can.approveBudget(userRole,user)||can.createOES(userRole,user);

  const generateRequest=async()=>{
    if(!vehicle.data)return;
    setPdfBusy(true);
    try{
      const result=await buildWorkshopRequestPdf({
        vehicle:vehicle.data,
        down:down.data,
        diagnosis:diagnosis.data,
        checklist:checklist.data,
        order:o,
        user
      });
      let uploaded=null;
      try{
        const file=new File([result.blob],result.filename,{type:'application/pdf'});
        uploaded=await uploadToCloudinary(file,'sigfrota/solicitacoes-oficina');
        await entities.maintenanceOrders.update(id,{
          request_pdf_url:uploaded.url,
          request_pdf_name:result.filename,
          request_pdf_generated_at:new Date().toISOString(),
          request_pdf_generated_by:user?.email||user?.displayName||user?.name||''
        });
        await logAudit({
          user,role:userRole,action:'PDF_SOLICITACAO_OFICINA_GERADO',entity:'MaintenanceOrder',recordId:id,
          context:{vehicle_id:o.vehicle_id,arquivo:result.filename,url:uploaded.url}
        });
      }catch(error){
        console.warn('PDF gerado, mas não foi possível registrar o arquivo na nuvem:',error);
      }
      downloadPdfBlob(result.blob,result.filename);
    }finally{setPdfBusy(false)}
  };

  const chooseBudget=async(event)=>{
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    setSourceFile(file);
    setParsed(null);
    setImportError('');
    setParseBusy(true);
    try{
      const result=await parseBudgetFile(file);
      if(result.vehicle_plate&&o.vehicle_plate&&normalizePlate(result.vehicle_plate)!==normalizePlate(o.vehicle_plate)){
        throw new Error('A planilha é da placa '+result.vehicle_plate+', mas esta O.S. pertence à placa '+o.vehicle_plate+'. Nenhum dado foi importado.');
      }
      if(result.vehicle_prefix&&o.vehicle_prefix&&String(result.vehicle_prefix).trim()!==String(o.vehicle_prefix).trim()){
        throw new Error('O prefixo identificado no arquivo ('+result.vehicle_prefix+') não corresponde a esta viatura ('+o.vehicle_prefix+').');
      }
      setParsed(result);
      setManual(m=>({...m,
        parts_value:result.parts_value||'',
        labor_value:result.labor_value||''
      }));
    }catch(error){
      setImportError(error?.message||'Não foi possível ler o orçamento.');
      setSourceFile(null);
    }finally{setParseBusy(false)}
  };

  const confirmImport=async(e)=>{
    e.preventDefault();
    if(!sourceFile||!parsed)return;
    const partsValue=parsed.structured?Number(parsed.parts_value||0):Number(manual.parts_value||0);
    const laborValue=parsed.structured?Number(parsed.labor_value||0):Number(manual.labor_value||0);
    const total=Number((partsValue+laborValue).toFixed(2));
    if(total<=0){setImportError('Informe os valores do orçamento antes de confirmar.');return;}

    setImportBusy(true);
    setImportError('');
    try{
      const uploaded=await uploadToCloudinary(sourceFile,'sigfrota/orcamentos-oficina');
      const b=await entities.budgets.create({
        maintenance_order_id:id,
        workshop_id:o.workshop_id,
        workshop_name:o.workshop_name||'',
        parts_value:partsValue,
        labor_value:laborValue,
        total_value:total,
        deadline:manual.deadline,
        observations:manual.observations,
        file_url:uploaded.url,
        source_file_url:uploaded.url,
        source_file_name:sourceFile.name,
        source_type:parsed.source_type,
        structured_import:Boolean(parsed.structured),
        imported_parts:parsed.parts||[],
        imported_services:parsed.services||[],
        import_summary:parsed.message||'',
        status:'PENDENTE',
        imported_by_uid:user?.uid||null,
        imported_by:user?.email||user?.displayName||user?.name||''
      });

      await entities.maintenanceOrders.update(id,{
        status:'AGUARDANDO_APROVACAO',
        budget_id:b.id,
        budget_parts_value:partsValue,
        budget_labor_value:laborValue,
        budget_total:total,
        budget_deadline:manual.deadline,
        budget_observations:manual.observations,
        budget_file_url:uploaded.url,
        budget_import_type:parsed.source_type,
        imported_parts_count:parsed.parts?.length||0,
        imported_services_count:parsed.services?.length||0
      });
      await entities.vehicles.update(o.vehicle_id,{status:'AGUARDANDO_APROVACAO'});
      await logAudit({
        user,role:userRole,action:'ORCAMENTO_IMPORTADO',entity:'MaintenanceOrder',recordId:id,
        after:{parts_value:partsValue,labor_value:laborValue,total_value:total,parts:parsed.parts?.length||0,services:parsed.services?.length||0},
        context:{vehicle_id:o.vehicle_id,arquivo:sourceFile.name,tipo:parsed.source_type}
      });

      setImportOpen(false);
      setSourceFile(null);
      setParsed(null);
      setManual({parts_value:'',labor_value:'',deadline:'',observations:''});
    }catch(error){
      setImportError(error?.message||'Não foi possível importar o orçamento.');
    }finally{setImportBusy(false)}
  };

  return <div>
    <PageHeader
      title={o.oes_number||'Ordem de Manutenção'}
      description={o.vehicle_prefix+' • '+o.vehicle_plate+' • '+(o.workshop_name||'Sem oficina')}
      actions={<>
        <Link to="/ordens"><Button variant="secondary"><ArrowLeft size={15}/>Voltar</Button></Link>
        <Button variant="outline" onClick={generateRequest} disabled={pdfBusy||!vehicle.data}><Download size={15}/>{pdfBusy?'Gerando PDF...':'PDF para oficina'}</Button>
        {canImport&&<Button onClick={()=>setImportOpen(true)}><Upload size={15}/>Importar orçamento</Button>}
      </>}
    />

    <div className="stats-grid">
      <div className="stat-card"><div className="stat-top">Status</div><div style={{marginTop:16}}><StatusBadge status={o.status}/></div></div>
      <div className="stat-card"><div className="stat-top">Prioridade</div><strong>{o.priority||'—'}</strong></div>
      <div className="stat-card"><div className="stat-top">Orçamento</div><strong style={{fontSize:18}}>{money(o.budget_total||budget?.total_value||0)}</strong></div>
      <div className="stat-card"><div className="stat-top">Criada em</div><strong style={{fontSize:16}}>{dateBR(o.created_at)}</strong></div>
    </div>

    <h2 className="section-title">Solicitação</h2>
    <Card>
      <div className="kv"><span>Serviços solicitados</span><strong>{o.services_requested||o.defect_description||'—'}</strong></div>
      <div className="kv"><span>Oficina</span><strong>{o.workshop_name||'—'}</strong></div>
      <div className="kv"><span>Observações</span><strong>{o.observations||'—'}</strong></div>
      {o.request_pdf_url&&<a className="btn btn-outline" style={{marginTop:12}} href={o.request_pdf_url} target="_blank" rel="noreferrer"><FileText size={15}/>Abrir PDF enviado à oficina</a>}
    </Card>

    {budget&&<>
      <h2 className="section-title">Orçamento</h2>
      <Card>
        <div className="detail-grid">
          <div className="detail-item"><span>Peças</span><strong>{money(budget.parts_value)}</strong></div>
          <div className="detail-item"><span>Mão de obra</span><strong>{money(budget.labor_value)}</strong></div>
          <div className="detail-item"><span>Total</span><strong>{money(budget.total_value)}</strong></div>
          <div className="detail-item"><span>Prazo</span><strong>{budget.deadline||'—'}</strong></div>
          <div className="detail-item"><span>Status</span><strong>{budget.status||'—'}</strong></div>
          <div className="detail-item"><span>Itens importados</span><strong>{budget.imported_parts?.length||0} peça(s) • {budget.imported_services?.length||0} serviço(s)</strong></div>
        </div>
        {budget.file_url&&<a className="btn btn-outline" style={{marginTop:12}} href={budget.file_url} target="_blank" rel="noreferrer"><FileText size={15}/>Abrir orçamento original</a>}
      </Card>
      {!!budget.imported_parts?.length&&<><h3 className="section-title">Peças importadas</h3><div className="table-wrap responsive-table"><table className="data-table"><thead><tr><th>Código</th><th>Peça</th><th>Qtd</th><th>Valor</th></tr></thead><tbody>{budget.imported_parts.map((p,i)=><tr key={(p.code||'p')+i}><td data-label="Código">{p.code||'—'}</td><td data-label="Peça">{p.description||'—'}</td><td data-label="Qtd">{p.quantity||0}</td><td data-label="Valor">{money(p.net_value||0)}</td></tr>)}</tbody></table></div></>}
      {!!budget.imported_services?.length&&<><h3 className="section-title">Serviços importados</h3><div className="table-wrap responsive-table"><table className="data-table"><thead><tr><th>Código</th><th>Serviço</th><th>TMO</th><th>Valor</th></tr></thead><tbody>{budget.imported_services.map((s,i)=><tr key={(s.code||'s')+i}><td data-label="Código">{s.code||'—'}</td><td data-label="Serviço">{s.description||'—'}</td><td data-label="TMO">{s.hours||0}</td><td data-label="Valor">{money(s.net_value||0)}</td></tr>)}</tbody></table></div></>}
    </>}

    <h2 className="section-title">Auditoria desta ordem</h2>
    {audit.data.length===0?<EmptyState title="Nenhum evento registrado"/>:<div className="timeline">{audit.data.map(a=><div className="timeline-item" key={a.id}><strong>{a.action}</strong><p>{a.user_name||a.user_email||'Sistema'} • {dateBR(a.date_time)}</p></div>)}</div>}

    <Modal open={importOpen} onClose={()=>!importBusy&&setImportOpen(false)} title="Importar orçamento da oficina" wide>
      <form onSubmit={confirmImport} className="form-stack">
        <div className="config-note">XLSX/XLS: peças e serviços são lidos e conferidos antes da gravação. PDF: o arquivo oficial é anexado e os valores são confirmados manualmente.</div>
        <label className="btn btn-secondary"><FileSpreadsheet size={15}/>{parseBusy?'Lendo arquivo...':sourceFile?sourceFile.name:'Selecionar XLSX, XLS ou PDF'}<input hidden type="file" accept=".xlsx,.xls,.pdf" onChange={chooseBudget} disabled={parseBusy||importBusy}/></label>

        {parsed&&<Card>
          <div className="kv"><span>Leitura</span><strong>{parsed.message}</strong></div>
          {parsed.vehicle_plate&&<div className="kv"><span>Placa identificada</span><strong>{parsed.vehicle_plate}</strong></div>}
          {parsed.vehicle_prefix&&<div className="kv"><span>Prefixo identificado</span><strong>{parsed.vehicle_prefix}</strong></div>}
          <div className="kv"><span>Itens</span><strong>{parsed.parts?.length||0} peça(s) • {parsed.services?.length||0} serviço(s)</strong></div>
        </Card>}

        {parsed&&!parsed.structured&&<div className="form-grid">
          <Field label="Total de peças" required><Input type="number" min="0" step="0.01" required value={manual.parts_value} onChange={e=>setManual({...manual,parts_value:e.target.value})}/></Field>
          <Field label="Total de mão de obra" required><Input type="number" min="0" step="0.01" required value={manual.labor_value} onChange={e=>setManual({...manual,labor_value:e.target.value})}/></Field>
        </div>}
        {parsed?.structured&&<div className="stats-grid">
          <div className="stat-card"><div className="stat-top">Peças</div><strong>{money(parsed.parts_value)}</strong></div>
          <div className="stat-card"><div className="stat-top">Mão de obra</div><strong>{money(parsed.labor_value)}</strong></div>
          <div className="stat-card"><div className="stat-top">Total importado</div><strong>{money(parsed.total_value)}</strong></div>
        </div>}

        <Field label="Prazo informado pela oficina"><Input value={manual.deadline} onChange={e=>setManual({...manual,deadline:e.target.value})} placeholder="Ex.: 10 dias úteis"/></Field>
        <Field label="Observações da importação"><Textarea value={manual.observations} onChange={e=>setManual({...manual,observations:e.target.value})}/></Field>
        {importError&&<div className="form-error">{importError}</div>}
        <div className="form-actions"><Button type="button" variant="secondary" onClick={()=>setImportOpen(false)} disabled={importBusy}>Cancelar</Button><Button type="submit" disabled={!parsed||importBusy}>{importBusy?'Importando...':'Confirmar e enviar para aprovação'}</Button></div>
      </form>
    </Modal>
  </div>;
}
