import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { Button, EmptyState, Field, Input, Modal, PageHeader, Textarea } from '../components/ui';

const initial={codigo:'',name:'',razao_social:'',cnpj:'',address:'',city:'',phone:'',email:'',contact_person:'',specialties:'',ata_number:'',pickup_location:''};

export default function Workshops(){
  const {data}=useCollection('workshops',{orderBy:'name',direction:'asc'});
  const [open,setOpen]=useState(false); const [form,setForm]=useState(initial);
  const save=async(e)=>{e.preventDefault();await entities.workshops.create({...form,specialties:form.specialties.split(',').map(x=>x.trim()).filter(Boolean),active:true});setForm(initial);setOpen(false)};
  return <div><PageHeader title="Oficinas Credenciadas" description="Cadastro e parametrização das oficinas que recebem OES." actions={<Button onClick={()=>setOpen(true)}><Plus size={15}/>Cadastrar Oficina</Button>}/>
    {data.length===0?<EmptyState icon={Building2} title="Nenhuma oficina cadastrada"/>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Código</th><th>Oficina</th><th>CNPJ</th><th>Cidade</th><th>Contato</th><th>Status</th></tr></thead><tbody>{data.map(w=><tr key={w.id}><td><strong>{w.codigo||w.oes_code||'—'}</strong></td><td>{w.name}</td><td>{w.cnpj}</td><td>{w.city||'—'}</td><td>{w.phone} {w.email&&'• '+w.email}</td><td>{w.active!==false?'Ativa':'Inativa'}</td></tr>)}</tbody></table></div>}
    <Modal open={open} onClose={()=>setOpen(false)} title="Cadastrar Oficina" wide><form onSubmit={save} className="form-stack"><div className="form-grid-3">
      <Field label="Código OES" required><Input required value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}/></Field><Field label="Nome Fantasia" required><Input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Razão Social"><Input value={form.razao_social} onChange={e=>setForm({...form,razao_social:e.target.value})}/></Field>
      <Field label="CNPJ" required><Input required value={form.cnpj} onChange={e=>setForm({...form,cnpj:e.target.value})}/></Field><Field label="Telefone" required><Input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="E-mail" required><Input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
      <Field label="Cidade"><Input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></Field><Field label="Responsável"><Input value={form.contact_person} onChange={e=>setForm({...form,contact_person:e.target.value})}/></Field><Field label="Ata de Registro de Preços"><Input value={form.ata_number} onChange={e=>setForm({...form,ata_number:e.target.value})}/></Field>
      </div><Field label="Endereço"><Input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field><Field label="Especialidades (separadas por vírgula)"><Textarea value={form.specialties} onChange={e=>setForm({...form,specialties:e.target.value})}/></Field><Field label="Local de retirada"><Input value={form.pickup_location} onChange={e=>setForm({...form,pickup_location:e.target.value})}/></Field>
      <div className="form-actions"><Button variant="secondary" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit">Salvar Oficina</Button></div></form></Modal>
  </div>;
}
