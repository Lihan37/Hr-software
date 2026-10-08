import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import type { AuthClaims, Role } from '../../types/auth.js';

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function issueAccessToken(userId: string, role: Role, employeeId?: string): string {
  const claims: AuthClaims = { sub: userId, role, employeeId, type: 'access' };
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): AuthClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthClaims;
}

export function issueRefreshToken(): string { return randomBytes(48).toString('base64url'); }
export function refreshExpiry(): Date { return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000); }
