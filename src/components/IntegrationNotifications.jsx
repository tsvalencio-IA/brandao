import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, MessageCircle, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../auth/AuthContext';
import { can } from '../lib/permissions';
import { dateTimeBR } from '../lib/format';

const label = (event) => event.event_type === 'CHAT_MESSAGE' ? 'Nova mensagem' : 'Atualização recebida';

export default function IntegrationNotifications(){
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const allowed = can.manageWorkshops(userRole, user) || userRole === 'adm';
  const events = useCollection('saas2SyncEvents',{orderBy:'ts',direction:'desc',limit:50,enabled:allowed});
  const [open,setOpen] = useState(false);
  const [popup,setPopup] = useState(null);
  const initialized = useRef(false);
  const lastId = useRef(null);
  const storageKey = 'sigfrota:last-integration-read:'+(user?.uid||'anon');
  const [lastRead,setLastRead] = useState(()=>Number(localStorage.getItem(storageKey)||0));
  const rows = useMemo(()=>[...events.data].sort((a,b)=>(b.ts||0)-(a.ts||0)),[events.data]);
  const unread = rows.filter(e=>Number(e.ts||0)>lastRead);

  useEffect(()=>{
    if(!allowed || !rows.length) return;
    const latest=rows[0];
    if(!initialized.current){initialized.current=true;lastId.current=latest.id;return;}
    if(latest.id!==lastId.current){
      lastId.current=latest.id;setPopup(latest);
      const t=setTimeout(()=>setPopup(null),9000);return()=>clearTimeout(t);
    }
  },[allowed,rows]);

  if(!allowed) return null;
  const markRead=()=>{const newest=rows[0]?.ts||Date.now();localStorage.setItem(storageKey,String(newest));setLastRead(Number(newest));};
  const openEvent=(event)=>{
    markRead();setOpen(false);
    if(event.integration_id && event.order_id) navigate('/oficinas/'+event.integration_id+'/os/'+event.order_id);
    else if(event.integration_id) navigate('/oficinas/'+event.integration_id);
  };

  return <div className="integration-notifications">
    <button className="integration-bell" onClick={()=>setOpen(v=>!v)} title="Atualizações recebidas"><Bell size={17}/>{unread.length>0&&<span>{unread.length>99?'99+':unread.length}</span>}</button>
    {open&&<div className="integration-dropdown"><div className="integration-dropdown-head"><strong>Atualizações</strong><button onClick={markRead}>Marcar como lidas</button></div><div className="integration-event-list">
      {rows.length===0?<div className="integration-event-empty">Nenhuma atualização recebida.</div>:rows.slice(0,15).map(event=><button key={event.id} className={'integration-event '+(Number(event.ts||0)>lastRead?'unread':'')} onClick={()=>openEvent(event)}>
        <div className="integration-event-icon">{event.event_type==='CHAT_MESSAGE'?<MessageCircle size={15}/>:<RefreshCw size={15}/>}</div>
        <div><strong>{label(event)}</strong><span>{event.message||event.order_number||'O.S.'}</span><small>{dateTimeBR(event.created_at||event.ts)}</small></div>
      </button>)}
    </div></div>}
    {popup&&<div className="integration-live-popup"><div className="integration-live-icon">{popup.event_type==='CHAT_MESSAGE'?<MessageCircle size={18}/>:<RefreshCw size={18}/>}</div><div><strong>{label(popup)}</strong><p>{popup.message||popup.order_number||'Nova atualização recebida.'}</p><button onClick={()=>openEvent(popup)}>Abrir</button></div><button className="integration-live-close" onClick={()=>setPopup(null)}><X size={15}/></button></div>}
  </div>;
}
