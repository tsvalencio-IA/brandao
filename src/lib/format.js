export const money = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const numberBR = (value) =>
  Number(value || 0).toLocaleString('pt-BR');

export const dateBR = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('pt-BR');
};

export const dateTimeBR = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('pt-BR');
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const nowISO = () => new Date().toISOString();

export const generateToken = () =>
  (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36))
    .replace(/-/g, '');

export const normalizePlate = (v = '') => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
export const normalizeText = (v = '') => String(v).trim();
