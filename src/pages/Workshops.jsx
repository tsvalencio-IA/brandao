import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { useAuth } from '../auth/AuthContext';
import { can } from '../lib/permissions';
import { logAudit } from '../services/audit';
import { Button, EmptyState, Field, Input, Modal, PageHeader, Textarea } from '../components/ui';

const initial={codigo:'',name:'',razao_social:'',cnpj:'',address:'',city:'',phone:'',email:'',contact_person:'',specialties:'',ata_number:'',pickup_location:''};

export default function Workshops(){
  const {user,userRole}=useAuth();
  const {data}=useCollection('workshops',{orderBy:'name',direction:'asc'});
  const [open,setOpen]=useState(false);const [editing,setEditing]=useState(null);const [form,setForm]=useState(initial);
  const allowed=can.manageWorkshops(userRole,user);

  const startCreate=()=>{setEditing(null);setForm(initial);setOpen(true)};
  const startEdit=(w)=>{setEditing(w);setForm({codigo:w.codigo||w.oes_code||'',name:w.name||'',razao_social:w.razao_social||'',cnpj:w.cnpj||'',address:w.address||'',city:w.city||'',phone:w.phone||'',email:w.email||'',contact_person:w.contact_person||'',specialties:Array.isArray(w.specialties)?w.specialties.join(', '):(w.specialties||''),ata_number:w.ata_number||'',pickup_location:w.pickup_location||''});setOpen(true)};
  const save=async(e)=>{
    e.preventDefault();
    const payload={...form,specialties:String(form.specialties||'').split(',').map(x=>x.trim()).filter(Boolean),active:true};
    if(editing){
      const after={...payload,manual_override:true};await entities.workshops.update(editing.id,after);
      await logAudit({user,role:userRole,action:'OFICINA_EDITADA',entity:'Workshop',recordId:editing.id,before:editing,after});
    }else{
      const created=await entities.workshops.create({...payload,source:'MANUAL'});
      await logAudit({user,role:userRole,action:'OFICINA_CADASTRADA',entity:'Workshop',recordId:created.id,after:payload});
    }
    setOpen(false);setEditing(null);setForm(initial);
  };

  const remove=async(w)=>{
    if(!allowed)return;
    if(!window.confirm('Excluir esta oficina do SIGFROTA?'))return;
    if(w.source==='SAAS2_CLIENTEOFICIAL'||w.integration_id){
      const [integrations,events,chats]=await Promise.all([
        entities.saas2Integrations.list({filters:{integration_id:w.id}}),
        entities.saas2SyncEvents.list({filters:{integration_id:w.id}}),
        entities.saas2Chat.list({filters:{integration_id:w.id}}),
      ]);
      await Promise.all([...integrations.map(x=>entities.saas2Integrations.remove(x.id)),...events.map(x=>entities.saas2SyncEvents.remove(x.id)),...chats.map(x=>entities.saas2Chat.remove(x.id))]);
    }
    await entities.workshops.remove(w.id);
    await logAudit({user,role:userRole,action:'OFICINA_EXCLUIDA',entity:'Workshop',recordId:w.id,before:w});
  };

  return <div><PageHeader title="Oficinas Credenciadas" description="Cadastro das oficinas e O.S. recebidas das integrações autorizadas." actions={allowed&&<Button onClick={startCreate}><Plus size={15}/>Cadastrar Oficina</Button>}/>
    {data.length===0?<EmptyState icon={Building2} title="Nenhuma oficina cadastrada"/>:<div className="table-wrap responsive-table"><table className="data-table"><thead><tr><th>Código</th><th>Oficina</th><th>CNPJ</th><th>Cidade</th><th>Contato</th><th>Status</th><th></th></tr></thead><tbody>{data.map(w=><tr key={w.id}><td data-label="Código"><strong>{w.codigo||w.oes_code||'—'}</strong></td><td data-label="Oficina"><strong>{w.name}</strong>{w.source==='SAAS2_CLIENTEOFICIAL'&&<div><span className="badge success">INTEGRADA</span></div>}</td><td data-label="CNPJ">{w.cnpj||'—'}</td><td data-label="Cidade">{w.city||'—'}</td><td data-label="Contato">{w.phone||'—'} {w.email&&'• '+w.email}</td><td data-label="Status">{w.active!==false?'Ativa':'Inativa'}</td><td data-label="Ações"><div className="record-actions"><Link to={'/oficinas/'+w.id}><Button variant="outline">Abrir <ArrowRight size={13}/></Button></Link>{allowed&&<><Button variant="outline" onClick={()=>startEdit(w)}><Pencil size={13}/>Editar</Button><Button variant="danger" onClick={()=>remove(w)}><Trash2 size={13}/>Excluir</Button></>}</div></td></tr>)}</tbody></table></div>}
    <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Editar Oficina':'Cadastrar Oficina'} wide><form onSubmit={save} className="form-stack"><div className="form-grid-3">
      <Field label="Código OES" required><Input required value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}/></Field><Field label="Nome Fantasia" required><Input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Razão Social"><Input value={form.razao_social} onChange={e=>setForm({...form,razao_social:e.target.value})}/></Field>
      <Field label="CNPJ" required><Input required value={form.cnpj} onChange={e=>setForm({...form,cnpj:e.target.value})}/></Field><Field label="Telefone" required><Input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="E-mail" required><Input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
      <Field label="Cidade"><Input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></Field><Field label="Responsável"><Input value={form.contact_person} onChange={e=>setForm({...form,contact_person:e.target.value})}/></Field><Field label="Ata de Registro de Preços"><Input value={form.ata_number} onChange={e=>setForm({...form,ata_number:e.target.value})}/></Field>
      </div><Field label="Endereço"><Input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field><Field label="Especialidades (separadas por vírgula)"><Textarea value={form.specialties} onChange={e=>setForm({...form,specialties:e.target.value})}/></Field><Field label="Local de retirada"><Input value={form.pickup_location} onChange={e=>setForm({...form,pickup_location:e.target.value})}/></Field>
      <div className="form-actions"><Button variant="secondary" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit">{editing?'Salvar Alterações':'Salvar Oficina'}</Button></div></form></Modal>
  </div>;
}
