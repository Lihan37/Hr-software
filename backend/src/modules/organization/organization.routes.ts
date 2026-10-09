import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ApiError } from '../../utils/api-error.js';
import { ok } from '../../utils/api-response.js';
import { audit } from '../audit/audit.service.js';
import { Department, Designation, Location, Section } from './organization.model.js';

export const organizationRouter = Router();
organizationRouter.use(authenticate);
const schema = z.object({ name: z.string().min(2).max(100), code: z.string().min(2).max(20), description: z.string().max(500).optional(), active: z.boolean().optional(), department: z.string().optional(), rank: z.number().int().optional(), address: z.string().max(300).optional(), timezone: z.string().max(80).optional() });
const resources: Record<string, any> = { departments: Department, sections: Section, designations: Designation, locations: Location };

for (const [path, Model] of Object.entries(resources)) {
  organizationRouter.get(`/${path}`, asyncHandler(async (_request, response) => ok(response, await Model.find().sort({ active: -1, name: 1 }))));
  organizationRouter.post(`/${path}`, requirePermission('org:manage'), asyncHandler(async (request, response) => {
    const document = await Model.create(schema.parse(request.body));
    await audit(request, `${path.toUpperCase()}_CREATED`, Model.modelName, document._id, request.body);
    ok(response, document, undefined, 201);
  }));
  organizationRouter.patch(`/${path}/:id`, requirePermission('org:manage'), asyncHandler(async (request, response) => {
    const document = await Model.findByIdAndUpdate(request.params.id, schema.partial().parse(request.body), { new: true, runValidators: true });
    if (!document) throw new ApiError(404, 'Record not found', 'NOT_FOUND');
    await audit(request, `${path.toUpperCase()}_UPDATED`, Model.modelName, document._id, request.body);
    ok(response, document);
  }));
}
