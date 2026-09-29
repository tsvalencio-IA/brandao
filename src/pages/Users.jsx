import { useMemo, useState } from 'react';
import { Users as UsersIcon, Plus, Pencil, UserPlus, Trash2, UserCheck, RotateCcw } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { createFirebaseUser } from '../services/userAdmin';
import { logAudit } from '../services/audit';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS, SPECIAL_PERMISSION_LABELS, SPECIAL_PERMISSIONS, hasFullAccess, can } from '../lib/permissions';
import { dateTimeBR } from '../lib/format';
import { Button, EmptyState, Field, Input, Modal, PageHeader, Select } from '../components/ui';

const blank = {
  email:'', password:'', name:'', role:'adm_opm', unit:'',
  workshop_id:'', workshop_name:'', job_function:'', posto_graduacao:'',
  re:'', nome_guerra:'', active:true, permissoes_especiais:[],
};

const isOnline = (presence) => {
  if (!presence?.online || !presence?.last_seen) return false;
  const ts = new Date(presence.last_seen).getTime();
  return Number.isFinite(ts) && Date.now() - ts < 90000;
};

export default function Users(){
  const { user: currentUser, userRole } = useAuth();
  const users = useCollection('users',{orderBy:'created_at',direction:'desc'});
  const [open,setOpen] = useState(false);
  const [editing,setEditing] = useState(null);
  const [mode,setMode] = useState('create');
  const [form,setForm] = useState(blank);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [showDeleted,setShowDeleted] = useState(false);

  const allowed = can.manageUsers(userRole, currentUser);
  const permissions = useMemo(() => Object.entries(SPECIAL_PERMISSION_LABELS), []);

  const normalUsers = useMemo(() => users.data.filter(u=>u.deleted!==true && u.status_usuario!=='EXCLUIDO'), [users.data]);
  const deletedUsers = useMemo(() => users.data.filter(u=>u.deleted===true || u.status_usuario==='EXCLUIDO'), [users.data]);
  const pendingCount = normalUsers.filter(u=>u.status_usuario==='PENDENTE' || !u.role).length;

  const startCreate = () => {
    setEditing(null); setMode('create'); setForm(blank); setError(''); setOpen(true);
  };

  const startEdit = (u, nextMode='edit') => {
    setEditing(u); setMode(nextMode); setError('');
    setForm({
      email:u.email||'', password:'', name:u.name||'', role:u.role||'adm_opm',
      unit:u.unit||'', workshop_id:u.workshop_id||'', workshop_name:u.workshop_name||'',
      job_function:u.job_function||'', posto_graduacao:u.posto_graduacao||'', re:u.re||'',
      nome_guerra:u.nome_guerra||'', active:nextMode==='approve' ? true : u.active!==false,
      permissoes_especiais:hasFullAccess(u) ? [SPECIAL_PERMISSIONS.ACESSO_TOTAL] : (Array.isArray(u.permissoes_especiais)?u.permissoes_especiais:[]),
    });
    setOpen(true);
  };

  const togglePermission = (permission) => {
    const list=form.permissoes_especiais||[];

    if (permission === SPECIAL_PERMISSIONS.ACESSO_TOTAL) {
      setForm({
        ...form,
        permissoes_especiais: list.includes(SPECIAL_PERMISSIONS.ACESSO_TOTAL)
          ? []
          : [SPECIAL_PERMISSIONS.ACESSO_TOTAL],
      });
      return;
    }

    const withoutTotal = list.filter(p=>p!==SPECIAL_PERMISSIONS.ACESSO_TOTAL);
    setForm({
      ...form,
      permissoes_especiais: withoutTotal.includes(permission)
        ? withoutTotal.filter(p=>p!==permission)
        : [...withoutTotal,permission]
    });
  };

  const payload = () => ({
    email:form.email.trim(), name:form.name, role:form.role, unit:form.unit,
    workshop_id:form.workshop_id, workshop_name:form.workshop_name,
    job_function:form.job_function, posto_graduacao:form.posto_graduacao,
    re:form.re, nome_guerra:form.nome_guerra, active:form.active,
    status_usuario:form.active?'ATIVO':'INATIVO',
    approval_status:form.active?'APROVADO':'BLOQUEADO',
    permissoes_especiais:form.permissoes_especiais,
    deleted:false,
  });

  const save = async (e) => {
    e.preventDefault();
    if(!allowed) return;
    setBusy(true); setError('');
    try {
      if(editing){
        const before={role:editing.role,status_usuario:editing.status_usuario,active:editing.active,permissoes_especiais:editing.permissoes_especiais||[]};
        const after=payload();
        await entities.users.update(editing.id,after);
        await logAudit({
          user:currentUser,role:userRole,
          action:mode==='approve'?'USUARIO_LIBERADO':'USUARIO_EDITADO',
          entity:'User',recordId:editing.id,before,after,
          context:{target_email:editing.email||form.email}
        });
      } else {
        if(!form.email||!form.password) throw new Error('Informe e-mail e senha inicial.');
        if(form.password.length<6) throw new Error('A senha inicial precisa ter pelo menos 6 caracteres.');
        const created=await createFirebaseUser({email:form.email.trim(),password:form.password});
        const after=payload();
        await entities.users.create({
          ...after,email:created.email,created_by_uid:currentUser?.uid||null,created_by_email:currentUser?.email||null,
        },created.uid);
        await logAudit({
          user:currentUser,role:userRole,action:'USUARIO_CRIADO',
          entity:'User',recordId:created.uid,after,
          context:{target_email:created.email}
        });
      }
      setOpen(false);setEditing(null);setMode('create');setForm(blank);
    }catch(err){setError(err?.message||'Não foi possível salvar o usuário.')}
    finally{setBusy(false)}
  };

  const toggle = async (u) => {
    if(u.id===currentUser?.uid) return alert('Você não pode inativar seu próprio acesso.');
    const active=u.active===false;
    const patch={active,status_usuario:active?'ATIVO':'INATIVO',approval_status:active?'APROVADO':'BLOQUEADO'};
    await entities.users.update(u.id,patch);
    await logAudit({
      user:currentUser,role:userRole,action:active?'USUARIO_ATIVADO':'USUARIO_INATIVADO',
      entity:'User',recordId:u.id,before:{active:u.active,status_usuario:u.status_usuario},after:patch,
      context:{target_email:u.email}
    });
  };

  const removeUser = async (u) => {
    if(u.id===currentUser?.uid) return alert('Você não pode excluir seu próprio acesso.');
    if(!window.confirm('Excluir este usuário do SIGFROTA? Ele ficará bloqueado e a ação será preservada na auditoria.')) return;
    const before={...u};
    const patch={
      deleted:true,active:false,status_usuario:'EXCLUIDO',approval_status:'EXCLUIDO',
      role:null,permissoes_especiais:[],deleted_at:new Date().toISOString(),
      deleted_by_uid:currentUser?.uid||null,deleted_by_email:currentUser?.email||null,
    };
    await entities.users.update(u.id,patch);
    await logAudit({
      user:currentUser,role:userRole,action:'USUARIO_EXCLUIDO',
      entity:'User',recordId:u.id,before,after:patch,
      context:{target_email:u.email,note:'Credencial Firebase Auth preservada; acesso SIGFROTA bloqueado.'}
    });
  };

  const restoreUser = async (u) => {
    const patch={deleted:false,active:false,status_usuario:'PENDENTE',approval_status:'PENDENTE',role:null,permissoes_especiais:[]};
    await entities.users.update(u.id,patch);
    await logAudit({
      user:currentUser,role:userRole,action:'USUARIO_RESTAURADO_PARA_PENDENTE',
      entity:'User',recordId:u.id,before:{status_usuario:u.status_usuario},after:patch,
      context:{target_email:u.email}
    });
  };

  if(!allowed) return <EmptyState icon={UsersIcon} title="Sem permissão para gerenciar usuários" text="Seu usuário precisa receber a permissão especial de cadastro e gestão de usuários."/>;

  return <div>
    <PageHeader title="Usuários"
      description="Quem entra no SIGFROTA sem perfil aparece automaticamente aqui para liberação."
      actions={<Button onClick={startCreate}><UserPlus size={15}/>Cadastrar novo usuário</Button>}/>

    {pendingCount>0&&<div className="warning-box" style={{marginBottom:14}}>
      <b>{pendingCount} usuário(s) aguardando liberação.</b> Clique em Liberar, escolha perfil/OPM/oficina e defina os poderes.
    </div>}

    <div className="toolbar">
      <Button variant={showDeleted?'primary':'outline'} onClick={()=>setShowDeleted(!showDeleted)}>
        {showDeleted?'Mostrar usuários atuais':'Excluídos ('+deletedUsers.length+')'}
      </Button>
    </div>

    {!showDeleted ? (
      normalUsers.length===0 ? <EmptyState icon={UsersIcon} title="Nenhum usuário cadastrado" text="Usuários que fizerem login aparecerão automaticamente aqui como pendentes."/> :
      <div className="table-wrap"><table className="data-table"><thead><tr>
        <th>Usuário</th><th>Perfil</th><th>OPM / Oficina</th><th>Poderes</th><th>Conexão</th><th>Status</th><th></th>
      </tr></thead><tbody>{normalUsers.map(u=>{
        const online=u.id===currentUser?.uid ? true : isOnline(u); const pending=u.status_usuario==='PENDENTE'||!u.role;
        return <tr key={u.id}>
          <td><strong>{u.nome_guerra||u.name||u.email||'—'}</strong><br/><span className="muted">{u.email||'—'}</span></td>
          <td>{pending?<span className="badge warning">AGUARDANDO PERFIL</span>:(ROLE_LABELS[u.role]||u.role)}</td>
          <td>{u.unit||u.workshop_name||'—'}</td>
          <td>{hasFullAccess(u)?<span className="badge success">ACESSO TOTAL</span>:(u.permissoes_especiais?.length?u.permissoes_especiais.length+' liberado(s)':'Nenhum extra')}</td>
          <td><span className={'presence '+(online?'online':'offline')}><i/>{online?'Online':'Offline'}</span>{u.last_seen&&<div className="muted small">{dateTimeBR(u.last_seen)}</div>}</td>
          <td>{pending?<span className="badge warning">PENDENTE</span>:u.active===false?<span className="badge danger">INATIVO</span>:<span className="badge success">ATIVO</span>}</td>
          <td><div className="record-actions">
            {pending?<Button variant="success" onClick={()=>startEdit(u,'approve')}><UserCheck size={13}/>Liberar</Button>:<Button variant="outline" onClick={()=>startEdit(u)}><Pencil size={13}/>Editar</Button>}
            {!pending&&<Button variant={u.active===false?'success':'warning'} onClick={()=>toggle(u)}>{u.active===false?'Ativar':'Inativar'}</Button>}
            <Button variant="danger" onClick={()=>removeUser(u)}><Trash2 size={13}/>Excluir</Button>
          </div></td>
        </tr>
      })}</tbody></table></div>
    ) : (
      deletedUsers.length===0 ? <EmptyState icon={Trash2} title="Nenhum usuário excluído"/> :
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Usuário</th><th>E-mail</th><th>Excluído em</th><th></th></tr></thead><tbody>
        {deletedUsers.map(u=><tr key={u.id}><td>{u.nome_guerra||u.name||u.email||'—'}</td><td>{u.email||'—'}</td><td>{dateTimeBR(u.deleted_at)}</td><td><Button variant="outline" onClick={()=>restoreUser(u)}><RotateCcw size={13}/>Restaurar como pendente</Button></td></tr>)}
      </tbody></table></div>
    )}

    <Modal open={open} onClose={()=>!busy&&setOpen(false)}
      title={editing ? (mode==='approve'?'Liberar usuário':'Editar usuário') : 'Cadastrar novo usuário'} wide>
      <form onSubmit={save} className="form-stack">
        {mode==='approve'&&<div className="success-box">
          Este usuário já foi reconhecido pelo Firebase Auth. Defina o perfil e os poderes; ao salvar, a liberação será refletida automaticamente na sessão dele.
        </div>}
        <div className="form-grid">
          <Field label="E-mail" required><Input type="email" required value={form.email} disabled={Boolean(editing)} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
          {!editing&&<Field label="Senha inicial" required hint="Mínimo de 6 caracteres."><Input type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></Field>}
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
        <div>
          <div className="field-label">Permissões especiais</div>
          {form.permissoes_especiais.includes(SPECIAL_PERMISSIONS.ACESSO_TOTAL)&&
            <div className="success-box" style={{marginBottom:8}}>
              Acesso total ativo: este usuário poderá acessar todos os módulos e executar todas as ações do SIGFROTA, independentemente do perfil principal.
            </div>}
          <div className="permission-grid">
            {permissions.map(([value,label])=><label className={'permission-option '+(value===SPECIAL_PERMISSIONS.ACESSO_TOTAL?'permission-total':'')} key={value}>
              <input type="checkbox"
                checked={form.permissoes_especiais.includes(value)}
                onChange={()=>togglePermission(value)}/>
              <span>{label}</span>
            </label>)}
          </div>
        </div>
        <label className="checkbox-row"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Usuário ativo</label>
        {error&&<div className="form-error">{error}</div>}
        <div className="form-actions"><Button variant="secondary" onClick={()=>setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy?'Salvando...':mode==='approve'?'Liberar usuário':editing?'Salvar alterações':'Criar usuário'}</Button></div>
      </form>
    </Modal>
  </div>;
}
