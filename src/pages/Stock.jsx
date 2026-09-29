import { useState } from 'react';
import { Package, Plus, ArrowDown, ArrowUp } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { todayISO } from '../lib/format';
import { Button, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from '../components/ui';

const blank={name:'',category:'outros',brand:'',internal_code:'',quantity:'0',min_stock:'1',unit:'un',observations:''};

export default function Stock(){
  const parts=useCollection('parts',{orderBy:'name',direction:'asc'});
  const movements=useCollection('stockMovements',{orderBy:'created_at',direction:'desc',limit:100});
  const [open,setOpen]=useState(false); const [form,setForm]=useState(blank); const [move,setMove]=useState(null); const [qty,setQty]=useState('');
  const create=async(e)=>{e.preventDefault();await entities.parts.create({...form,quantity:Number(form.quantity),min_stock:Number(form.min_stock),active:true});setForm(blank);setOpen(false)};
  const adjust=async(type)=>{
    const n=Number(qty||0); if(!move||n<=0)return;
    const before=Number(move.quantity||0); const after=type==='entrada'?before+n:before-n;
    if(after<0)return alert('O saldo não pode ficar negativo.');
    await entities.parts.update(move.id,{quantity:after});
    await entities.stockMovements.create({part_id:move.id,part_name:move.name,part_brand:move.brand||'',type,quantity:n,date:todayISO(),reason:'Movimentação manual de estoque'});
    setMove(null);setQty('');
  };
  return <div><PageHeader title="Estoque" description="Peças e movimentações. O saldo nunca pode ficar negativo." actions={<Button onClick={()=>setOpen(true)}><Plus size={15}/>Nova Peça</Button>}/>
    {parts.data.length===0?<EmptyState icon={Package} title="Nenhuma peça cadastrada"/>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Código</th><th>Peça</th><th>Categoria</th><th>Marca</th><th>Saldo</th><th>Mínimo</th><th>Ações</th></tr></thead><tbody>{parts.data.map(p=><tr key={p.id}><td>{p.internal_code||'—'}</td><td><strong>{p.name}</strong></td><td>{p.category}</td><td>{p.brand||'—'}</td><td><span className={Number(p.quantity)<=Number(p.min_stock)?'badge danger':'badge success'}>{p.quantity} {p.unit}</span></td><td>{p.min_stock}</td><td><Button variant="outline" onClick={()=>setMove(p)}>Movimentar</Button></td></tr>)}</tbody></table></div>}
    <h2 className="section-title">Últimas movimentações</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Data</th><th>Peça</th><th>Tipo</th><th>Quantidade</th><th>Viatura</th><th>Motivo</th></tr></thead><tbody>{movements.data.map(m=><tr key={m.id}><td>{m.date}</td><td>{m.part_name}</td><td>{m.type}</td><td>{m.quantity}</td><td>{m.vehicle_prefix||'—'}</td><td>{m.reason||'—'}</td></tr>)}</tbody></table></div>
    <Modal open={open} onClose={()=>setOpen(false)} title="Cadastrar Peça"><form onSubmit={create} className="form-stack"><div className="form-grid"><Field label="Nome" required><Input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Código interno"><Input value={form.internal_code} onChange={e=>setForm({...form,internal_code:e.target.value})}/></Field><Field label="Categoria"><Select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['eletrica','motor','freio','suspensao','pneus','filtros','outros'].map(x=><option key={x}>{x}</option>)}</Select></Field><Field label="Marca"><Input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></Field><Field label="Quantidade"><Input type="number" min="0" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></Field><Field label="Estoque mínimo"><Input type="number" min="0" value={form.min_stock} onChange={e=>setForm({...form,min_stock:e.target.value})}/></Field><Field label="Unidade"><Select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{['un','kit','par','litro','metro'].map(x=><option key={x}>{x}</option>)}</Select></Field></div><Field label="Observações"><Textarea value={form.observations} onChange={e=>setForm({...form,observations:e.target.value})}/></Field><div className="form-actions"><Button variant="secondary" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div></form></Modal>
    <Modal open={!!move} onClose={()=>setMove(null)} title={'Movimentar • '+(move?.name||'')}><Field label="Quantidade"><Input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)}/></Field><div className="form-actions"><Button variant="success" onClick={()=>adjust('entrada')}><ArrowDown size={14}/>Entrada</Button><Button variant="danger" onClick={()=>adjust('saida')}><ArrowUp size={14}/>Saída</Button></div></Modal>
  </div>;
}
