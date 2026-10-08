export interface AttendancePolicy {
  graceMinutes: number;
  overtimeAfterMinutes: number;
  allowOvernightShift: boolean;
}

export const defaultAttendancePolicy: AttendancePolicy = {
  graceMinutes: 0,
  overtimeAfterMinutes: 0,
  allowOvernightShift: true
};

export function calculateAttendance(input: { scheduledStart?: Date; scheduledEnd?: Date; checkIn?: Date; checkOut?: Date }, policy = defaultAttendancePolicy) {
  const lateMinutes = input.scheduledStart && input.checkIn
    ? Math.max(0, Math.floor((input.checkIn.getTime() - input.scheduledStart.getTime()) / 60_000) - policy.graceMinutes) : 0;
  const earlyDepartureMinutes = input.scheduledEnd && input.checkOut
    ? Math.max(0, Math.floor((input.scheduledEnd.getTime() - input.checkOut.getTime()) / 60_000)) : 0;
  const workedMinutes = input.checkIn && input.checkOut
    ? Math.max(0, Math.floor((input.checkOut.getTime() - input.checkIn.getTime()) / 60_000)) : 0;
  const scheduledMinutes = input.scheduledStart && input.scheduledEnd
    ? Math.max(0, Math.floor((input.scheduledEnd.getTime() - input.scheduledStart.getTime()) / 60_000)) : 0;
  const overtimeMinutes = Math.max(0, workedMinutes - scheduledMinutes - policy.overtimeAfterMinutes);
  const status = input.checkIn && input.checkOut ? 'PRESENT' : input.checkIn || input.checkOut ? 'MISSING_PUNCH' : 'ABSENT';
  return { lateMinutes, earlyDepartureMinutes, workedMinutes, overtimeMinutes, status };
}

export function utcDay(value: Date | string): Date {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
