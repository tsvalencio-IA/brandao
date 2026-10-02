import assert from 'node:assert/strict';
import {
  SPECIAL_PERMISSIONS,
  can,
  canAccessRoute,
  canEnterSystem,
  getVehicleScopeMode,
  vehicleScopeFilter,
} from '../src/lib/permissions.js';

const active=(overrides={})=>({
  uid:'test',
  email:'test@local',
  active:true,
  status_usuario:'ATIVO',
  approval_status:'APROVADO',
  permissoes_especiais:[],
  vehicle_scope:'all',
  ...overrides,
});

const gestor=active({role:'gestor'});
assert.equal(canEnterSystem(gestor),true);
assert.equal(canAccessRoute('gestor','/usuarios',gestor),true);
assert.equal(can.manageVehicles('gestor',gestor),true);

const adm=active({role:'adm'});
assert.equal(canAccessRoute('adm','/viaturas',adm),true);
assert.equal(canAccessRoute('adm','/usuarios',adm),false);

const opm=active({role:'adm_opm',unit:'52.º BPM/I - 2.ª CIA',vehicle_scope:'unit'});
assert.equal(getVehicleScopeMode(opm),'unit');
assert.deepEqual(vehicleScopeFilter(opm,'unit'),{unit:'52.º BPM/I - 2.ª CIA'});
assert.equal(canAccessRoute('adm_opm','/controle-operacional',opm),true);

const mecanico=active({role:'mecanico'});
assert.equal(can.diagnosis('mecanico',mecanico),true);
assert.equal(can.checklist('mecanico',mecanico),true);
assert.equal(can.quickMaintenance('mecanico',mecanico),true);

const oficina=active({role:'oficina'});
assert.equal(canAccessRoute('oficina','/portal-oficina',oficina),true);
assert.equal(canAccessRoute('oficina','/diagnostico',oficina),false);

const uge=active({role:'uge'});
assert.equal(canAccessRoute('uge','/uge',uge),true);
assert.equal(canAccessRoute('uge','/estoque',uge),false);

const onePermission=active({
  role:null,
  permissoes_especiais:[SPECIAL_PERMISSIONS.DIAGNOSTICO],
  vehicle_scope:'unit',
  unit:'52.º BPM/I - 2.ª CIA',
});
assert.equal(canEnterSystem(onePermission),true);
assert.equal(canAccessRoute(null,'/diagnostico',onePermission),true);
assert.equal(canAccessRoute(null,'/checklist',onePermission),false);
assert.equal(canAccessRoute(null,'/ordens',onePermission),false);
assert.equal(canAccessRoute(null,'/usuarios',onePermission),false);

const inactive=active({role:'gestor',active:false,status_usuario:'INATIVO'});
assert.equal(canEnterSystem(inactive),false);

console.log('OK: perfis, escopo por OPM e usuário com uma única permissão validados.');
