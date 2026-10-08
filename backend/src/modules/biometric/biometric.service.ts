import { createHash } from 'node:crypto';
import { Attendance } from '../attendance/attendance.model.js';
import { calculateAttendance, utcDay } from '../attendance/attendance.policy.js';
import { BiometricPunch, EmployeeBiometricMapping } from './biometric.model.js';
import type { DevicePunch } from './biometric.provider.js';

export function punchKey(deviceId: string, punch: DevicePunch): string {
  return createHash('sha256').update([deviceId, punch.deviceUserId, punch.timestamp.toISOString(), punch.punchId ?? '', punch.punchType ?? ''].join('|')).digest('hex');
}

export async function ingestPunches(deviceId: string, punches: DevicePunch[], source: 'ZKTECO' | 'SIMULATOR') {
  const results = [];
  for (const punch of punches) {
    const mapping = await EmployeeBiometricMapping.findOne({ device: deviceId, deviceUserId: punch.deviceUserId, active: true });
    const idempotencyKey = punchKey(deviceId, punch);
    const document = await BiometricPunch.findOneAndUpdate(
      { idempotencyKey },
      { $setOnInsert: { employee: mapping?.employee ?? null, deviceUserId: punch.deviceUserId, device: deviceId, punchTimestamp: punch.timestamp, punchType: punch.punchType, providerPunchId: punch.punchId, source, rawPayload: punch.raw, importedAt: new Date(), processingStatus: mapping ? 'PENDING' : 'UNRESOLVED', idempotencyKey } },
      { upsert: true, new: true }
    );
    results.push(document);
  }
  return results;
}

export async function processPendingPunches(): Promise<number> {
  const pending = await BiometricPunch.find({ processingStatus: 'PENDING', employee: { $ne: null } }).sort({ punchTimestamp: 1 });
  const groups = new Map<string, typeof pending>();
  for (const punch of pending) {
    const key = `${punch.employee!.toString()}|${utcDay(punch.punchTimestamp).toISOString()}`;
    groups.set(key, [...(groups.get(key) ?? []), punch]);
  }
  for (const punches of groups.values()) {
    const all = await BiometricPunch.find({ employee: punches[0]!.employee, punchTimestamp: { $gte: utcDay(punches[0]!.punchTimestamp), $lt: new Date(utcDay(punches[0]!.punchTimestamp).getTime() + 86_400_000) } }).sort({ punchTimestamp: 1 });
    const checkIn = all[0]?.punchTimestamp; const checkOut = all.length > 1 ? all.at(-1)?.punchTimestamp : undefined;
    const existing = await Attendance.findOne({ employee: punches[0]!.employee, date: utcDay(punches[0]!.punchTimestamp) });
    const calculations = calculateAttendance({ checkIn, checkOut, scheduledStart: existing?.scheduledStart ?? undefined, scheduledEnd: existing?.scheduledEnd ?? undefined });
    await Attendance.findOneAndUpdate(
      { employee: punches[0]!.employee, date: utcDay(punches[0]!.punchTimestamp) },
      { $set: { checkIn, checkOut, source: 'BIOMETRIC', ...calculations }, $addToSet: { rawPunches: { $each: all.map((item) => item._id) } } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await BiometricPunch.updateMany({ _id: { $in: punches.map((item) => item._id) } }, { processingStatus: 'PROCESSED' });
  }
  return pending.length;
}
