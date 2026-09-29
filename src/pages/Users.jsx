import { useMemo, useState } from 'react';
import { Users as UsersIcon, Plus, Pencil, UserPlus } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { entities } from '../data/repository';
import { createFirebaseUser } from '../services/userAdmin';
import { useAuth } from '../auth/AuthContext';
import {
  ROLE_LABELS,
  SPECIAL_PERMISSION_LABELS,
  SPECIAL_PERMISSIONS,
  can
} from '../lib/permissions';
import { Button, EmptyState, Field, Input, Modal, PageHeader, Select } from '../components/ui';

const blank = {
  email: '',
  password: '',
  name: '',
  role: 'adm_opm',
  unit: '',
  workshop_id: '',
  workshop_name: '',
  job_function: '',
  posto_graduacao: '',
  re: '',
  nome_guerra: '',
  active: true,
  permissoes_especiais: [],
};

export default function Users(){
  const { user: currentUser, userRole } = useAuth();
  const users = useCollection('users',{orderBy:'name',direction:'asc'});
  const [open,setOpen] = useState(false);
  const [editing,setEditing] = useState(null);
  const [form,setForm] = useState(blank);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');

  const allowed = can.manageUsers(userRole, currentUser);

  const sortedPermissions = useMemo(
    () => Object.entries(SPECIAL_PERMISSION_LABELS),
    []
  );

  const startCreate = () => {
    setEditing(null);
    setForm(blank);
    setError('');
    setOpen(true);
  };

  const startEdit = (u) => {
    setEditing(u);
    setForm({
      email: u.email || '',
      password: '',
      name: u.name || '',
      role: u.role || 'adm_opm',
      unit: u.unit || '',
      workshop_id: u.workshop_id || '',
      workshop_name: u.workshop_name || '',
      job_function: u.job_function || '',
      posto_graduacao: u.posto_graduacao || '',
      re: u.re || '',
      nome_guerra: u.nome_guerra || '',
      active: u.active !== false,
      permissoes_especiais: Array.isArray(u.permissoes_especiais) ? u.permissoes_especiais : [],
    });
    setError('');
    setOpen(true);
  };

  const togglePermission = (permission) => {
    const list = form.permissoes_especiais || [];
    setForm({
      ...form,
      permissoes_especiais: list.includes(permission)
        ? list.filter((p) => p !== permission)
        : [...list, permission],
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!allowed) return;
    setBusy(true);
    setError('');

    try {
      if (editing) {
        await entities.users.update(editing.id, {
          email: form.email,
          name: form.name,
          role: form.role,
          unit: form.unit,
          workshop_id: form.workshop_id,
          workshop_name: form.workshop_name,
          job_function: form.job_function,
          posto_graduacao: form.posto_graduacao,
          re: form.re,
          nome_guerra: form.nome_guerra,
          active: form.active,
          status_usuario: form.active ? 'ATIVO' : 'INATIVO',
          permissoes_especiais: form.permissoes_especiais,
        });
      } else {
        if (!form.email || !form.password) {
          throw new Error('Informe e-mail e senha inicial.');
        }
        if (form.password.length < 6) {
          throw new Error('A senha inicial precisa ter pelo menos 6 caracteres.');
        }

        const created = await createFirebaseUser({
          email: form.email.trim(),
          password: form.password,
        });

        await entities.users.create({
          email: created.email,
          name: form.name,
          role: form.role,
          unit: form.unit,
          workshop_id: form.workshop_id,
          workshop_name: form.workshop_name,
          job_function: form.job_function,
          posto_graduacao: form.posto_graduacao,
          re: form.re,
          nome_guerra: form.nome_guerra,
          active: form.active,
          status_usuario: form.active ? 'ATIVO' : 'INATIVO',
          permissoes_especiais: form.permissoes_especiais,
          created_by_uid: currentUser?.uid || null,
          created_by_email: currentUser?.email || null,
        }, created.uid);
      }

      setOpen(false);
      setEditing(null);
      setForm(blank);
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar o usuário.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (u) => {
    if (!allowed) return;
    const active = u.active === false;
    await entities.users.update(u.id, {
      active,
      status_usuario: active ? 'ATIVO' : 'INATIVO',
    });
  };

  if (!allowed) {
    return <EmptyState icon={UsersIcon} title="Sem permissão para gerenciar usuários" text="Seu usuário precisa receber a permissão especial de cadastro e gestão de usuários." />;
  }

  return <div>
    <PageHeader
      title="Usuários"
      description="Cadastre usuários no Firebase Auth e defina perfil, escopo e permissões individuais."
      actions={<Button onClick={startCreate}><UserPlus size={15}/>Cadastrar Usuário</Button>}
    />

    <div className="config-note" style={{marginBottom:14}}>
      O usuário é criado no Firebase Authentication sem encerrar a sessão do administrador atual. As permissões abaixo ficam gravadas no perfil do Firestore e podem complementar o perfil principal.
    </div>

    {users.data.length===0 ? (
      <EmptyState
        icon={UsersIcon}
        title="Nenhum perfil de usuário no Firestore"
        text="Use Cadastrar Usuário para criar a credencial e o perfil em uma única operação."
        action={<Button onClick={startCreate}><Plus size={15}/>Cadastrar primeiro usuário</Button>}
      />
    ) : (
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>OPM / Oficina</th><th>Permissões extras</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.data.map(u => (
              <tr key={u.id}>
                <td><strong>{u.nome_guerra || u.name || '—'}</strong><br/><span className="muted">{u.posto_graduacao || ''} {u.re ? 'RE ' + u.re : ''}</span></td>
                <td>{u.email || '—'}</td>
                <td>{ROLE_LABELS[u.role] || u.role}</td>
                <td>{u.unit || u.workshop_name || '—'}</td>
                <td>{Array.isArray(u.permissoes_especiais) && u.permissoes_especiais.length ? u.permissoes_especiais.length + ' liberada(s)' : 'Nenhuma'}</td>
                <td>{u.active === false ? 'INATIVO' : 'ATIVO'}</td>
                <td>
                  <div className="record-actions">
                    <Button variant="outline" onClick={() => startEdit(u)}><Pencil size={13}/>Editar</Button>
                    <Button variant={u.active===false?'success':'danger'} onClick={()=>toggle(u)}>{u.active===false?'Ativar':'Inativar'}</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    <Modal open={open} onClose={()=>!busy&&setOpen(false)} title={editing ? 'Editar usuário' : 'Cadastrar usuário'} wide>
      <form onSubmit={save} className="form-stack">
        <div className="form-grid">
          <Field label="E-mail" required>
            <Input type="email" required value={form.email} disabled={Boolean(editing)} onChange={e=>setForm({...form,email:e.target.value})}/>
          </Field>
          {!editing && <Field label="Senha inicial" required hint="Mínimo de 6 caracteres.">
            <Input type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
          </Field>}
          <Field label="Nome">
            <Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          </Field>
          <Field label="Perfil principal" required>
            <Select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
              {Object.entries(ROLE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Unidade (OPM)">
            <Input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/>
          </Field>
          <Field label="ID da oficina">
            <Input value={form.workshop_id} onChange={e=>setForm({...form,workshop_id:e.target.value})}/>
          </Field>
          <Field label="Nome da oficina">
            <Input value={form.workshop_name} onChange={e=>setForm({...form,workshop_name:e.target.value})}/>
          </Field>
          <Field label="Função">
            <Input value={form.job_function} onChange={e=>setForm({...form,job_function:e.target.value})}/>
          </Field>
          <Field label="Posto/Graduação">
            <Input value={form.posto_graduacao} onChange={e=>setForm({...form,posto_graduacao:e.target.value})}/>
          </Field>
          <Field label="RE">
            <Input value={form.re} onChange={e=>setForm({...form,re:e.target.value})}/>
          </Field>
          <Field label="Nome de Guerra">
            <Input value={form.nome_guerra} onChange={e=>setForm({...form,nome_guerra:e.target.value})}/>
          </Field>
        </div>

        <div>
          <div className="field-label">Permissões especiais</div>
          <div className="permission-grid">
            {sortedPermissions.map(([value,label]) => (
              <label className="permission-option" key={value}>
                <input
                  type="checkbox"
                  checked={form.permissoes_especiais.includes(value)}
                  onChange={()=>togglePermission(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="checkbox-row">
          <input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/>
          Usuário ativo
        </label>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <Button variant="secondary" onClick={()=>setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy?'Salvando...':editing?'Salvar alterações':'Criar usuário'}</Button>
        </div>
      </form>
    </Modal>
  </div>;
}
