import type { RequestHandler } from 'express';
import type { Permission, Role } from '../types/auth.js';
import { verifyAccessToken } from '../modules/auth/auth.service.js';
import { hasPermission } from '../modules/auth/permissions.js';
import { ApiError } from '../utils/api-error.js';

export const authenticate: RequestHandler = (request, _response, next) => {
  const bearer = request.header('authorization')?.replace(/^Bearer\s+/i, '');
  const token = request.cookies?.accessToken ?? bearer;
  if (!token) return next(new ApiError(401, 'Authentication required', 'UNAUTHENTICATED'));
  try {
    const claims = verifyAccessToken(token);
    if (claims.type !== 'access') throw new Error('Wrong token type');
    request.auth = claims;
    next();
  } catch {
    next(new ApiError(401, 'Access token is invalid or expired', 'INVALID_TOKEN'));
  }
};

export const allowRoles = (...roles: Role[]): RequestHandler => (request, _response, next) => {
  if (!request.auth || !roles.includes(request.auth.role)) return next(new ApiError(403, 'Insufficient role', 'FORBIDDEN'));
  next();
};

export const requirePermission = (permission: Permission): RequestHandler => (request, _response, next) => {
  if (!request.auth || !hasPermission(request.auth.role, permission)) return next(new ApiError(403, 'Permission denied', 'FORBIDDEN'));
  next();
};
