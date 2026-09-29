import { FINANCIAL_LABELS, STATUS_LABELS } from '../lib/permissions';

const cls = (status) => {
  if (['OPERANDO','LIBERADA','APROVADO','PAGO','REPARO_REALIZADO'].includes(status)) return 'badge success';
  if (['BAIXADA','REPROVADO','REPARO_REPROVADO','DESCARGA','NOTA_FISCAL_REPROVADA'].includes(status)) return 'badge danger';
  if (['AGUARDANDO_APROVACAO','AGUARDANDO_VERBA','VERBA_PENDENTE','VERBA_SOLICITADA'].includes(status)) return 'badge purple';
  if (['EM_REPARO','EM_DIAGNOSTICO'].includes(status)) return 'badge warning';
  return 'badge neutral';
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  return <span className={cls(status)}>{STATUS_LABELS[status] || FINANCIAL_LABELS[status] || status.replaceAll('_',' ')}</span>;
}
