import type { AuthClaims } from "../../types/auth.js";
import { Types } from "mongoose";
import { hasPermission } from "../auth/permissions.js";
import { Employee } from "../employees/employee.model.js";
import { Attendance } from "../attendance/attendance.model.js";
import { AttendanceCorrection } from "../attendance-corrections/attendance-correction.model.js";
import { HrPolicy } from "../employee-lifecycle/lifecycle.model.js";
import {
  CompensatoryHolidayCredit,
  LeaveLedgerEntry,
  LeavePolicy,
  LeaveRequest,
  LeaveType,
  WeeklyHolidaySchedule,
} from "../leave/leave.model.js";
import { Department } from "../organization/organization.model.js";
import { AuditLog } from "../audit/audit.model.js";
import {
  BiometricDevice,
  BiometricPunch,
} from "../biometric/biometric.model.js";
import {
  attendanceStates,
  businessDate,
  classifyAttendance,
  dashboardScope,
  dayKey,
  employmentLabel,
  instantAtMidnight,
  shiftDay,
  type DashboardFilters,
} from "./dashboard.policy.js";

export interface DashboardRecord {
  id: string;
  employee: string;
  employeeId: string;
  department: string;
  detail: string;
  date?: string;
  status: string;
  href: string;
}
const pendingStages = ["PENDING_MANAGER", "PENDING_HOD", "PENDING_HR"];

export async function getDashboard(
  auth: AuthClaims,
  filters: DashboardFilters,
  now = new Date(),
) {
  const scope = dashboardScope(auth);
  const aggregateScope =
    auth.employeeId && !hasPermission(auth.role, "employee:read:any")
      ? dashboardScope({
          ...auth,
          employeeId: new Types.ObjectId(auth.employeeId) as unknown as string,
        })
      : scope;
  const hr = hasPermission(auth.role, "employee:read:any");
  const self = auth.role === "EMPLOYEE";
  const policy = await HrPolicy.findOne({ key: "DEFAULT" })
    .select("timezone")
    .lean();
  const timezone = policy?.timezone ?? "Asia/Dhaka";
  const date = filters.date ?? businessDate(now, timezone);
  const key = dayKey(date);
  const nextKey = dayKey(shiftDay(date, 1));
  const month = date.slice(0, 7);
  const monthStart = dayKey(`${month}-01`);
  const monthInstant = instantAtMidnight(`${month}-01`, timezone);
  const endInstant = instantAtMidnight(shiftDay(date, 1), timezone);
  const startTrend = dayKey(shiftDay(date, 1 - filters.period));
  const warnings: string[] = [];
  // Minimal projection, bounded to caller's employee scope. No personal, bank or identity fields.
  const [options, fetchedEmployees, departments] = await Promise.all([
    Employee.aggregate([
      { $match: aggregateScope },
      {
        $group: {
          _id: null,
          departments: { $addToSet: "$employment.department" },
          branches: { $addToSet: "$employment.branch" },
          businessUnits: { $addToSet: "$employment.businessUnit" },
        },
      },
    ]),
    Employee.find({
      $and: [
        scope,
        ...(filters.department
          ? [{ "employment.department": filters.department }]
          : []),
        ...(filters.branch ? [{ "employment.branch": filters.branch }] : []),
        ...(filters.businessUnit
          ? [{ "employment.businessUnit": filters.businessUnit }]
          : []),
        ...(filters.employeeType
          ? [{ "employment.workforceType": filters.employeeType }]
          : []),
        ...(filters.employmentStatus
          ? [{ "employment.status": filters.employmentStatus }]
          : []),
      ],
    })
      .select(
        "employeeId fullName employment.department employment.status employment.employmentType employment.employeeType employment.workforceType employment.joiningDate employment.confirmationDate employment.probationEndDate employment.probationEvaluationStatus employment.reviewer employment.reportingManager employment.branch employment.businessUnit employment.resignationDate employment.terminationDate",
      )
      .lean(),
    Department.find().select("name").lean(),
  ]);
  const employees = fetchedEmployees.filter(
    (e): e is typeof e & { employment: NonNullable<typeof e.employment> } =>
      !!e.employment,
  );
  const departmentNames = new Map(
    departments.map((d) => [String(d._id), d.name]),
  );
  const ids = employees.map((e) => e._id);
  const active = employees.filter(
    (e) =>
      e.employment?.status === "ACTIVE" &&
      (!e.employment.joiningDate || e.employment.joiningDate < nextKey),
  );
  const activeIds = new Set(active.map((e) => String(e._id)));
  const currentPeople = new Map(employees.map((e) => [String(e._id), e]));
  const safe = async <T>(
    name: string,
    query: PromiseLike<T>,
  ): Promise<T | null> => {
    try {
      return await query;
    } catch {
      warnings.push(`${name} is unavailable. Refresh to retry.`);
      return null;
    }
  };
  const [
    attendance,
    leaves,
    corrections,
    holidays,
    credits,
    ledger,
    leaveTypes,
    leavePolicy,
    punchHealth,
    devices,
    activities,
  ] = await Promise.all([
    Attendance.find({
      employee: { $in: ids },
      date: { $gte: startTrend, $lte: key },
    })
      .select(
        "employee date status checkIn checkOut lateMinutes workedMinutes updatedAt",
      )
      .lean(),
    LeaveRequest.find({
      employee: { $in: ids },
      $or: [
        { status: { $in: pendingStages } },
        {
          status: "APPROVED",
          startDate: { $lte: dayKey(shiftDay(date, 30)) },
          endDate: { $gte: startTrend },
        },
        { createdAt: { $gte: monthInstant, $lt: endInstant } },
      ],
    })
      .select(
        "employee leaveType status startDate endDate requestedDays createdAt",
      )
      .lean(),
    AttendanceCorrection.find({
      employee: { $in: ids },
      status: { $in: pendingStages },
    })
      .select("employee status attendance submittedAt")
      .lean(),
    WeeklyHolidaySchedule.find({
      employee: { $in: ids },
      active: true,
      date: { $gte: startTrend, $lte: key },
    })
      .select("employee date")
      .lean(),
    safe(
      "CH verification",
      CompensatoryHolidayCredit.find({
        employee: { $in: ids },
        $or: [
          { holidayDate: { $gte: monthStart, $lte: key } },
          { status: { $in: ["PENDING_POLICY", "HR_RESOLUTION_REQUIRED"] } },
        ],
      })
        .select("employee holidayDate status")
        .lean(),
    ),
    safe(
      "Leave usage",
      LeaveLedgerEntry.aggregate([
        {
          $match: {
            employee: { $in: ids },
            effectiveAt: { $gte: monthInstant, $lt: endInstant },
            type: {
              $in: [
                "USAGE",
                "LEAVE_DEDUCTION",
                "LEAVE_REVERSAL",
                "CH_CREDIT",
                "CH_REVERSAL",
              ],
            },
          },
        },
        {
          $group: {
            _id: { type: "$type", leaveType: "$leaveType" },
            amount: { $sum: "$amount" },
          },
        },
      ]),
    ),
    LeaveType.find().select("name code").lean(),
    safe(
      "Leave policy",
      LeavePolicy.findOne({ key: "DEFAULT" })
        .select("chQualification.enabled leaveDayCountingMode")
        .lean(),
    ),
    safe(
      "Attendance processing",
      BiometricPunch.aggregate([
        {
          $match: {
            employee: { $in: ids },
            punchTimestamp: {
              $gte: instantAtMidnight(date, timezone),
              $lt: endInstant,
            },
          },
        },
        { $group: { _id: "$processingStatus", count: { $sum: 1 } } },
      ]),
    ),
    hasPermission(auth.role, "biometric:manage")
      ? safe(
          "Biometric devices",
          BiometricDevice.find().select("name model status lastSyncAt").lean(),
        )
      : null,
    hr && hasPermission(auth.role, "audit:read")
      ? safe(
          "Recent activity",
          AuditLog.find({
            entityType: "Employee",
            entityId: { $in: ids },
            timestamp: { $gte: monthInstant, $lt: endInstant },
          })
            .select("action entityId timestamp")
            .sort({ timestamp: -1 })
            .limit(8)
            .lean(),
        )
      : null,
  ]);
  const records: Record<string, DashboardRecord[]> = {};
  const record = (
    employee: any,
    status: string,
    detail = "",
    recordDate?: string,
  ): DashboardRecord => ({
    id: String(employee._id),
    employee: employee.fullName,
    employeeId: employee.employeeId,
    department:
      departmentNames.get(String(employee.employment.department)) ??
      "Unassigned",
    detail,
    date: recordDate,
    status,
    href: self ? "/profile" : hr || String(employee._id) === auth.employeeId || String(employee.employment.reportingManager) === auth.employeeId ? `/employees/${employee._id}` : '',
  });
  for (const e of employees) {
    const type = employmentLabel(e.employment);
    if (activeIds.has(String(e._id))) {
      (records.active ??= []).push(record(e, e.employment.status, type));
      if (type === "PROBATION")
        (records.probation ??= []).push(
          record(
            e,
            type,
            e.employment.probationEvaluationStatus === "COMPLETED"
              ? "Review completed"
              : "Confirmation review",
            e.employment.probationEndDate?.toISOString().slice(0, 10),
          ),
        );
      if (
        type === "PERMANENT" &&
        e.employment.confirmationDate &&
        e.employment.confirmationDate < nextKey
      )
        (records.confirmed ??= []).push(
          record(
            e,
            type,
            "Confirmed",
            e.employment.confirmationDate.toISOString().slice(0, 10),
          ),
        );
      if (!e.employment.reviewer)
        (records.missingHod ??= []).push(
          record(e, "UNASSIGNED", "Assign a Reviewer / HOD"),
        );
    }
    if (
      e.employment.joiningDate >= monthStart &&
      e.employment.joiningDate < nextKey
    )
      (records.joiners ??= []).push(
        record(
          e,
          e.employment.status,
          "Joined this month",
          e.employment.joiningDate.toISOString().slice(0, 10),
        ),
      );
  }
  const stateCounts = Object.fromEntries(
    attendanceStates.map((s) => [s, 0]),
  ) as Record<(typeof attendanceStates)[number], number>;
  const departmentRows = new Map<
    string,
    {
      id: string;
      name: string;
      active: number;
      present: number;
      approvedLeave: number;
      weeklyHoliday: number;
      unknown: number;
    }
  >();
  const dayAttendance = new Map(
    attendance
      .filter((a) => a.date.getTime() === key.getTime())
      .map((a) => [String(a.employee), a]),
  );
  const dayHolidays = new Set(
    holidays
      .filter((h) => h.date.getTime() === key.getTime())
      .map((h) => String(h.employee)),
  );
  const leavePeople = new Set(
    leaves
      .filter(
        (l) =>
          l.status === "APPROVED" && l.startDate < nextKey && l.endDate >= key,
      )
      .map((l) => String(l.employee)),
  );
  let late = 0;
  let conflicts = 0;
  let recordedAbsences = 0;
  for (const e of active) {
    const id = String(e._id);
    const a = dayAttendance.get(id);
    const state = classifyAttendance(
      a,
      leavePeople.has(id),
      dayHolidays.has(id),
    );
    stateCounts[state]++;
    (records[state] ??= []).push(
      record(
        e,
        state,
        a?.status === "ABSENT"
          ? "Recorded absent; final processing cutoff is unavailable"
          : "",
        date,
      ),
    );
    if ((a?.lateMinutes ?? 0) > 0) {
      late++;
      (records.late ??= []).push(
        record(e, state, `${a!.lateMinutes} minutes late`, date),
      );
    }
    if (a?.status === "ABSENT") recordedAbsences++;
    if (leavePeople.has(id) && (a?.checkIn || a?.checkOut)) {
      conflicts++;
      (records.conflicts ??= []).push(
        record(e, "CONFLICT", "Approved leave and attendance evidence", date),
      );
    }
    const department = String(e.employment.department);
    const row = departmentRows.get(department) ?? {
      id: department,
      name: departmentNames.get(department) ?? "Unassigned",
      active: 0,
      present: 0,
      approvedLeave: 0,
      weeklyHoliday: 0,
      unknown: 0,
    };
    row.active++;
    if (["PRESENT", "WORKED_WEEKLY_HOLIDAY"].includes(state)) row.present++;
    if (state === "APPROVED_LEAVE") row.approvedLeave++;
    if (["WEEKLY_HOLIDAY", "WORKED_WEEKLY_HOLIDAY"].includes(state))
      row.weeklyHoliday++;
    if (["PENDING", "MISSING_PUNCH"].includes(state)) row.unknown++;
    departmentRows.set(department, row);
  }
  // Historical observed records, not historical headcount. Absent records remain explicit and labelled.
  const trend = Array.from({ length: filters.period }, (_, index) => ({
    date: shiftDay(date, index + 1 - filters.period),
    present: 0,
    missing: 0,
    recordedAbsent: 0,
  }));
  const trendMap = new Map(trend.map((row) => [row.date, row]));
  for (const a of attendance) {
    const row = trendMap.get(a.date.toISOString().slice(0, 10));
    if (!row) continue;
    if ((a.checkIn && a.checkOut) || a.status === "PRESENT") row.present++;
    else if (a.checkIn || a.checkOut || a.status === "MISSING_PUNCH")
      row.missing++;
    else if (a.status === "ABSENT") row.recordedAbsent++;
  }
  const toRequest = (request: any, detail: string) => {
    const e = currentPeople.get(String(request.employee));
    return e
      ? {
          ...record(
            e,
            request.status,
            `${detail} · ${request.startDate?.toISOString().slice(0,10)} to ${request.endDate?.toISOString().slice(0,10)}`,
            request.startDate?.toISOString().slice(0, 10),
          ),
          id: String(request._id),
          href: "/approvals",
        }
      : null;
  };
  const pendingHod = leaves.filter((l) =>
    ["PENDING_HOD", "PENDING_MANAGER"].includes(l.status),
  );
  const pendingHr = leaves.filter((l) => l.status === "PENDING_HR");
  const types = new Map(leaveTypes.map((t) => [String(t._id), t.code]));
  records.hod = pendingHod
    .map((r) =>
      toRequest(
        r,
        `${types.get(String(r.leaveType)) ?? "Leave"} · ${r.requestedDays} days`,
      )!,
    )
    .filter(Boolean);
  records.hr = pendingHr
    .map((r) =>
      toRequest(
        r,
        `${types.get(String(r.leaveType)) ?? "Leave"} · ${r.requestedDays} days`,
      )!,
    )
    .filter(Boolean);
  records.corrections = corrections
    .map((c) => {
      const e = currentPeople.get(String(c.employee));
      return e
        ? {
            ...record(e, c.status, "Attendance correction"),
            id: String(c._id),
            href: "/approvals",
          }
        : null;
    })
    .filter((r): r is DashboardRecord => !!r);
  const probation = (records.probation ?? []).sort((a, b) =>
    (a.date ?? "9999").localeCompare(b.date ?? "9999"),
  );
  records.upcoming = probation.filter(
    (r) =>
      r.detail !== "Review completed" &&
      r.date &&
      r.date >= date &&
      r.date <= shiftDay(date, 30),
  );
  records.overdue = probation.filter(
    (r) => r.detail !== "Review completed" && r.date && r.date < date,
  );
  records.chPending = (credits ?? [])
    .filter((c) => c.status === "PENDING_POLICY")
    .map((c) => {
      const e = currentPeople.get(String(c.employee))!;
      return {
        ...record(
          e,
          c.status,
          "CH eligibility pending",
          c.holidayDate.toISOString().slice(0, 10),
        ),
        id: String(c._id),
        href: "/leave",
      };
    });
  records.chExceptions = (credits ?? [])
    .filter((c) => c.status === "HR_RESOLUTION_REQUIRED")
    .map((c) => {
      const e = currentPeople.get(String(c.employee))!;
      return {
        ...record(
          e,
          c.status,
          "CH requires HR resolution",
          c.holidayDate.toISOString().slice(0, 10),
        ),
        id: String(c._id),
        href: "/leave",
      };
    });
  records.present = [
    ...(records.PRESENT ?? []),
    ...(records.WORKED_WEEKLY_HOLIDAY ?? []),
  ];
  records.approvedLeave = active
    .filter(
      (e) =>
        leavePeople.has(String(e._id)) ||
        ["LEAVE", "APPROVED_LEAVE"].includes(
          dayAttendance.get(String(e._id))?.status ?? "",
        ),
    )
    .map((e) =>
      record(
        e,
        "APPROVED_LEAVE",
        "Approved request or effective attendance leave",
        date,
      ),
    );
  records.actions = [
    ...records.hr,
    ...records.hod,
    ...records.corrections,
    ...records.overdue,
    ...(records.conflicts ?? []),
    ...records.chExceptions,
  ];
  const usage = leaveTypes
    .filter((t) => ["CL", "SL", "AL", "CH"].includes(t.code))
    .map((t) => ({
      code: t.code,
      used:
        ledger === null
          ? null
          : -ledger
              .filter(
                (r: any) =>
                  String(r._id.leaveType) === String(t._id) &&
                  ["USAGE", "LEAVE_DEDUCTION", "LEAVE_REVERSAL"].includes(
                    r._id.type,
                  ),
              )
              .reduce((s: number, r: any) => s + r.amount, 0) || 0,
      requests: leaves.filter(
        (l) =>
          String(l.leaveType) === String(t._id) &&
          l.createdAt >= monthInstant &&
          l.createdAt < endInstant,
      ).length,
    }));
  const sumLedger = (type: string) =>
    ledger === null
      ? null
      : ledger
          .filter((r: any) => r._id.type === type)
          .reduce((s: number, r: any) => s + r.amount, 0);
  const distribution = (field: "branch" | "businessUnit" | "workforceType") => {
    const map = new Map<string, number>();
    for (const e of active) {
      const label = e.employment[field] || "Unassigned";
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };
  const statusMap = new Map<string, number>();
  for (const e of active) {
    const type = employmentLabel(e.employment);
    statusMap.set(type, (statusMap.get(type) ?? 0) + 1);
  }
  const joiners = Array.from({ length: 6 }, (_, i) => {
    const key = new Date(
      Date.UTC(
        monthStart.getUTCFullYear(),
        monthStart.getUTCMonth() - 5 + i,
        1,
      ),
    )
      .toISOString()
      .slice(0, 7);
    return {
      month: key,
      count: employees.filter(
        (e) =>
          e.employment.joiningDate?.toISOString().startsWith(key) &&
          e.employment.joiningDate < nextKey,
      ).length,
    };
  });
  const actionDefinitions = self
    ? []
    : [
        [
          "hr",
          "Final HR leave review",
          "Awaiting final approval",
          "/approvals",
        ],
        ["hod", "HOD leave review", "Awaiting assigned HOD", "/approvals"],
        [
          "corrections",
          "Attendance corrections",
          "Pending decisions",
          "/approvals",
        ],
        [
          "MISSING_PUNCH",
          "Missing attendance punches",
          "Incomplete daily evidence",
          "/attendance",
        ],
        [
          "overdue",
          "Overdue probation reviews",
          "Stored review date has passed",
          "/employees/probation-evaluations",
        ],
        [
          "upcoming",
          "Upcoming confirmations",
          "Stored review date within 30 days",
          "/employees/probation-evaluations",
        ],
        [
          "missingHod",
          "Unassigned HOD",
          "Active employee records",
          "/employees",
        ],
        [
          "conflicts",
          "Leave / attendance conflicts",
          "Attendance evidence on approved leave",
          "/attendance",
        ],
        [
          "chExceptions",
          "CH resolution cases",
          "Review corrected duty records",
          "/leave",
        ],
      ];
  return {
    overview: {
      meta: {
        date,
        timezone,
        generatedAt: now.toISOString(),
        scope: self
          ? "My employee record"
          : hr
            ? "Organization · selected workforce"
            : "My team / assigned HOD scope",
        mode: self ? "SELF" : hr ? "HR" : "TEAM",
        headcountBasis:
          "Current employee status and assignments; joining date on or before selected date. Historical snapshots unavailable.",
        attendanceNote:
          "Exclusive states reconcile to active headcount. Late and conflicts are overlapping indicators. Unrecorded and unfinalized absence stays pending.",
      },
      filters: {
        departments: departments
          .filter((d) =>
            (options[0]?.departments ?? []).some(
              (id: any) => String(id) === String(d._id),
            ),
          )
          .map((d) => ({ value: String(d._id), label: d.name })),
        branches: (options[0]?.branches ?? []).filter(Boolean).sort(),
        businessUnits: (options[0]?.businessUnits ?? []).filter(Boolean).sort(),
      },
      kpis: {
        total: employees.length,
        active: active.length,
        present: records.present.length,
        absent: stateCounts.ABSENT,
        approvedLeave: records.approvedLeave.length,
        pendingActions: records.actions.length,
        probation: records.probation?.length ?? 0,
        confirmed: records.confirmed?.length ?? 0,
        late,
        missingPunch: stateCounts.MISSING_PUNCH,
        pendingAttendance: stateCounts.PENDING,
        recordedAbsences,
        weeklyHoliday:
          stateCounts.WEEKLY_HOLIDAY + stateCounts.WORKED_WEEKLY_HOLIDAY,
        workedWeeklyHoliday: stateCounts.WORKED_WEEKLY_HOLIDAY,
        joiners: records.joiners?.length ?? 0,
      },
      attendance: {
        states: stateCounts,
        conflicts,
        trend,
        lastProcessedAt:
          attendance
            .map((a) => a.updatedAt?.toISOString())
            .filter(Boolean)
            .sort()
            .at(-1) ?? null,
        absenceFinalizationAvailable: false,
      },
      attention: actionDefinitions.map(([metric, label, context, href]) => ({
        metric,
        label,
        context,
        href,
        count: records[metric!]?.length ?? 0,
      })),
      approvals: {
        hod: pendingHod.length,
        hr: pendingHr.length,
        corrections: corrections.length,
        items: [...records.hr, ...records.hod].slice(0, 6),
      },
      leave: {
        upcoming: leaves.filter(
          (l) =>
            l.status === "APPROVED" &&
            l.startDate >= nextKey &&
            l.startDate <= dayKey(shiftDay(date, 30)),
        ).length,
        requestsThisMonth: leaves.filter(
          (l) => l.createdAt >= monthInstant && l.createdAt < endInstant,
        ).length,
        usage,
      },
      workforce: {
        departments: [...departmentRows.values()].sort(
          (a, b) => b.active - a.active,
        ),
        employment: [...statusMap].map(([name, count]) => ({ name, count })),
        branches: distribution("branch"),
        businessUnits: distribution("businessUnit"),
        employeeTypes: distribution("workforceType"),
        joiners,
      },
      lifecycle: {
        upcoming: records.upcoming.length,
        overdue: records.overdue.length,
        recentlyConfirmed: employees.filter(
          (e) =>
            e.employment.confirmationDate &&
            e.employment.confirmationDate >= monthStart &&
            e.employment.confirmationDate < nextKey,
        ).length,
        reviews: [
          ...(records.overdue ?? []),
          ...(records.upcoming ?? []),
        ].slice(0, 6),
      },
      ch: {
        earned: sumLedger("CH_CREDIT"),
        reversed:
          sumLedger("CH_REVERSAL") === null
            ? null
            : -sumLedger("CH_REVERSAL")! || 0,
        pending: credits === null ? null : records.chPending.length,
        exceptions: credits === null ? null : records.chExceptions.length,
        policyEnabled:
          leavePolicy === null
            ? null
            : (leavePolicy.chQualification?.enabled ?? false),
      },
      activities:
        activities?.map((a) => ({
          id: String(a._id),
          label: a.action.replaceAll("_", " ").toLowerCase(),
          employee:
            currentPeople.get(String(a.entityId))?.fullName ?? "Employee",
          timestamp: a.timestamp,
          href: `/employees/${a.entityId}`,
        })) ?? [],
      health: {
        punches:
          punchHealth === null
            ? null
            : Object.fromEntries(punchHealth.map((p: any) => [p._id, p.count])),
        devices:
          devices?.map((d) => ({
            id: String(d._id),
            name: d.name,
            configuredStatus: d.status,
            model: d.model ?? null,
            lastSyncAt: d.lastSyncAt ?? null,
          })) ?? null,
        deviceScope:
          "Organization integration inventory; unaffected by workforce filters. Device status is configuration, not a live connection check.",
        roster:
          "No authoritative roster or attendance-finalization cutoff configured",
        payroll: "Not implemented",
      },
      warnings,
    },
    records,
  };
}
