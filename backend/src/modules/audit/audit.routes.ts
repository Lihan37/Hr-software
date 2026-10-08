import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ok } from '../../utils/api-response.js';
import { pagination } from '../../utils/pagination.js';
import { AuditLog } from './audit.model.js';

export const auditRouter = Router(); auditRouter.use(authenticate, requirePermission('audit:read'));
auditRouter.get('/', asyncHandler(async (request, response) => {
  const { page, limit, skip } = pagination(request.query); const filter: any = {};
  if (request.query.entityType) filter.entityType = request.query.entityType; if (request.query.action) filter.action = request.query.action;
  const [items, total] = await Promise.all([AuditLog.find(filter).populate('actor', 'email role').sort({ timestamp: -1 }).skip(skip).limit(limit), AuditLog.countDocuments(filter)]);
  ok(response, items, { page, limit, total, pages: Math.ceil(total / limit) });
}));
