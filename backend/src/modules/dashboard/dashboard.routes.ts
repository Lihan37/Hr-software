import { Router } from "express";
import { authenticate, allowRoles } from "../../middleware/auth.js";
import { z } from "zod";
import { dashboardFilters, dayKey } from "./dashboard.policy.js";
import { getDashboard } from "./dashboard.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ok } from "../../utils/api-response.js";
import { Attendance } from "../attendance/attendance.model.js";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.use((_request, response, next) => {
  response.set("Cache-Control", "private, no-store");
  next();
});
dashboardRouter.get(
  "/overview",
  allowRoles("SUPER_ADMIN", "HR_ADMIN", "HR", "MANAGER"),
  asyncHandler(async (request, response) => {
    const result = await getDashboard(
      request.auth!,
      dashboardFilters.parse(request.query),
    );
    ok(response, result.overview);
  }),
);
dashboardRouter.get(
  "/self",
  asyncHandler(async (request, response) => {
    const auth = { ...request.auth!, role: "EMPLOYEE" as const };
    const result = await getDashboard(
      auth,
      dashboardFilters.parse(request.query),
    );
    ok(response, result.overview);
  }),
);
dashboardRouter.get(
  "/records",
  asyncHandler(async (request, response) => {
    const input = z
      .object({
        metric: z.enum([
          "active",
          "present",
          "approvedLeave",
          "actions",
          "probation",
          "confirmed",
          "missingHod",
          "joiners",
          "PRESENT",
          "ABSENT",
          "APPROVED_LEAVE",
          "WEEKLY_HOLIDAY",
          "WORKED_WEEKLY_HOLIDAY",
          "MISSING_PUNCH",
          "PUBLIC_HOLIDAY",
          "PENDING",
          "late",
          "conflicts",
          "hod",
          "hr",
          "corrections",
          "upcoming",
          "overdue",
          "chPending",
          "chExceptions",
        ]),
        page: z.coerce.number().int().min(1).max(10000).default(1),
        record: z.string().regex(/^[a-f\d]{24}$/i).optional(),
      })
      .parse(request.query);
    const result = await getDashboard(
      request.auth!,
      dashboardFilters.parse(request.query),
    );
    const rows = (result.records[input.metric] ?? []).filter(row => !input.record || row.id === input.record);
    const limit = 25;
    ok(response, {
      rows: rows.slice((input.page - 1) * limit, input.page * limit),
      total: rows.length,
      page: input.page,
      pages: Math.ceil(rows.length / limit),
      context: result.overview.meta,
    });
  }),
);
dashboardRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const { overview: data } = await getDashboard(
      request.auth!,
      dashboardFilters.parse(request.query),
    );
    const todayAttendance = request.auth!.employeeId
      ? await Attendance.findOne({
          employee: request.auth!.employeeId,
          date: dayKey(data.meta.date),
        })
          .select("checkIn checkOut status")
          .lean()
      : null;
    ok(response, {
      totalEmployees: data.kpis.total,
      activeEmployees: data.kpis.active,
      presentToday: data.kpis.present,
      absentToday: data.kpis.absent,
      onLeaveToday: data.kpis.approvedLeave,
      lateToday: data.kpis.late,
      pendingLeave: data.approvals.hod + data.approvals.hr,
      pendingCorrections: data.approvals.corrections,
      probationEvaluationsDue: data.lifecycle.overdue + data.lifecycle.upcoming,
      todayAttendance,
      absenceFinalizationAvailable: false,
    });
  }),
);
