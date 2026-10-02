import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Clock3, MessageCircle, Send, FileText } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, EmptyState, Input, PageHeader } from '../components/ui';
import { dateTimeBR, money } from '../lib/format';

const text=(v)=>v===undefined||v===null||v===''?'—':String(v);
const pct=(v)=>Number(v||0).toLocaleString('pt-BR',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:4});

function CompositionRow({kind,item}){
  return <tr className={kind==='part'?'composition-part':'composition-service'}>
    <td><strong>{kind==='part'?'PEÇA':'SERVIÇO'}</strong>{item.code&&<><br/><span className="muted">CÓD.: {item.code}</span></>}{item.table_code&&item.table_code!==item.code&&<><br/><span className="muted">CÓD. TABELA: {item.table_code}</span></>}</td>
    <td>{text(item.description)}{kind==='service'&&item.system&&<><br/><span className="muted">{item.system}</span></>}</td>
    <td>{kind==='part'?Number(item.quantity||0).toLocaleString('pt-BR',{maximumFractionDigits:4}):Number(item.hours||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})}</td>
    <td>{money(item.unit_value||0)}</td>
    <td>{pct(item.discount_rate||0)}<br/><span className="muted">{money(item.discount_value||0)}</span></td>
    <td><strong>{money(item.total||0)}</strong></td>
  </tr>;
}

export default function Saas2OrderDetail(){
  const {id,orderId}=useParams();
  const {user}=useAuth();
  const integrations=useCollection('saas2Integrations',{filters:{integration_id:id}});
  const integration=integrations.data[0]||null;
  const order=useMemo(()=>integration?.orders?.find(o=>String(o.id)===String(orderId))||null,[integration,orderId]);
  const events=useCollection('saas2SyncEvents',{filters:{integration_id:id,order_id:orderId}});
  const chat=useCollection('saas2Chat',{filters:{integration_id:id,order_id:orderId}});
  const [message,setMessage]=useState('');
  const [sending,setSending]=useState(false);
  const [mediaOpen,setMediaOpen]=useState(null);

  const official=integration?.official_client||{};
  const office=integration?.saas2_workshop||{};
  const groups=order?.composition?.groups||[];
  const loose=order?.composition?.loose_services||[];
  const media=order?.media||[];
  const messages=useMemo(()=>[...chat.data].sort((a,b)=>(a.ts||0)-(b.ts||0)),[chat.data]);
  const timeline=useMemo(()=>{
    const own=(order?.timeline||[]).map((e,i)=>({id:'os-'+i,at:e.at,by:e.by,action:e.action,type:'os'}));
    const sync=events.data.filter(e=>e.event_type!=='CHAT_MESSAGE').map(e=>({id:'sync-'+e.id,at:e.created_at||e.ts,by:'SAAS-2',action:e.message||'Atualização recebida.',type:'sync'}));
    return [...own,...sync].sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
  },[order,events.data]);

  const send=async(e)=>{
    e.preventDefault();const msg=message.trim();if(!msg||!integration||!order)return;
    setSending(true);
    try{
      const now=new Date().toISOString();
      await entities.saas2Chat.create({integration_id:id,order_id:orderId,order_number:order.number||'',tenant_id:integration.tenant_id||'',client_id:integration.official_client_id||'',workshop_name:office.name||'',official_client_name:official.name||'',sender:'sigfrota',sender_name:user?.nome_guerra||user?.name||user?.displayName||user?.email||'SIGFROTA',sender_uid:user?.uid||'',text:msg,ts:Date.now(),created_at:now,read_sigfrota:true,read_jarvis:false});
      await entities.saas2SyncEvents.create({integration_id:id,order_id:orderId,order_number:order.number||'',event_type:'CHAT_MESSAGE',tenant_id:integration.tenant_id||'',official_client_id:integration.official_client_id||'',official_client_name:official.name||'',workshop_name:office.name||'',message:'Nova mensagem na O.S. '+(order.number||''),created_at:now,ts:Date.now(),sender:'sigfrota'});
      setMessage('');
    }finally{setSending(false)}
  };

  if(integrations.loading)return <div className="full-loader inline"><span className="spinner"/></div>;
  if(!order)return <EmptyState icon={FileText} title="O.S. não encontrada" text="Esta O.S. ainda não foi enviada ou não está mais disponível."/>;
  const v=order.vehicle||{};const t=order.totals||{};

  return <div>
    <PageHeader title={'O.S. '+text(order.number)} description={text(v.prefix)+' • '+text(v.plate)+' • '+text(order.status)} actions={<Link to={'/oficinas/'+id}><Button variant="outline"><ArrowLeft size={14}/>Voltar</Button></Link>}/>

    <Card className="sheet-card">
      <div className="sheet-heading"><strong>{official.header||'PLANILHA DE COMPOSIÇÃO DE CUSTOS'}</strong><h2>PLANILHA DE COMPOSIÇÃO DE CUSTOS</h2><p>REFERÊNCIA: ORDEM E EXECUÇÃO DE SERVIÇOS Nº {text(order.number)}</p><small>O.S. ABERTA: {dateTimeBR(order.opened_at)} • ÚLTIMA ATUALIZAÇÃO: {dateTimeBR(order.synced_at)}</small></div>
      <div className="sheet-section"><h3>DADOS DA VIATURA</h3><div className="detail-grid">
        <div className="detail-item"><span>Marca</span><strong>{text(v.brand)}</strong></div><div className="detail-item"><span>Modelo</span><strong>{text(v.model)}</strong></div><div className="detail-item"><span>Ano</span><strong>{text(v.year)}</strong></div><div className="detail-item"><span>Placa</span><strong>{text(v.plate)}</strong></div><div className="detail-item"><span>Chassi</span><strong>{text(v.chassis)}</strong></div><div className="detail-item"><span>Patrimônio</span><strong>{text(v.patrimonio)}</strong></div><div className="detail-item"><span>KM</span><strong>{text(v.km)}</strong></div><div className="detail-item"><span>Prefixo</span><strong>{text(v.prefix)}</strong></div><div className="detail-item"><span>OPM detentora</span><strong>{text(v.unit||official.unit)}</strong></div>
      </div></div>
      <div className="sheet-section"><h3>DADOS DA EMPRESA</h3><div className="detail-grid">
        <div className="detail-item"><span>Razão Social</span><strong>{text(office.legal_name||office.name)}</strong></div><div className="detail-item"><span>CNPJ</span><strong>{text(office.cnpj)}</strong></div><div className="detail-item"><span>Endereço</span><strong>{text(office.address)}</strong></div><div className="detail-item"><span>Telefone</span><strong>{text(office.phone)}</strong></div><div className="detail-item"><span>E-mail</span><strong>{text(office.email)}</strong></div>
      </div></div>
      <div className="sheet-section"><h3>DADOS DO CLIENTE</h3><div className="detail-grid">
        <div className="detail-item"><span>Unidade</span><strong>{text(official.unit)}</strong></div><div className="detail-item"><span>CNPJ</span><strong>{text(official.cnpj)}</strong></div><div className="detail-item"><span>Endereço</span><strong>{text(official.address)}</strong></div><div className="detail-item"><span>Fiscal do contrato</span><strong>{text(official.fiscal)}</strong></div>
      </div></div>

      <div className="sheet-section"><h3>COMPOSIÇÃO DA O.S. POR PEÇA E SERVIÇO VINCULADO</h3><div className="table-wrap"><table className="data-table composition-table"><thead><tr><th>ITEM / CÓDIGO</th><th>DESCRIÇÃO</th><th>QTD / H</th><th>UNIT. / R$/H</th><th>DESC.</th><th>TOTAL</th></tr></thead><tbody>
        {groups.map((g,gi)=><FragmentGroup key={'g-'+gi} group={g}/>)}
        {loose.map((s,i)=><CompositionRow key={'l-'+i} kind="service" item={s}/>) }
      </tbody><tfoot><tr><td colSpan="5"><strong>TOTAL DA O.S.</strong></td><td><strong>{money(t.grand_total||0)}</strong></td></tr></tfoot></table></div></div>
    </Card>

    <h2 className="section-title"><Camera size={15}/> Fotos e vídeos</h2>
    {media.length===0?<EmptyState icon={Camera} title="Nenhum arquivo enviado nesta atualização"/>:<div className="sync-media-grid">{media.map((m,i)=>String(m.type).toLowerCase().startsWith('video')?<video key={i} src={m.url} controls preload="metadata"/>:<button key={i} className="sync-media-item" onClick={()=>setMediaOpen(m)}><img src={m.url} loading="lazy" alt={'Foto '+(i+1)}/></button>)}</div>}

    <h2 className="section-title"><Clock3 size={15}/> Linha do tempo</h2>
    {timeline.length===0?<EmptyState icon={Clock3} title="Nenhuma atualização registrada"/>:<div className="timeline">{timeline.map(e=><div className="timeline-item" key={e.id}><strong>{e.action}</strong><p>{dateTimeBR(e.at)} • {e.by||'Sistema'}</p></div>)}</div>}

    <h2 className="section-title"><MessageCircle size={15}/> Chat da O.S.</h2>
    <Card className="bridge-chat-card"><div className="bridge-chat-messages">{messages.length===0?<div className="integration-event-empty">Nenhuma mensagem ainda.</div>:messages.map(m=><div key={m.id} className={'bridge-chat-msg '+(m.sender==='sigfrota'?'mine':'theirs')}><div><strong>{m.sender_name||(m.sender==='sigfrota'?'SIGFROTA':'Jarvis')}</strong><span>{dateTimeBR(m.created_at||m.ts)}</span></div><p>{m.text}</p></div>)}</div><form className="bridge-chat-form" onSubmit={send}><Input placeholder="Mensagem para o Jarvis..." value={message} onChange={e=>setMessage(e.target.value)}/><Button type="submit" disabled={sending||!message.trim()}><Send size={14}/>{sending?'Enviando...':'Enviar'}</Button></form></Card>

    {mediaOpen&&<div className="media-lightbox" onClick={()=>setMediaOpen(null)}><button onClick={()=>setMediaOpen(null)}>×</button><img src={mediaOpen.url} alt="Visualização"/></div>}
  </div>;
}

function FragmentGroup({group}){
  return <>{group.part&&<CompositionRow kind="part" item={group.part}/>} {(group.services||[]).map((s,i)=><CompositionRow key={i} kind="service" item={s}/>)}</>;
}
