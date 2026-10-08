import type { Request } from 'express';
import { Types } from 'mongoose';
import { AuditLog } from './audit.model.js';

const blockedKeys = /password|token|secret|authorization|cookie/i;

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !blockedKeys.test(key)).map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
}

export async function audit(request: Request, action: string, entityType: string, entityId: string | Types.ObjectId, changes: unknown = {}) {
  await AuditLog.create({
    actor: request.auth?.sub ?? null,
    action,
    entityType,
    entityId,
    changes: sanitize(changes),
    context: { requestId: request.requestId, ip: request.ip, userAgent: request.get('user-agent') }
  });
}
