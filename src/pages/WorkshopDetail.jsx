import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Car, ClipboardList, MessageCircle, PackageSearch, Send } from 'lucide-react';
import { useEntity } from '../hooks/useEntity';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, EmptyState, Input, PageHeader, Stat } from '../components/ui';
import { dateTimeBR, money } from '../lib/format';

const text = (v) => v === undefined || v === null || v === '' ? '—' : String(v);
const pick = (...values) => values.find(v => v !== undefined && v !== null && String(v).trim() !== '');

export default function WorkshopDetail(){
  const { id } = useParams();
  const { user } = useAuth();
  const workshop = useEntity('workshops', id);
  const integrations = useCollection('saas2Integrations',{filters:{integration_id:id}});
  const integration = integrations.data[0] || null;
  const chat = useCollection('saas2Chat',{filters:{integration_id:id}});
  const [message,setMessage] = useState('');
  const [sending,setSending] = useState(false);

  const messages = useMemo(()=>[...chat.data].sort((a,b)=>(a.ts||0)-(b.ts||0)),[chat.data]);
  const vehicles = integration?.vehicles || [];
  const orders = integration?.orders || [];
  const cilia = integration?.cilia_parts || [];
  const official = integration?.official_client || {};
  const office = integration?.saas2_workshop || {};

  const send = async (e) => {
    e?.preventDefault();
    const msg=message.trim();
    if(!msg || !integration) return;
    setSending(true);
    try{
      await entities.saas2Chat.create({
        integration_id:id,
        tenant_id:integration.tenant_id || '',
        client_id:integration.official_client_id || official.id || '',
        workshop_name:workshop.data?.name || office.name || '',
        official_client_name:official.name || official.nome || '',
        sender:'sigfrota',
        sender_name:user?.nome_guerra || user?.name || user?.displayName || user?.email || 'SIGFROTA',
        sender_uid:user?.uid || '',
        text:msg,
        ts:Date.now(),
        created_at:new Date().toISOString(),
        read_sigfrota:true,
        read_jarvis:false,
      });
      setMessage('');
    }finally{setSending(false)}
  };

  if(workshop.loading) return <div className="full-loader inline"><span className="spinner"/></div>;
  if(!workshop.data) return <EmptyState icon={Building2} title="Oficina não encontrada"/>;

  const isSaas2 = workshop.data.source === 'SAAS2_CLIENTEOFICIAL' || Boolean(integration);

  return <div>
    <PageHeader title={workshop.data.name || 'Oficina'} description={isSaas2?'Integração Cliente Oficial • SAAS-2':'Oficina credenciada'} actions={<Link to="/oficinas"><Button variant="outline"><ArrowLeft size={14}/>Voltar</Button></Link>}/>

    <div className="stats-grid workshop-detail-stats">
      <Stat label="Viaturas sincronizadas" value={vehicles.length} icon={Car}/>
      <Stat label="OS sincronizadas" value={orders.length} icon={ClipboardList}/>
      <Stat label="Peças Cília" value={cilia.length} icon={PackageSearch}/>
      <Stat label="Última sincronização" value={integration?.last_sync_at?dateTimeBR(integration.last_sync_at):'—'} icon={Building2}/>
    </div>

    <div className="workshop-detail-grid">
      <Card>
        <h3 className="section-title" style={{marginTop:0}}>Oficina SAAS-2</h3>
        <div className="detail-grid">
          <div className="detail-item"><span>Nome</span><strong>{text(pick(office.name,workshop.data.name))}</strong></div>
          <div className="detail-item"><span>CNPJ</span><strong>{text(pick(office.cnpj,workshop.data.cnpj))}</strong></div>
          <div className="detail-item"><span>Cidade</span><strong>{text(pick(office.city,workshop.data.city))}</strong></div>
          <div className="detail-item"><span>Telefone</span><strong>{text(pick(office.phone,workshop.data.phone))}</strong></div>
          <div className="detail-item"><span>E-mail</span><strong>{text(pick(office.email,workshop.data.email))}</strong></div>
          <div className="detail-item"><span>Tenant SAAS-2</span><strong>{text(integration?.tenant_id)}</strong></div>
        </div>
      </Card>
      <Card>
        <h3 className="section-title" style={{marginTop:0}}>Cliente Oficial vinculado</h3>
        <div className="detail-grid">
          <div className="detail-item"><span>Órgão / Razão Social</span><strong>{text(pick(official.name,official.nome,workshop.data.official_client_name))}</strong></div>
          <div className="detail-item"><span>CNPJ</span><strong>{text(pick(official.cnpj,official.doc,workshop.data.official_client_cnpj))}</strong></div>
          <div className="detail-item"><span>Unidade</span><strong>{text(pick(official.gov_unit,official.govUnidade,workshop.data.official_client_unit))}</strong></div>
          <div className="detail-item"><span>Fiscal</span><strong>{text(pick(official.gov_fiscal,official.govFiscal))}</strong></div>
          <div className="detail-item"><span>Desc. peças</span><strong>{official.parts_discount!=null?(Number(official.parts_discount)*100).toFixed(2)+'%':'—'}</strong></div>
          <div className="detail-item"><span>Desc. mão de obra</span><strong>{official.labor_discount!=null?(Number(official.labor_discount)*100).toFixed(2)+'%':'—'}</strong></div>
        </div>
      </Card>
    </div>

    <h3 className="section-title">Peças importadas do Cília</h3>
    {cilia.length===0?<EmptyState icon={PackageSearch} title="Nenhuma peça Cília sincronizada" text="As peças só aparecem aqui depois que o Gestor do SAAS-2 clicar em Sincronizar SIGFROTA."/>:
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Código</th><th>Peça</th><th>Categoria / Cília ID</th><th>OS / Placa</th><th>Qtd.</th><th>Valor</th></tr></thead><tbody>
        {cilia.map((p,i)=><tr key={(p.os_id||'')+'-'+(p.cilia_piece_id||p.code||i)}>
          <td><strong>{text(p.code)}</strong></td><td>{text(p.description)}</td>
          <td>{text(p.category)}<br/><span className="muted">{text(p.cilia_piece_id)}</span></td>
          <td>{text(p.os_number||p.os_id)}<br/><span className="muted">{text(p.plate)}</span></td>
          <td>{text(p.quantity||1)}</td><td>{money(p.unit_value||p.value||0)}</td>
        </tr>)}
      </tbody></table></div>}

    <h3 className="section-title">Ordens de serviço sincronizadas</h3>
    {orders.length===0?<EmptyState icon={ClipboardList} title="Nenhuma OS sincronizada"/>:<div className="card-list">
      {orders.map(o=><Card className="record-card" key={o.id}><div className="record-main"><h3>{text(o.number||o.id)} • {text(o.plate)}</h3><p>{text(o.vehicle_model)} • {text(o.status)}</p><p>{(o.services||[]).map(s=>s.description).filter(Boolean).slice(0,4).join(' • ')||'Sem serviços informados'}</p></div><div className="record-side"><div className="badge neutral">{(o.parts||[]).length} peça(s)</div></div></Card>)}
    </div>}

    {isSaas2 && <>
      <h3 className="section-title">Chat direto SIGFROTA × Jarvis SAAS-2</h3>
      <Card className="bridge-chat-card">
        <div className="bridge-chat-messages">
          {messages.length===0?<div className="integration-event-empty">Nenhuma mensagem ainda.</div>:messages.map(m=><div key={m.id} className={'bridge-chat-msg '+(m.sender==='sigfrota'?'mine':'theirs')}>
            <div><strong>{m.sender_name || (m.sender==='sigfrota'?'SIGFROTA':'Jarvis')}</strong><span>{dateTimeBR(m.created_at||m.ts)}</span></div><p>{m.text}</p>
          </div>)}
        </div>
        <form className="bridge-chat-form" onSubmit={send}><Input placeholder="Mensagem para o Jarvis SAAS-2..." value={message} onChange={e=>setMessage(e.target.value)}/><Button type="submit" disabled={sending||!message.trim()}><Send size={14}/>{sending?'Enviando...':'Enviar'}</Button></form>
      </Card>
    </>}
  </div>;
}
