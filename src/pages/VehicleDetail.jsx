import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, QrCode, Wrench } from 'lucide-react';
import QRCode from 'qrcode';
import { useEntity } from '../hooks/useEntity';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../auth/AuthContext';
import { APP } from '../config/app';
import { Button, Card, EmptyState, PageHeader } from '../components/ui';
import StatusBadge from '../components/StatusBadge';
import { dateBR, money } from '../lib/format';

export default function VehicleDetail(){
  const {id}=useParams();
  const {user,userRole}=useAuth();
  const vehicle=useEntity('vehicles',id);
  const orderFilters={vehicle_id:id,...(userRole==='adm_opm'&&user?.unit?{unit:user.unit}:{})};
  const opFilters={vehicle_id:id,...(userRole==='adm_opm'&&user?.unit?{vehicle_unit:user.unit}:{})};
  const orders=useCollection('maintenanceOrders',{filters:orderFilters});
  const ops=useCollection('operationalLogs',{filters:opFilters});
  const total=useMemo(()=>orders.data.reduce((s,o)=>s+Number(o.budget_total||0),0),[orders.data]);

  const showQR=async()=>{
    if(!vehicle.data?.qr_token) return;
    const base=APP.publicUrl || window.location.href.split('#')[0];
    const url=base+'#/patrulha/'+vehicle.data.qr_token;
    const data=await QRCode.toDataURL(url,{width:360,margin:2});
    const w=window.open('','_blank');
    w.document.write('<title>QR '+vehicle.data.prefix+'</title><div style="font-family:Arial;text-align:center;padding:30px"><h2>'+vehicle.data.prefix+'</h2><p>'+vehicle.data.plate+'</p><img src="'+data+'"><p style="font-size:12px">'+url+'</p></div>');
  };

  if(vehicle.loading) return <div className="full-loader inline"><span className="spinner"/></div>;
  if(!vehicle.data) return <EmptyState icon={Wrench} title="Viatura não encontrada"/>;
  const v=vehicle.data;
  return <div>
    <PageHeader title={v.prefix} description={(v.brand||'')+' '+(v.model||'')+' • '+(v.plate||'')} actions={<>
      <Link to="/viaturas"><Button variant="secondary"><ArrowLeft size={15}/>Voltar</Button></Link>
      <Button variant="outline" onClick={showQR}><QrCode size={15}/>QR Code</Button>
      {v.status==='OPERANDO'&&<Link to={'/registrar-baixa?vehicle='+v.id}><Button variant="danger"><AlertTriangle size={15}/>Dar Baixa</Button></Link>}
    </>}/>
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-top">Status</div><div style={{marginTop:16}}><StatusBadge status={v.status}/></div></div>
      <div className="stat-card"><div className="stat-top">KM atual</div><strong>{Number(v.km_horimeter||0).toLocaleString('pt-BR')}</strong></div>
      <div className="stat-card"><div className="stat-top">Ordens</div><strong>{orders.data.length}</strong></div>
      <div className="stat-card"><div className="stat-top">Custo acumulado</div><strong style={{fontSize:18}}>{money(total)}</strong></div>
    </div>
    <h2 className="section-title">Ficha técnica</h2><Card><div className="detail-grid">
      {[['Prefixo',v.prefix],['Placa',v.plate],['Marca',v.brand],['Modelo',v.model],['Ano',v.year],['OPM',v.unit],['Código OPM',v.codigo_opm],['Modalidade',v.modalidade],['Chassi',v.chassis],['RENAVAM',v.renavam],['Patrimônio',v.patrimonio],['Próxima revisão',dateBR(v.next_service_date)]].map(([a,b])=><div className="detail-item" key={a}><span>{a}</span><strong>{b||'—'}</strong></div>)}
    </div></Card>
    <h2 className="section-title">Ordens de manutenção</h2>
    {orders.data.length===0?<EmptyState icon={Wrench} title="Nenhuma ordem registrada"/>:<div className="card-list">{orders.data.map(o=><Link key={o.id} to={'/ordens/'+o.id}><Card className="record-card"><div className="record-main"><h3>{o.oes_number||'Ordem sem OES'}</h3><p>{o.defect_description}</p><p>{dateBR(o.defect_date)} • {o.workshop_name||'Sem oficina'}</p></div><div className="record-side"><StatusBadge status={o.status}/>{o.budget_total>0&&<p className="small">{money(o.budget_total)}</p>}</div></Card></Link>)}</div>}
    <h2 className="section-title">Controle operacional</h2>
    {ops.data.length===0?<EmptyState icon={QrCode} title="Nenhum lançamento via QR Code"/>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Data</th><th>Patrulheiro</th><th>KM inicial</th><th>KM final</th></tr></thead><tbody>{ops.data.map(x=><tr key={x.id}><td>{dateBR(x.date)}</td><td>{x.rank} {x.war_name} • RE {x.re}</td><td>{x.km_initial}</td><td>{x.km_final||'—'}</td></tr>)}</tbody></table></div>}
  </div>;
}
