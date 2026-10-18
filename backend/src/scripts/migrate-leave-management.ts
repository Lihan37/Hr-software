import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { LeavePolicy, LeaveType } from '../modules/leave/leave.model.js';
import { OFFICIAL_ENTITLEMENTS } from '../modules/leave/leave.policy.js';

const apply = process.argv.includes('--apply');
await connectDatabase();
const current = await LeaveType.find({ code: { $in: Object.keys(OFFICIAL_ENTITLEMENTS) } }).select('code name defaultEntitlement entitlementMode active allowHalfDay').lean();
const plan = Object.entries(OFFICIAL_ENTITLEMENTS).map(([code, entitlement]) => ({ code, entitlement, mode: code === 'CH' ? 'EARNED' : 'ANNUAL', current: current.find((item) => item.code === code) ?? null }));
if (apply) {
  const names: Record<string, string> = { CL: 'Casual Leave', SL: 'Sick Leave', AL: 'Annual Leave', CH: 'Compensatory Holiday' };
  for (const item of plan) await LeaveType.findOneAndUpdate({ code: item.code }, { $set: { name: names[item.code], defaultEntitlement: item.entitlement, entitlementMode: item.mode, allowHalfDay: false, active: true, paid: true } }, { upsert: true, new: true, runValidators: true });
  await LeavePolicy.findOneAndUpdate({ key: 'DEFAULT' }, { $setOnInsert: { key: 'DEFAULT', leaveDayCountingMode: 'UNCONFIGURED', probationAccrual: { enabled: false, mode: 'UNCONFIGURED', applicableLeaveCodes: [], rounding: 'UNCONFIGURED' }, weeklyCycle: { basis: 'UNCONFIGURED' }, chQualification: { enabled: false, minimumWorkedMinutes: null, requiresPriorAuthorization: true, availableDuringProbation: false } } }, { upsert: true });
}
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', plan, note: 'No employee balance, request, attendance, or biometric record is changed.' }, null, 2));
await disconnectDatabase();
