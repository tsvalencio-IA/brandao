import { nowISO } from '../lib/format';

const PREFIX = 'sigfrota:data:';
const listeners = new Map();

const read = (name) => {
  try { return JSON.parse(localStorage.getItem(PREFIX + name) || '[]'); }
  catch { return []; }
};

const write = (name, rows) => {
  localStorage.setItem(PREFIX + name, JSON.stringify(rows));
  (listeners.get(name) || new Set()).forEach((fn) => fn(rows));
};

const uid = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);

const applyQuery = (rows, options = {}) => {
  let result = [...rows];
  const filters = options.filters || {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') result = result.filter((row) => row[k] === v);
  });
  if (options.orderBy) {
    const dir = options.direction === 'asc' ? 1 : -1;
    result.sort((a, b) => String(a[options.orderBy] || '').localeCompare(String(b[options.orderBy] || '')) * dir);
  }
  if (options.limit) result = result.slice(0, options.limit);
  return result;
};

export const localRepository = {
  mode: 'local',
  async list(name, options) { return applyQuery(read(name), options); },
  async get(name, id) { return read(name).find((x) => x.id === id) || null; },
  async findOne(name, filters) { return applyQuery(read(name), { filters })[0] || null; },
  async create(name, data, forcedId = null) {
    const rows = read(name);
    const id = forcedId || uid();
    const row = { ...data, id, created_at: data.created_at || nowISO(), updated_at: nowISO() };
    const existing = rows.findIndex((x) => x.id === id);
    if (existing >= 0) rows[existing] = row; else rows.push(row);
    write(name, rows);
    return row;
  },
  async update(name, id, patch) {
    const rows = read(name);
    const i = rows.findIndex((x) => x.id === id);
    if (i < 0) throw new Error('Registro não encontrado');
    rows[i] = { ...rows[i], ...patch, id, updated_at: nowISO() };
    write(name, rows);
    return rows[i];
  },
  async remove(name, id) {
    write(name, read(name).filter((x) => x.id !== id));
  },
  subscribe(name, options, callback) {
    const set = listeners.get(name) || new Set();
    const handler = (rows) => callback(applyQuery(rows, options));
    set.add(handler);
    listeners.set(name, set);
    handler(read(name));
    return () => set.delete(handler);
  },
  async transaction(fn) { return fn(this); },
};
