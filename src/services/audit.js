import { entities } from '../data/repository';
import { nowISO } from '../lib/format';

export async function logAudit({ user, role, action, entity, recordId, before, after, justification, context }) {
  return entities.auditLogs.create({
    user_id: user?.uid || user?.id || null,
    user_name: user?.displayName || user?.name || user?.email || 'Sistema',
    user_email: user?.email || null,
    role: role || user?.role || null,
    action,
    entity,
    record_id: recordId || null,
    previous_value: before ?? null,
    new_value: after ?? null,
    justification: justification || null,
    context: context || null,
    date_time: nowISO(),
  });
}
