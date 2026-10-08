import { describe, expect, it } from 'vitest';
import { punchKey } from '../src/modules/biometric/biometric.service.js';

describe('biometric import idempotency', () => {
  it('produces the same key for the same device punch', () => {
    const punch = { deviceUserId: '101', timestamp: new Date('2026-09-01T07:58:00Z'), punchId: 'abc', raw: {} };
    expect(punchKey('device-1', punch)).toBe(punchKey('device-1', punch));
    expect(punchKey('device-1', punch)).not.toBe(punchKey('device-2', punch));
  });
});
