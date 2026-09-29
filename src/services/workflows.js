import { entities, repository } from '../data/repository';
import { nowISO } from '../lib/format';

const pad = (n) => String(n).padStart(3, '0');

export async function registerVehicleDown({ vehicle, payload, actor }) {
  if (!vehicle || vehicle.status === 'DESCARGA' || vehicle.status === 'INATIVA') {
    throw new Error('Esta viatura não aceita nova baixa.');
  }
  const down = await entities.vehicleDowns.create({
    vehicle_id: vehicle.id,
    vehicle_prefix: vehicle.prefix,
    vehicle_plate: vehicle.plate,
    unit: vehicle.unit,
    km: Number(payload.km || vehicle.km_horimeter || 0),
    defect_description: payload.defect_description,
    defect_category: payload.defect_category || '',
    priority: payload.priority || 'media',
    tow_required: Boolean(payload.tow_required),
    observations: payload.observations || '',
    attachments: payload.attachments || [],
    status: 'ABERTA',
    created_by: actor?.email || actor?.name || '',
    created_at: nowISO(),
  });
  await entities.vehicles.update(vehicle.id, {
    status: 'AGUARDANDO_DIAGNOSTICO',
    km_horimeter: Number(payload.km || vehicle.km_horimeter || 0),
  });
  return down;
}

export async function nextOesNumber(workshop) {
  const year = new Date().getFullYear().toString().slice(-2);
  const key = workshop.id + '-' + new Date().getFullYear();

  if (repository.mode === 'local') {
    const current = await entities.oesCounters.get(key);
    const next = Number(current?.last_sequence || 0) + 1;
    await entities.oesCounters.create({
      workshop_id: workshop.id,
      workshop_code: workshop.codigo || workshop.code || 'OF',
      year: new Date().getFullYear(),
      last_sequence: next,
    }, key);
    return pad(next) + '/' + (workshop.codigo || workshop.code || 'OF') + '/' + year;
  }

  // O incremento definitivo deve ser atômico. No Firebase, a Cloud Function/transaction
  // pode substituir este fallback sem alterar as telas.
  const current = await entities.oesCounters.get(key);
  const next = Number(current?.last_sequence || 0) + 1;
  await entities.oesCounters.create({
    workshop_id: workshop.id,
    workshop_code: workshop.codigo || workshop.code || 'OF',
    year: new Date().getFullYear(),
    last_sequence: next,
  }, key);
  return pad(next) + '/' + (workshop.codigo || workshop.code || 'OF') + '/' + year;
}

export async function createFinancialFlow(order, budget) {
  const existing = await entities.financialFlows.findOne({ maintenance_order_id: order.id });
  if (existing) return existing;
  return entities.financialFlows.create({
    maintenance_order_id: order.id,
    oes_number: order.oes_number,
    vehicle_id: order.vehicle_id,
    vehicle_prefix: order.vehicle_prefix,
    vehicle_plate: order.vehicle_plate,
    workshop_id: order.workshop_id,
    workshop_name: order.workshop_name,
    approved_value: Number(budget.total_value || 0),
    status: 'VERBA_PENDENTE',
  });
}
