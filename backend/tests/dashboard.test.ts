import request from "supertest";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { app } from "../src/app.js";
import { issueAccessToken } from "../src/modules/auth/auth.service.js";
import {
  dashboardFilters,
  dashboardScope,
  businessDate,
  instantAtMidnight,
  classifyAttendance,
  employmentLabel,
} from "../src/modules/dashboard/dashboard.policy.js";
import { getDashboard } from "../src/modules/dashboard/dashboard.service.js";
import { Employee } from "../src/modules/employees/employee.model.js";
import { Attendance } from "../src/modules/attendance/attendance.model.js";
import { AttendanceCorrection } from "../src/modules/attendance-corrections/attendance-correction.model.js";
import { HrPolicy } from "../src/modules/employee-lifecycle/lifecycle.model.js";
import {
  CompensatoryHolidayCredit,
  LeavePolicy,
  LeaveRequest,
  LeaveType,
  LeaveLedgerEntry,
  WeeklyHolidaySchedule,
} from "../src/modules/leave/leave.model.js";
import { Department } from "../src/modules/organization/organization.model.js";
import {
  BiometricDevice,
  BiometricPunch,
} from "../src/modules/biometric/biometric.model.js";
import { AuditLog } from "../src/modules/audit/audit.model.js";

const employeeId = "507f191e810c19729de860ea";
const department = new Types.ObjectId("507f191e810c19729de860eb");
const auth = {
  sub: "507f1f77bcf86cd799439011",
  role: "SUPER_ADMIN" as const,
  employeeId,
  type: "access" as const,
};
const key = new Date("2026-10-21T00:00:00Z");
function query(result: unknown): any {
  const chain = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
  };
  return chain;
}
const fixture = Array.from({ length: 4 }, (_, i) => ({
  _id: new Types.ObjectId(`507f191e810c19729de860e${i}`),
  employeeId: `EMP-${i}`,
  fullName: `Test Employee ${i}`,
  personal: { nidOrPassport: "PRIVATE" },
  employment: {
    department,
    status: i === 3 ? "INACTIVE" : "ACTIVE",
    employmentType: i === 2 ? "PROBATION" : "PERMANENT",
    joiningDate: new Date("2026-01-01"),
    confirmationDate: i === 2 ? null : new Date("2026-05-01"),
    probationEndDate: i === 2 ? new Date("2026-10-20") : null,
    branch: "Dhaka",
    businessUnit: "Hotel",
    workforceType: "LOCAL",
    reviewer: employeeId,
  },
}));

describe("dashboard date, scope and attendance policy", () => {
  it("uses the Dhaka business day across the UTC rollover", () => {
    expect(businessDate(new Date("2026-10-20T18:30:00Z"))).toBe("2026-10-21");
    expect(instantAtMidnight("2026-10-21", "Asia/Dhaka").toISOString()).toBe(
      "2026-10-20T18:00:00.000Z",
    );
  });
  it("validates civil dates, IDs, period and enum filters", () => {
    expect(() => dashboardFilters.parse({ date: "2026-02-30" })).toThrow();
    expect(() =>
      dashboardFilters.parse({ department: "{$ne:null}" }),
    ).toThrow();
    expect(() => dashboardFilters.parse({ period: "999" })).toThrow();
    expect(dashboardFilters.parse({ period: "30" }).period).toBe(30);
  });
  it("cannot widen employee or HOD scope through filters", () => {
    expect(dashboardScope({ ...auth, role: "EMPLOYEE" })).toEqual({
      _id: employeeId,
    });
    expect(dashboardScope({ ...auth, role: "MANAGER" })).toEqual({
      $or: [
        { _id: employeeId },
        { "employment.reportingManager": employeeId },
        { "employment.reviewer": employeeId },
      ],
    });
    expect(() =>
      dashboardScope({ ...auth, role: "MANAGER", employeeId: undefined }),
    ).toThrow();
  });
  it("classifies employee weekly holiday and verified worked holiday exclusively", () => {
    expect(classifyAttendance(undefined, false, true)).toBe("WEEKLY_HOLIDAY");
    expect(
      classifyAttendance(
        { status: "PRESENT", checkIn: key, checkOut: key },
        false,
        true,
      ),
    ).toBe("WORKED_WEEKLY_HOLIDAY");
  });
  it("does not infer absence from missing punches or unfinalized ABSENT records", () => {
    expect(classifyAttendance(undefined, false, false)).toBe("PENDING");
    expect(classifyAttendance({ status: "ABSENT" }, false, false)).toBe(
      "PENDING",
    );
    expect(
      classifyAttendance(
        { status: "MISSING_PUNCH", checkIn: key },
        false,
        false,
      ),
    ).toBe("MISSING_PUNCH");
  });
  it("recognizes final approved leave and keeps worked conflicts present", () => {
    expect(classifyAttendance(undefined, true, false)).toBe("APPROVED_LEAVE");
    expect(classifyAttendance({ status: "LEAVE" }, false, false)).toBe(
      "APPROVED_LEAVE",
    );
    expect(
      classifyAttendance(
        { status: "PRESENT", checkIn: key, checkOut: key },
        true,
        false,
      ),
    ).toBe("PRESENT");
  });
  it("supports legacy probation classification without confusing workforce type", () => {
    expect(employmentLabel({ employeeType: "PROBATIONARY" })).toBe("PROBATION");
    expect(
      employmentLabel({
        employmentType: "PERMANENT",
        employeeType: "PROBATIONARY",
      }),
    ).toBe("PERMANENT");
  });
});

describe("dashboard read service and API", () => {
  beforeEach(() => {
    vi.spyOn(HrPolicy, "findOne").mockReturnValue(
      query({ timezone: "Asia/Dhaka" }),
    );
    vi.spyOn(Employee, "find").mockReturnValue(query(fixture));
    vi.spyOn(Employee, "aggregate").mockResolvedValue([
      {
        departments: [department],
        branches: ["Dhaka"],
        businessUnits: ["Hotel"],
      },
    ]);
    vi.spyOn(Department, "find").mockReturnValue(
      query([{ _id: department, name: "Operations" }]),
    );
    vi.spyOn(Attendance, "find").mockReturnValue(
      query([
        {
          _id: new Types.ObjectId(),
          employee: fixture[0]!._id,
          date: key,
          status: "PRESENT",
          checkIn: key,
          checkOut: key,
          lateMinutes: 5,
          updatedAt: key,
        },
        {
          _id: new Types.ObjectId(),
          employee: fixture[2]!._id,
          date: key,
          status: "ABSENT",
          updatedAt: key,
        },
      ]),
    );
    vi.spyOn(LeaveRequest, "find").mockReturnValue(
      query([
        {
          _id: new Types.ObjectId(),
          employee: fixture[1]!._id,
          leaveType: "CL",
          status: "APPROVED",
          startDate: key,
          endDate: key,
          createdAt: key,
          requestedDays: 1,
        },
        {
          _id: new Types.ObjectId(),
          employee: fixture[0]!._id,
          leaveType: "CL",
          status: "PENDING_HOD",
          startDate: key,
          endDate: key,
          createdAt: key,
          requestedDays: 1,
        },
        {
          _id: new Types.ObjectId(),
          employee: fixture[2]!._id,
          leaveType: "CH",
          status: "PENDING_HR",
          startDate: key,
          endDate: key,
          createdAt: key,
          requestedDays: 1,
        },
      ]),
    );
    vi.spyOn(AttendanceCorrection, "find").mockReturnValue(query([]));
    vi.spyOn(WeeklyHolidaySchedule, "find").mockReturnValue(
      query([{ employee: fixture[0]!._id, date: key }]),
    );
    vi.spyOn(CompensatoryHolidayCredit, "find").mockReturnValue(query([]));
    vi.spyOn(LeaveLedgerEntry, "aggregate").mockResolvedValue([
      { _id: { type: "CH_CREDIT", leaveType: "CH" }, amount: 2 },
      { _id: { type: "LEAVE_DEDUCTION", leaveType: "CH" }, amount: -1 },
    ]);
    vi.spyOn(LeaveType, "find").mockReturnValue(
      query([
        { _id: "CL", code: "CL" },
        { _id: "CH", code: "CH" },
      ]),
    );
    vi.spyOn(LeavePolicy, "findOne").mockReturnValue(
      query({ chQualification: { enabled: false } }),
    );
    vi.spyOn(BiometricPunch, "aggregate").mockResolvedValue([]);
    vi.spyOn(BiometricDevice, "find").mockReturnValue(query([]));
    vi.spyOn(AuditLog, "find").mockReturnValue(query([]));
  });
  afterEach(() => vi.restoreAllMocks());
  it("reconciles headcount and exclusive attendance, approval stages, lifecycle and earned CH", async () => {
    const { overview, records } = await getDashboard(
      auth,
      dashboardFilters.parse({ date: "2026-10-21" }),
    );
    expect(overview.kpis).toMatchObject({
      active: 3,
      present: 1,
      approvedLeave: 1,
      pendingAttendance: 1,
      late: 1,
      probation: 1,
    });
    expect(
      Object.values(overview.attendance.states).reduce((a, b) => a + b, 0),
    ).toBe(3);
    expect(overview.approvals).toMatchObject({ hod: 1, hr: 1 });
    expect(overview.ch).toMatchObject({ earned: 2, reversed: 0 });
    expect(overview.leave.usage.find((r) => r.code === "CH")?.used).toBe(1);
    expect(overview.lifecycle.overdue).toBe(1);
    expect(records.present).toHaveLength(1);
    expect(JSON.stringify(overview)).not.toContain("PRIVATE");
  });
  it("keeps scoped employee filters ANDed with caller authorization", async () => {
    await getDashboard(
      { ...auth, role: "MANAGER" },
      dashboardFilters.parse({ department: String(department) }),
    );
    const filter = (
      vi.mocked(Employee.find).mock.calls as unknown as any[][]
    )[0]![0];
    expect(filter.$and[0].$or).toContainEqual({
      "employment.reviewer": employeeId,
    });
    expect(filter.$and[1]).toEqual({
      "employment.department": String(department),
    });
    const attendanceQuery = (
      vi.mocked(Attendance.find).mock.calls as unknown as any[][]
    )[0]![0];
    expect(attendanceQuery.employee.$in).toEqual(fixture.map((e) => e._id));
    expect(BiometricDevice.find).not.toHaveBeenCalled();
    expect(AuditLog.find).not.toHaveBeenCalled();
  });
  it("returns empty totals for an empty employee scope", async () => {
    vi.mocked(Employee.find).mockReturnValue(query([]));
    vi.mocked(Attendance.find).mockReturnValue(query([]));
    vi.mocked(LeaveRequest.find).mockReturnValue(query([]));
    const { overview } = await getDashboard(auth, dashboardFilters.parse({}));
    expect(overview.kpis.active).toBe(0);
    expect(overview.workforce.departments).toEqual([]);
  });
  it("shows optional processing failure as unavailable, never zero", async () => {
    vi.mocked(BiometricPunch.aggregate).mockRejectedValue(
      new Error("private database detail"),
    );
    const { overview } = await getDashboard(auth, dashboardFilters.parse({}));
    expect(overview.health.punches).toBeNull();
    expect(overview.warnings).toContain(
      "Attendance processing is unavailable. Refresh to retry.",
    );
    expect(JSON.stringify(overview)).not.toContain("private database detail");
  });
  it("performs no employee, attendance, ledger or CH writes on repeated reads", async () => {
    const writes = [
      vi.spyOn(Employee, "updateOne"),
      vi.spyOn(Attendance, "updateMany"),
      vi.spyOn(LeaveLedgerEntry, "create"),
      vi.spyOn(CompensatoryHolidayCredit, "findOneAndUpdate"),
      vi.spyOn(LeavePolicy, "findOneAndUpdate"),
    ];
    await getDashboard(auth, dashboardFilters.parse({}));
    await getDashboard(auth, dashboardFilters.parse({}));
    writes.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
  it("rejects anonymous calls and employee access to admin overview", async () => {
    expect((await request(app).get("/api/v1/dashboard/overview")).status).toBe(
      401,
    );
    const token = issueAccessToken(auth.sub, "EMPLOYEE", employeeId);
    expect(
      (
        await request(app)
          .get("/api/v1/dashboard/overview")
          .set("Authorization", `Bearer ${token}`)
      ).status,
    ).toBe(403);
  });
  it("validates API filters and exposes a paginated drill-down with no-store caching", async () => {
    const token = issueAccessToken(auth.sub, "SUPER_ADMIN", employeeId);
    expect(
      (
        await request(app)
          .get("/api/v1/dashboard/overview?date=bad")
          .set("Authorization", `Bearer ${token}`)
      ).status,
    ).toBe(422);
    const result = await request(app)
      .get("/api/v1/dashboard/records?metric=present&date=2026-10-21")
      .set("Authorization", `Bearer ${token}`);
    expect(result.status).toBe(200);
    expect(result.body.data.total).toBe(1);
    expect(result.headers["cache-control"]).toBe("private, no-store");
  });
  it("returns an error when a core database read fails", async () => {
    vi.mocked(Employee.find).mockReturnValue(
      query(Promise.reject(new Error("database offline"))),
    );
    await expect(
      getDashboard(auth, dashboardFilters.parse({})),
    ).rejects.toThrow("database offline");
  });
});
