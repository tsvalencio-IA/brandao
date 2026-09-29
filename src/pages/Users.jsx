import { useMemo, useState } from 'react';
import { Users as UsersIcon, Plus, Pencil, UserPlus, Link2 } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { createFirebaseUser } from '../services/userAdmin';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS, SPECIAL_PERMISSION_LABELS, can } from '../lib/permissions';
import { Button, EmptyState, Field, Input, Modal, PageHeader, Select } from '../components/ui';

const blank = {
  uid: '', email: '', password: '', name: '', role: 'adm_opm', unit: '',
  workshop_id: '', workshop_name: '', job_function: '', posto_graduacao: '',
  re: '', nome_guerra: '', active: true, permissoes_especiais: [],
};

export default function Users(){
  const { user: currentUser, userRole } = useAuth();
  const users = useCollection('users',{orderBy:'name',direction:'asc'});
  const [open,setOpen] = useState(false);
  const [editing,setEditing] = useState(null);
  const [mode,setMode] = useState('create');
  const [form,setForm] = useState(blank);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');

  const allowed = can.manageUsers(userRole, currentUser);
  const permissions = useMemo(() => Object.entries(SPECIAL_PERMISSION_LABELS), []);

  const reset = (nextMode='create') => {
    setEditing(null); setMode(nextMode); setForm(blank); setError(''); setOpen(true);
  };

  const edit = (u) => {
    setEditing(u); setMode('edit'); setError('');
    setForm({
      uid:u.id||'', email:u.email||'', password:'', name:u.name||'', role:u.role||'adm_opm',
      unit:u.unit||'', workshop_id:u.workshop_id||'', workshop_name:u.workshop_name||'',
      job_function:u.job_function||'', posto_graduacao:u.posto_graduacao||'', re:u.re||'',
      nome_guerra:u.nome_guerra||'', active:u.active!==false,
      permissoes_especiais:Array.isArray(u.permissoes_especiais)?u.permissoes_especiais:[],
    });
    setOpen(true);
  };

  const togglePermission = (permission) => {
    const list = form.permissoes_especiais || [];
    setForm({...form, permissoes_especiais:list.includes(permission)
      ? list.filter(p=>p!==permission) : [...list,permission]});
  };

  const payload = () => ({
    email:form.email.trim(), name:form.name, role:form.role, unit:form.unit,
    workshop_id:form.workshop_id, workshop_name:form.workshop_name,
    job_function:form.job_function, posto_graduacao:form.posto_graduacao,
    re:form.re, nome_guerra:form.nome_guerra, active:form.active,
    status_usuario:form.active?'ATIVO':'INATIVO',
    permissoes_especiais:form.permissoes_especiais,
    created_by_uid:currentUser?.uid||null, created_by_email:currentUser?.email||null,
  });

  const save = async (e) => {
    e.preventDefault();
    if (!allowed) return;
    setBusy(true); setError('');
    try {
      if (editing) {
        await entities.users.update(editing.id, payload());
      } else if (mode === 'link') {
        const uid=form.uid.trim();
        if(!uid) throw new Error('Informe o UID do usuário já cadastrado no Firebase Authentication.');
        if(!form.email.trim()) throw new Error('Informe o e-mail do usuário.');
        await entities.users.create(payload(), uid);
      } else {
        if(!form.email||!form.password) throw new Error('Informe e-mail e senha inicial.');
        if(form.password.length<6) throw new Error('A senha inicial precisa ter pelo menos 6 caracteres.');
        const created=await createFirebaseUser({email:form.email.trim(),password:form.password});
        await entities.users.create({...payload(),email:created.email},created.uid);
      }
      setOpen(false); setEditing(null); setMode('create'); setForm(blank);
    } catch(err) {
      setError(err?.message||'Não foi possível salvar o usuário.');
    } finally { setBusy(false); }
  };

  const toggle = async (u) => {
    const active=u.active===false;
    await entities.users.update(u.id,{active,status_usuario:active?'ATIVO':'INATIVO'});
  };

  if(!allowed) return <EmptyState icon={UsersIcon} title="Sem permissão para gerenciar usuários" text="Seu usuário precisa receber a permissão especial de cadastro e gestão de usuários."/>;

  return <div>
    <PageHeader title="Usuários" description="Cadastre novos usuários ou vincule quem já existe no Firebase Authentication."
      actions={<>
        <Button variant="secondary" onClick={()=>reset('link')}><Link2 size={15}/>Vincular usuário existente</Button>
        <Button onClick={()=>reset('create')}><UserPlus size={15}/>Cadastrar novo usuário</Button>
      </>}/>

    <div className="config-note" style={{marginBottom:14}}>
      Se o usuário já foi criado diretamente no Firebase Authentication, use <b>Vincular usuário existente</b>. Não crie o mesmo e-mail novamente.
    </div>

    {users.data.length===0 ? <EmptyState icon={UsersIcon} title="Nenhum perfil cadastrado"
      text="Crie um usuário novo ou vincule um UID já existente."
      action={<div className="record-actions" style={{justifyContent:'center'}}>
        <Button variant="secondary" onClick={()=>reset('link')}><Link2 size={15}/>Vincular existente</Button>
        <Button onClick={()=>reset('create')}><Plus size={15}/>Cadastrar novo</Button>
      </div>}/> :
      <div className="table-wrap"><table className="data-table"><thead><tr>
        <th>Nome</th><th>E-mail</th><th>Perfil</th><th>OPM / Oficina</th><th>Permissões extras</th><th>Status</th><th></th>
      </tr></thead><tbody>{users.data.map(u=><tr key={u.id}>
        <td><strong>{u.nome_guerra||u.name||'—'}</strong><br/><span className="muted">{u.posto_graduacao||''} {u.re?'RE '+u.re:''}</span></td>
        <td>{u.email||'—'}</td><td>{ROLE_LABELS[u.role]||u.role}</td><td>{u.unit||u.workshop_name||'—'}</td>
        <td>{u.permissoes_especiais?.length ? u.permissoes_especiais.length+' liberada(s)' : 'Nenhuma'}</td>
        <td>{u.active===false?'INATIVO':'ATIVO'}</td>
        <td><div className="record-actions"><Button variant="outline" onClick={()=>edit(u)}><Pencil size={13}/>Editar</Button>
        <Button variant={u.active===false?'success':'danger'} onClick={()=>toggle(u)}>{u.active===false?'Ativar':'Inativar'}</Button></div></td>
      </tr>)}</tbody></table></div>}

    <Modal open={open} onClose={()=>!busy&&setOpen(false)}
      title={editing?'Editar usuário':mode==='link'?'Vincular usuário existente':'Cadastrar novo usuário'} wide>
      <form onSubmit={save} className="form-stack">
        {mode==='link'&&!editing&&<div className="success-box">Este modo não cria outra conta no Firebase Authentication. Ele somente vincula o UID ao perfil e às permissões do SIGFROTA.</div>}
        <div className="form-grid">
          {mode==='link'&&!editing&&<Field label="UID do Firebase Authentication" required><Input required value={form.uid} onChange={e=>setForm({...form,uid:e.target.value})}/></Field>}
          <Field label="E-mail" required><Input type="email" required value={form.email} disabled={Boolean(editing)} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
          {mode==='create'&&!editing&&<Field label="Senha inicial" required hint="Mínimo de 6 caracteres."><Input type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></Field>}
          <Field label="Nome"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
          <Field label="Perfil principal" required><Select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{Object.entries(ROLE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Unidade (OPM)"><Input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></Field>
          <Field label="ID da oficina"><Input value={form.workshop_id} onChange={e=>setForm({...form,workshop_id:e.target.value})}/></Field>
          <Field label="Nome da oficina"><Input value={form.workshop_name} onChange={e=>setForm({...form,workshop_name:e.target.value})}/></Field>
          <Field label="Função"><Input value={form.job_function} onChange={e=>setForm({...form,job_function:e.target.value})}/></Field>
          <Field label="Posto/Graduação"><Input value={form.posto_graduacao} onChange={e=>setForm({...form,posto_graduacao:e.target.value})}/></Field>
          <Field label="RE"><Input value={form.re} onChange={e=>setForm({...form,re:e.target.value})}/></Field>
          <Field label="Nome de Guerra"><Input value={form.nome_guerra} onChange={e=>setForm({...form,nome_guerra:e.target.value})}/></Field>
        </div>
        <div><div className="field-label">Permissões especiais</div><div className="permission-grid">
          {permissions.map(([value,label])=><label className="permission-option" key={value}><input type="checkbox"
            checked={form.permissoes_especiais.includes(value)} onChange={()=>togglePermission(value)}/><span>{label}</span></label>)}
        </div></div>
        <label className="checkbox-row"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Usuário ativo</label>
        {error&&<div className="form-error">{error}</div>}
        <div className="form-actions"><Button variant="secondary" onClick={()=>setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy?'Salvando...':editing?'Salvar alterações':mode==='link'?'Vincular usuário':'Criar usuário'}</Button></div>
      </form>
    </Modal>
  </div>;
}
