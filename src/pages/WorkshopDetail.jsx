import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Car, ClipboardList, Camera, ArrowRight } from 'lucide-react';
import { useEntity } from '../hooks/useEntity';
import { useCollection } from '../hooks/useCollection';
import { Button, Card, EmptyState, PageHeader, Stat } from '../components/ui';
import { dateTimeBR, money } from '../lib/format';

const text=(v)=>v===undefined||v===null||v===''?'—':String(v);
const pick=(...v)=>v.find(x=>x!==undefined&&x!==null&&String(x).trim()!=='');

export default function WorkshopDetail(){
  const {id}=useParams();
  const workshop=useEntity('workshops',id);
  const integrations=useCollection('saas2Integrations',{filters:{integration_id:id}});
  const integration=integrations.data[0]||null;
  const orders=useMemo(()=>[...(integration?.orders||[])].filter(o=>o?.manual_sync===true).sort((a,b)=>String(b.synced_at||'').localeCompare(String(a.synced_at||''))),[integration]);
  const vehicles=useMemo(()=>{const map=new Map();orders.forEach(o=>{const v=o?.vehicle;if(v?.id)map.set(String(v.id),v)});return [...map.values()]},[orders]);
  const official=integration?.official_client||{};
  const office=integration?.saas2_workshop||{};
  const photoCount=orders.reduce((s,o)=>s+(Array.isArray(o.media)?o.media.length:0),0);
  const total=orders.reduce((s,o)=>s+Number(o.totals?.grand_total||0),0);

  if(workshop.loading)return <div className="full-loader inline"><span className="spinner"/></div>;
  if(!workshop.data)return <EmptyState icon={Building2} title="Oficina não encontrada"/>;
  const integrated=workshop.data.source==='SAAS2_CLIENTEOFICIAL'||Boolean(integration);

  return <div>
    <PageHeader title={workshop.data.name||'Oficina'} description={integrated?'Acompanhamento das O.S. enviadas pelo SAAS-2':'Oficina credenciada'} actions={<Link to="/oficinas"><Button variant="outline"><ArrowLeft size={14}/>Voltar</Button></Link>}/>

    <div className="stats-grid">
      <Stat label="Viaturas" value={vehicles.length} icon={Car}/>
      <Stat label="O.S. recebidas" value={orders.length} icon={ClipboardList}/>
      <Stat label="Fotos / vídeos" value={photoCount} icon={Camera}/>
      <Stat label="Valor das O.S." value={money(total)} icon={Building2}/>
    </div>

    <div className="workshop-detail-grid">
      <Card><h3 className="section-title" style={{marginTop:0}}>Oficina</h3><div className="detail-grid">
        <div className="detail-item"><span>Nome</span><strong>{text(pick(workshop.data.name,office.name))}</strong></div>
        <div className="detail-item"><span>CNPJ</span><strong>{text(pick(workshop.data.cnpj,office.cnpj))}</strong></div>
        <div className="detail-item"><span>Cidade</span><strong>{text(pick(workshop.data.city,office.city))}</strong></div>
        <div className="detail-item"><span>Telefone</span><strong>{text(pick(workshop.data.phone,office.phone))}</strong></div>
        <div className="detail-item"><span>E-mail</span><strong>{text(pick(workshop.data.email,office.email))}</strong></div>
        <div className="detail-item"><span>Última atualização</span><strong>{integration?.last_sync_at?dateTimeBR(integration.last_sync_at):'—'}</strong></div>
      </div></Card>
      <Card><h3 className="section-title" style={{marginTop:0}}>Cliente Oficial</h3><div className="detail-grid">
        <div className="detail-item"><span>Órgão / Razão Social</span><strong>{text(pick(official.name,workshop.data.official_client_name))}</strong></div>
        <div className="detail-item"><span>CNPJ</span><strong>{text(pick(official.cnpj,workshop.data.official_client_cnpj))}</strong></div>
        <div className="detail-item"><span>Unidade</span><strong>{text(pick(official.unit,workshop.data.official_client_unit))}</strong></div>
        <div className="detail-item"><span>Fiscal</span><strong>{text(official.fiscal)}</strong></div>
      </div></Card>
    </div>

    <h2 className="section-title">Ordens de serviço enviadas</h2>
    {orders.length===0?<EmptyState icon={ClipboardList} title="Nenhuma O.S. recebida" text="A O.S. aparecerá aqui somente depois do envio manual pelo SAAS-2."/>:<div className="card-list">
      {orders.map(o=><Link key={o.id} to={'/oficinas/'+id+'/os/'+o.id}><Card className="record-card synced-order-card"><div className="record-main"><h3>O.S. {text(o.number)} • {text(o.vehicle?.plate)}</h3><p>{text(o.vehicle?.prefix)} • {text(o.vehicle?.brand)} {text(o.vehicle?.model)} • {text(o.status)}</p><p>Atualizada em {dateTimeBR(o.synced_at)} • {Array.isArray(o.media)?o.media.length:0} arquivo(s)</p></div><div className="record-side"><strong>{money(o.totals?.grand_total||0)}</strong><div className="record-actions"><Button variant="outline">Abrir <ArrowRight size={13}/></Button></div></div></Card></Link>)}
    </div>}
  </div>;
}
