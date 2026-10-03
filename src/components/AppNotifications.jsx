import { useEffect, useRef } from 'react';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../auth/AuthContext';
import { canViewVehicleUnit } from '../lib/permissions';

const statusText={
  AGUARDANDO_ORCAMENTO:'Aguardando orçamento',
  AGUARDANDO_APROVACAO:'Orçamento recebido - aguardando aprovação',
  APROVADO:'Orçamento aprovado',
  REPROVADO:'Orçamento reprovado',
  AGUARDANDO_REPARO:'Aguardando reparo',
  EM_REPARO:'Serviço iniciado',
  REPARO_REALIZADO:'Reparo realizado',
  AGUARDANDO_CONFERENCIA:'Aguardando conferência',
  LIBERADA:'Viatura liberada',
};

const nativeNotify=(title,body,route)=>{
  try{
    if(window.FrotasPMAndroid?.notifyUpdate){
      window.FrotasPMAndroid.notifyUpdate(String(title||'SIG Frotas'),String(body||''),String(route||'/'));
      return true;
    }
  }catch(error){
    console.warn('Falha ao chamar notificação Android:',error);
  }
  if('Notification' in window && Notification.permission==='granted'){
    try{
      const n=new Notification(title||'SIG Frotas',{body:body||'',tag:route||undefined});
      n.onclick=()=>{window.focus();if(route)window.location.hash='#'+route;n.close();};
      return true;
    }catch{}
  }
  return false;
};

export default function AppNotifications(){
  const {user}=useAuth();
  const ops=useCollection('operationalLogs',{orderBy:'created_at',direction:'desc',limit:100,enabled:Boolean(user)});
  const orders=useCollection('maintenanceOrders',{orderBy:'updated_at',direction:'desc',limit:100,enabled:Boolean(user)});
  const vehicles=useCollection('vehicles',{orderBy:'updated_at',direction:'desc',limit:500,enabled:Boolean(user)});
  const initialized=useRef(false);
  const opState=useRef(new Map());
  const orderState=useRef(new Map());

  useEffect(()=>{
    if(!user||ops.loading||orders.loading||vehicles.loading)return;

    const vehicleMap=new Map(vehicles.data.map(v=>[String(v.id),v]));
    const receivesVehicle=(row)=>{
      const vehicle=vehicleMap.get(String(row.vehicle_id||''))||null;
      if(['gestor','adm'].includes(user.role)) return true;
      if(vehicle?.responsible_user_id) return String(vehicle.responsible_user_id)===String(user.uid);
      return canViewVehicleUnit(user,row.vehicle_unit||row.unit||vehicle?.unit||'');
    };

    const nextOps=new Map();
    for(const row of ops.data){
      const fingerprint=[row.issue_status,row.mechanical_issue_event,row.updated_at,row.created_at].join('|');
      nextOps.set(row.id,fingerprint);
    }

    const nextOrders=new Map();
    for(const row of orders.data){
      const fingerprint=[row.status,row.budget_id,row.budget_total,row.updated_at].join('|');
      nextOrders.set(row.id,fingerprint);
    }

    if(!initialized.current){
      initialized.current=true;
      opState.current=nextOps;
      orderState.current=nextOrders;
      return;
    }

    for(const row of ops.data){
      if(!receivesVehicle(row))continue;
      const previous=opState.current.get(row.id);
      const current=nextOps.get(row.id);
      if(previous===current)continue;
      if(row.mechanical_issue_event && row.issue_status==='PENDENTE_ANALISE'){
        nativeNotify(
          'Nova avaria - '+(row.vehicle_plate||row.vehicle_prefix||'viatura'),
          (row.issue_description||row.observations||'Novo problema relatado pelo patrulheiro.')+
            (row.war_name?' • '+row.rank+' '+row.war_name:''),
          '/viaturas/'+row.vehicle_id
        );
      }
    }

    for(const row of orders.data){
      if(!receivesVehicle(row))continue;
      const previous=orderState.current.get(row.id);
      const current=nextOrders.get(row.id);
      if(previous===current)continue;
      const label=statusText[row.status];
      if(!label)continue;
      nativeNotify(
        label+' - '+(row.vehicle_plate||row.vehicle_prefix||'viatura'),
        (row.oes_number?'O.S. '+row.oes_number+' • ':'')+(row.workshop_name||'Atualização da manutenção'),
        '/ordens/'+row.id
      );
    }

    opState.current=nextOps;
    orderState.current=nextOrders;
  },[user,ops.data,ops.loading,orders.data,orders.loading,vehicles.data,vehicles.loading]);

  return null;
}
