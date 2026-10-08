import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ApiError } from '../../utils/api-error.js';
import { ok } from '../../utils/api-response.js';
import { roles } from '../../types/auth.js';
import { audit } from '../audit/audit.service.js';
import { hashPassword } from '../auth/auth.service.js';
import { User } from './user.model.js';

export const userRouter = Router(); userRouter.use(authenticate, requirePermission('user:manage'));
userRouter.get('/', asyncHandler(async (_request, response) => ok(response, await User.find().populate('employee', 'employeeId fullName').sort({ email: 1 }))));
userRouter.post('/', asyncHandler(async (request, response) => {
  const input = z.object({ email: z.email(), password: z.string().min(12).max(128), role: z.enum(roles), employee: z.string().nullable().optional() }).parse(request.body);
  const user = await User.create({ ...input, passwordHash: await hashPassword(input.password), password: undefined });
  await audit(request, 'USER_CREATED', 'User', user._id, { email: user.email, role: user.role, employee: user.employee });
  ok(response, { id: user.id, email: user.email, role: user.role, employee: user.employee, status: user.status }, undefined, 201);
}));
userRouter.patch('/:id', asyncHandler(async (request, response) => {
  const input = z.object({ role: z.enum(roles).optional(), status: z.enum(['ACTIVE', 'LOCKED', 'DISABLED']).optional(), employee: z.string().nullable().optional() }).parse(request.body);
  const user = await User.findByIdAndUpdate(request.params.id, input, { new: true, runValidators: true }); if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');
  await audit(request, 'USER_UPDATED', 'User', user._id, input); ok(response, user);
}));
