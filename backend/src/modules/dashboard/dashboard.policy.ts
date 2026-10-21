import { z } from "zod";
import type { AuthClaims } from "../../types/auth.js";
import { ApiError } from "../../utils/api-error.js";

export const dashboardFilters = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (value) =>
        !Number.isNaN(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value,
    )
    .optional(),
  department: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),
  branch: z.string().max(120).optional(),
  businessUnit: z.string().max(120).optional(),
  employeeType: z.enum(["LOCAL", "EXPAT"]).optional(),
  employmentStatus: z
    .enum([
      "ACTIVE",
      "INACTIVE",
      "SUSPENDED",
      "RESIGNED",
      "TERMINATED",
      "SEPARATED",
    ])
    .optional(),
  period: z.coerce
    .number()
    .pipe(z.union([z.literal(7), z.literal(30)]))
    .default(7),
});
export type DashboardFilters = z.infer<typeof dashboardFilters>;

export function dashboardScope(auth: AuthClaims): Record<string, unknown> {
  if (["SUPER_ADMIN", "HR_ADMIN", "HR"].includes(auth.role)) return {};
  if (!auth.employeeId)
    throw new ApiError(
      403,
      "An employee profile must be linked to view the dashboard",
      "PROFILE_NOT_LINKED",
    );
  if (auth.role === "MANAGER")
    return {
      $or: [
        { _id: auth.employeeId },
        { "employment.reportingManager": auth.employeeId },
        { "employment.reviewer": auth.employeeId },
      ],
    };
  return { _id: auth.employeeId };
}

export function businessDate(now: Date, timezone = "Asia/Dhaka") {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}-${parts.find((p) => p.type === "day")!.value}`;
}
export function dayKey(date: string) {
  return new Date(`${date}T00:00:00Z`);
}
export function shiftDay(date: string, days: number) {
  return new Date(dayKey(date).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}
export function instantAtMidnight(date: string, timezone: string) {
  const target = dayKey(date).getTime();
  let candidate = target;
  for (let i = 0; i < 3; i++) {
    const p = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const part = (type: string) =>
      Number(p.find((item) => item.type === type)!.value);
    const represented = Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
      part("second"),
    );
    candidate += target - represented;
  }
  return new Date(candidate);
}

export const attendanceStates = [
  "PRESENT",
  "ABSENT",
  "APPROVED_LEAVE",
  "WEEKLY_HOLIDAY",
  "WORKED_WEEKLY_HOLIDAY",
  "MISSING_PUNCH",
  "PUBLIC_HOLIDAY",
  "PENDING",
] as const;
export type AttendanceState = (typeof attendanceStates)[number];
export interface DayAttendance {
  status: string;
  checkIn?: unknown;
  checkOut?: unknown;
  workedMinutes?: number;
  lateMinutes?: number;
  scheduledEnd?: Date | string | null;
}
// Absent has no authoritative finalization/cutoff field in this HRMS. Treat it as pending.
// Complete punches win over leave and raise a separate conflict indicator.
export function classifyAttendance(
  record: DayAttendance | undefined,
  approvedLeave: boolean,
  weeklyHoliday: boolean,
): AttendanceState {
  const worked = !!record?.checkIn && !!record?.checkOut;
  const holiday =
    weeklyHoliday ||
    ["WEEKLY_OFF", "WEEKLY_HOLIDAY", "WORKED_WEEKLY_HOLIDAY"].includes(
      record?.status ?? "",
    );
  if (holiday && worked) return "WORKED_WEEKLY_HOLIDAY";
  if (record?.checkIn || record?.checkOut || record?.status === "MISSING_PUNCH")
    return worked ? "PRESENT" : "MISSING_PUNCH";
  if (
    approvedLeave ||
    ["LEAVE", "APPROVED_LEAVE"].includes(record?.status ?? "")
  )
    return "APPROVED_LEAVE";
  if (holiday) return "WEEKLY_HOLIDAY";
  if (record?.status === "PUBLIC_HOLIDAY") return "PUBLIC_HOLIDAY";
  if (record?.status === "PRESENT") return "PRESENT";
  return "PENDING";
}

export function employmentLabel(employment: {
  employmentType?: string | null;
  employeeType?: string | null;
}) {
  if (employment.employmentType) return employment.employmentType;
  if (employment.employeeType === "PROBATIONARY") return "PROBATION";
  return ["PERMANENT", "CONTRACTUAL", "TRAINEE"].includes(
    employment.employeeType ?? "",
  )
    ? employment.employeeType!
    : "UNASSIGNED";
}
