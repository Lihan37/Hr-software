export interface DevicePunch { deviceUserId: string; timestamp: Date; punchType?: string; punchId?: string; raw: unknown }
export interface BiometricProvider {
  syncUsers(): Promise<void>;
  fetchPunches(since?: Date): Promise<DevicePunch[]>;
  testConnection(): Promise<boolean>;
  getDeviceInfo(): Promise<Record<string, unknown>>;
}

export class ZKTecoProvider implements BiometricProvider {
  async syncUsers(): Promise<void> { throw new Error('ZKTeco hardware integration is not configured'); }
  async fetchPunches(): Promise<DevicePunch[]> { throw new Error('ZKTeco hardware integration is not configured'); }
  async testConnection(): Promise<boolean> { return false; }
  async getDeviceInfo(): Promise<Record<string, unknown>> { return { provider: 'ZKTECO', configured: false }; }
}
