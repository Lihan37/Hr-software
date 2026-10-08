import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { hashPassword, issueAccessToken, verifyAccessToken, verifyPassword } from '../src/modules/auth/auth.service.js';
import { hasPermission } from '../src/modules/auth/permissions.js';

describe('authentication and authorization', () => {
  it('hashes passwords and never accepts the wrong value', async () => {
    const hash = await hashPassword('a-secure-demo-password');
    expect(hash).not.toContain('a-secure-demo-password');
    await expect(verifyPassword('a-secure-demo-password', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('issues verifiable access claims', () => {
    const token = issueAccessToken('507f1f77bcf86cd799439011', 'EMPLOYEE', '507f191e810c19729de860ea');
    expect(verifyAccessToken(token)).toMatchObject({ sub: '507f1f77bcf86cd799439011', role: 'EMPLOYEE', type: 'access' });
  });

  it('keeps employee permissions isolated from HR administration', () => {
    expect(hasPermission('EMPLOYEE', 'employee:read:self')).toBe(true);
    expect(hasPermission('EMPLOYEE', 'employee:read:any')).toBe(false);
    expect(hasPermission('MANAGER', 'leave:review:manager')).toBe(true);
    expect(hasPermission('MANAGER', 'leave:review:hr')).toBe(false);
  });

  it('rejects protected requests without authentication', async () => {
    const response = await request(app).get('/api/v1/dashboard');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});
