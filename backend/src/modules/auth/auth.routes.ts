import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ApiError } from '../../utils/api-error.js';
import { ok } from '../../utils/api-response.js';
import { User, RefreshToken } from '../users/user.model.js';
import { hashToken, issueAccessToken, issueRefreshToken, refreshExpiry, verifyPassword } from './auth.service.js';

export const authRouter = Router();
authRouter.use(rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));

const loginSchema = z.object({ email: z.email().transform((value) => value.toLowerCase()), password: z.string().min(8).max(128) });

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  };
}

function setCookies(response: any, accessToken: string, refreshToken: string) {
  const common = cookieOptions();
  response.cookie('accessToken', accessToken, { ...common, maxAge: 15 * 60_000 });
  response.cookie('refreshToken', refreshToken, { ...common, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000 });
}

authRouter.post('/login', asyncHandler(async (request, response) => {
  const input = loginSchema.parse(request.body);
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user || user.status !== 'ACTIVE' || !await verifyPassword(input.password, user.passwordHash)) {
    throw new ApiError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS');
  }
  const employeeId = user.employee?.toString();
  const accessToken = issueAccessToken(user.id, user.role as any, employeeId);
  const refreshToken = issueRefreshToken();
  await RefreshToken.create({ user: user._id, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiry(), userAgent: request.get('user-agent'), ip: request.ip });
  user.lastLoginAt = new Date(); await user.save();
  setCookies(response, accessToken, refreshToken);
  ok(response, { user: { id: user.id, email: user.email, role: user.role, employee: user.employee } });
}));

authRouter.post('/refresh', asyncHandler(async (request, response) => {
  const current = request.cookies?.refreshToken;
  if (!current) throw new ApiError(401, 'Refresh token required', 'UNAUTHENTICATED');
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(current), revokedAt: null, expiresAt: { $gt: new Date() } }).populate('user');
  const user: any = stored?.user;
  if (!stored || !user || user.status !== 'ACTIVE') throw new ApiError(401, 'Refresh token is invalid', 'INVALID_TOKEN');
  const next = issueRefreshToken();
  stored.revokedAt = new Date(); stored.replacedByHash = hashToken(next); await stored.save();
  await RefreshToken.create({ user: user._id, tokenHash: hashToken(next), expiresAt: refreshExpiry(), userAgent: request.get('user-agent'), ip: request.ip });
  const access = issueAccessToken(user.id, user.role, user.employee?.toString());
  setCookies(response, access, next);
  ok(response, { refreshed: true });
}));

authRouter.post('/logout', asyncHandler(async (request, response) => {
  const current = request.cookies?.refreshToken;
  if (current) await RefreshToken.updateOne({ tokenHash: hashToken(current) }, { revokedAt: new Date() });
  response.clearCookie('accessToken', cookieOptions()); response.clearCookie('refreshToken', cookieOptions());
  response.status(204).send();
}));

authRouter.get('/me', authenticate, asyncHandler(async (request, response) => {
  const user = await User.findById(request.auth!.sub).select('email role employee status').populate('employee', 'employeeId fullName profilePhoto employment.designation');
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');
  ok(response, user);
}));
