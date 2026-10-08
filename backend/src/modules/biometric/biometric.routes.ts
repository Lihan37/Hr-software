import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ApiError } from '../../utils/api-error.js';
import { ok } from '../../utils/api-response.js';
import { audit } from '../audit/audit.service.js';
import { BiometricDevice, BiometricPunch, EmployeeBiometricMapping } from './biometric.model.js';
import { ingestPunches, processPendingPunches } from './biometric.service.js';

export const biometricRouter = Router(); biometricRouter.use(authenticate, requirePermission('biometric:manage'));
biometricRouter.get('/devices', asyncHandler(async (_request, response) => ok(response, await BiometricDevice.find().select('-ipAddress'))));
biometricRouter.post('/devices', asyncHandler(async (request, response) => {
  const input = z.object({ deviceId: z.string(), name: z.string(), serialNumber: z.string().optional(), model: z.string().optional(), location: z.string().optional(), ipAddress: z.string().optional() }).parse(request.body);
  const item = await BiometricDevice.create(input); await audit(request, 'BIOMETRIC_DEVICE_CREATED', 'BiometricDevice', item._id, { ...input, ipAddress: input.ipAddress ? '[REDACTED]' : undefined }); ok(response, item, undefined, 201);
}));
biometricRouter.post('/mappings', asyncHandler(async (request, response) => {
  const input = z.object({ employee: z.string(), device: z.string(), deviceUserId: z.string() }).parse(request.body);
  const item = await EmployeeBiometricMapping.create(input); await audit(request, 'BIOMETRIC_MAPPING_CREATED', 'EmployeeBiometricMapping', item._id, input); ok(response, item, undefined, 201);
}));
biometricRouter.get('/punches', asyncHandler(async (_request, response) => ok(response, await BiometricPunch.find().select('-rawPayload').sort({ punchTimestamp: -1 }).limit(200))));
biometricRouter.post('/simulator/import', asyncHandler(async (request, response) => {
  if (env.NODE_ENV === 'production' || !env.ENABLE_BIOMETRIC_SIMULATOR) throw new ApiError(404, 'Simulator is disabled', 'NOT_FOUND');
  const input = z.object({ device: z.string(), punches: z.array(z.object({ deviceUserId: z.string(), timestamp: z.coerce.date(), punchType: z.string().optional(), punchId: z.string().optional() })).min(1).max(1000) }).parse(request.body);
  const punches = await ingestPunches(input.device, input.punches.map((item) => ({ ...item, raw: { simulated: true, ...item } })), 'SIMULATOR');
  const processed = await processPendingPunches(); await audit(request, 'BIOMETRIC_SIMULATION_IMPORTED', 'BiometricDevice', input.device, { received: input.punches.length, processed }); ok(response, { received: input.punches.length, unique: punches.length, processed }, undefined, 201);
}));
