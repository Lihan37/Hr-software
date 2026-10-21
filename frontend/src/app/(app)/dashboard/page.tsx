"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileWarning,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { api, ApiClientError } from "@/lib/api";
import {
  AttendanceChart,
  Bars,
  Empty,
  KpiCard,
  Panel,
  TextLink,
  TrendChart,
} from "@/features/dashboard/components";
import {
  displayDate,
  localDate,
  type DashboardOverview,
} from "@/features/dashboard/types";

const initialFilters = {
  date: "",
  department: "",
  branch: "",
  businessUnit: "",
  employeeType: "",
  employmentStatus: "",
  period: "7",
};
export default function DashboardPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workforceView, setWorkforceView] = useState("departments");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const sequence = useRef(0);
  const self = user?.role === "EMPLOYEE";
  const canWrite =
    !!user && ["SUPER_ADMIN", "HR_ADMIN", "HR"].includes(user.role);
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => !!value),
  ).toString();
  const load = useCallback(async () => {
    if (!user) return;
    const current = ++sequence.current;
    setLoading(true);
    setError("");
    setDenied(false);
    try {
      const result = await api.get<DashboardOverview>(
        `/dashboard/${user.role === "EMPLOYEE" ? "self" : "overview"}?${params}`,
      );
      if (current === sequence.current) setData(result);
    } catch (reason) {
      if (current === sequence.current) {
        setData(null);
        setError(
          reason instanceof Error ? reason.message : "Unable to load dashboard",
        );
        setDenied(reason instanceof ApiClientError && reason.status === 403);
      }
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [user, params]);
  useEffect(() => {
    void load();
    return () => {
      sequence.current++;
    };
  }, [load]);
  const change = (name: keyof typeof initialFilters, value: string) =>
    setFilters((current) => ({ ...current, [name]: value }));
  const drill = (metric: string, extra: Record<string, string> = {}) => {
    const query = new URLSearchParams(params);
    query.set("metric", metric);
    if (data) query.set("date", data.meta.date);
    Object.entries(extra).forEach(([key, value]) => query.set(key, value));
    return `/dashboard/records?${query}`;
  };
  const time = (value: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: data?.meta.timezone ?? "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span className="size-1.5 rounded-full bg-[#11837a]" />
            {data?.meta.scope ??
              (self ? "Employee workspace" : "HR operations")}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#11263d] sm:text-3xl">
            {self ? "My workday" : "Workforce overview"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Welcome, {user?.employee?.fullName ?? user?.email ?? "…"}
            <span className="mx-2">·</span>
            {displayDate(
              `${data?.meta.date ?? localDate()}T00:00:00Z`,
              data?.meta.timezone,
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void load()}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          {canWrite && (
            <Link
              href="/employees/new"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Add employee
            </Link>
          )}
        </div>
      </header>
      <section
        aria-label="Dashboard filters"
        className="rounded-xl border border-slate-200 bg-white p-4"
      >
        <button type="button" className="flex w-full items-center justify-between gap-3 text-sm font-semibold text-slate-600 md:hidden" aria-expanded={filtersExpanded} aria-controls="workforce-filters" onClick={() => setFiltersExpanded(value => !value)}><span>Filters · {filters.date || data?.meta.date || localDate()}</span><span>{filtersExpanded ? 'Hide' : 'Show'}</span></button>
        <div id="workforce-filters" className={`${filtersExpanded ? 'grid mt-4 md:mt-0' : 'hidden md:grid'} gap-3 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`}>
          <label className="min-w-0 text-xs font-semibold text-slate-600">
            Business date
            <input
              aria-label="Business date"
              type="date"
              className="field mt-1.5 min-w-0 text-sm"
              value={filters.date || data?.meta.date || ""}
              onChange={(e) => change("date", e.target.value)}
            />
          </label>
          {!self && (
            <>
              <Filter
                label="Department"
                value={filters.department}
                onChange={(v) => change("department", v)}
                options={data?.filters.departments ?? []}
              />
              <Filter
                label="Branch"
                value={filters.branch}
                onChange={(v) => change("branch", v)}
                options={(data?.filters.branches ?? []).map((value) => ({
                  value,
                  label: value,
                }))}
              />
              <Filter
                label="Business unit"
                value={filters.businessUnit}
                onChange={(v) => change("businessUnit", v)}
                options={(data?.filters.businessUnits ?? []).map((value) => ({
                  value,
                  label: value,
                }))}
              />
              <Filter
                label="Employee type"
                value={filters.employeeType}
                onChange={(v) => change("employeeType", v)}
                options={[
                  { value: "LOCAL", label: "Local" },
                  { value: "EXPAT", label: "Expat" },
                ]}
              />
              <Filter
                label="Job status"
                value={filters.employmentStatus}
                onChange={(v) => change("employmentStatus", v)}
                options={[
                  "ACTIVE",
                  "INACTIVE",
                  "SUSPENDED",
                  "RESIGNED",
                  "TERMINATED",
                  "SEPARATED",
                ].map((value) => ({ value, label: value }))}
              />
            </>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] leading-5 text-slate-500">
          <span>
            {data?.meta.timezone ?? "Asia/Dhaka"} · Active headcount uses
            current employee assignments.
          </span>
          <span>
            {data && !loading
              ? `Updated ${time(data.meta.generatedAt)}`
              : loading
                ? "Updating…"
                : "Not available"}
            {Object.entries(filters).some(
              ([key, value]) => key !== "period" && value,
            ) && (
              <button
                onClick={() => setFilters(initialFilters)}
                className="ml-3 font-semibold text-[#176b9c]"
              >
                Clear filters
              </button>
            )}
          </span>
        </div>
      </section>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
        >
          <h2 className="font-bold">
            {denied
              ? "Dashboard access denied"
              : "Dashboard could not be loaded"}
          </h2>
          <p className="mt-1">{error}</p>
          <button
            className="mt-3 font-bold underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <div
          aria-label="Loading dashboard"
          aria-busy="true"
          className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
            />
          ))}
          <div className="col-span-full h-80 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : (
        data && (
          <>
            {data.warnings.length > 0 && (
              <div
                role="status"
                className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
              >
                {data.warnings.join(" ")}
              </div>
            )}
            {self ? (
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard
                  label="My attendance"
                  value={
                    data.kpis.present
                      ? "Present"
                      : data.kpis.approvedLeave
                        ? "On leave"
                        : "Pending"
                  }
                  note="Selected business date"
                  href="/attendance"
                  icon={CheckCircle2}
                />
                <KpiCard
                  label="My pending leave"
                  value={data.approvals.hod + data.approvals.hr}
                  note="HOD and HR review stages"
                  href="/leave"
                  icon={CalendarCheck}
                />
                <KpiCard
                  label="My corrections"
                  value={data.approvals.corrections}
                  note="Pending attendance review"
                  href="/attendance"
                  icon={FileWarning}
                />
                <KpiCard
                  label="Weekly holiday"
                  value={data.kpis.weeklyHoliday ? "Scheduled" : "Not recorded"}
                  note="Employee-specific schedule"
                  href="/leave"
                  icon={CalendarCheck}
                />
              </section>
            ) : (
              <section
                aria-label="Executive metrics"
                className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6"
              >
                <KpiCard
                  label="Active employees"
                  value={data.kpis.active}
                  note="Current status · joined by date"
                  href={drill("active")}
                />
                <KpiCard
                  label="Present"
                  value={data.kpis.present}
                  note="Includes worked weekly holidays"
                  href={drill("present")}
                  icon={CheckCircle2}
                />
                <KpiCard
                  label="Finalized absent"
                  value="—"
                  note="Finalization cutoff unavailable"
                  href={drill("PENDING")}
                  icon={Clock3}
                />
                <KpiCard
                  label="On approved leave"
                  value={data.kpis.approvedLeave}
                  note="Unique employees · conflicts flagged"
                  href={drill("approvedLeave")}
                  icon={CalendarCheck}
                />
                <KpiCard
                  label="Pending HR tasks"
                  value={data.ch.exceptions === null ? '—' : data.kpis.pendingActions}
                  note={data.ch.exceptions === null ? 'Some task sources unavailable' : 'Review queues · may overlap'}
                  href={drill("actions")}
                  icon={FileWarning}
                />
                <KpiCard
                  label="On probation"
                  value={data.kpis.probation}
                  note="Active probationary employees"
                  href={drill("probation")}
                  icon={Users}
                />
              </section>
            )}
            {!self && (
              <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
                <Panel
                  title="Requires attention"
                  note="Open review queues and employee record exceptions"
                  action={
                    <Link href={drill('actions')} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-[#176b9c]">
                      <Bell size={12} />
                      {data.kpis.pendingActions} {data.ch.exceptions === null ? 'known tasks' : 'tasks'}
                    </Link>
                  }
                >
                  <div className="grid sm:grid-cols-2">
                    {data.attention
                      .filter((item) => item.count > 0)
                      .map((item) => (
                        <Link
                          key={item.metric}
                          href={drill(item.metric!)}
                          className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-700">
                              {item.label}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {item.context}
                            </div>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-bold tabular-nums">
                            {item.count}
                          </span>
                        </Link>
                      ))}
                  </div>
                  {!data.attention.some((item) => item.count > 0) && (
                    <Empty>{data.ch.exceptions === null ? 'Available task sources have no pending items. CH cases are unavailable.' : 'No pending tasks in this scope.'}</Empty>
                  )}
                </Panel>
                <Panel
                  title="Approval queues"
                  note="HOD approval precedes the final HR decision"
                  action={<TextLink href="/approvals">Open inbox</TextLink>}
                >
                  <div className="grid grid-cols-3 border-b border-slate-100 text-center">
                    {[
                      ["HOD", data.approvals.hod, "hod"],
                      ["HR final", data.approvals.hr, "hr"],
                      [
                        "Corrections",
                        data.approvals.corrections,
                        "corrections",
                      ],
                    ].map(([label, value, metric]) => (
                      <Link
                        key={label}
                        href={drill(String(metric))}
                        className="px-2 py-4 hover:bg-slate-50"
                      >
                        <div className="text-2xl font-bold text-[#11263d]">
                          {value}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {label}
                        </div>
                      </Link>
                    ))}
                  </div>
                  {data.approvals.items.length ? (
                    <div className="divide-y divide-slate-100">
                      {data.approvals.items.map((item) => (
                        <Link
                          key={item.id}
                          href={`${drill(item.status === 'PENDING_HR' ? 'hr' : 'hod')}&record=${encodeURIComponent(item.id)}`}
                          className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {item.employee}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {item.detail}
                            </div>
                          </div>
                          <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold">
                            {item.status === "PENDING_HR" ? "HR" : "HOD"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Empty>No pending leave requests.</Empty>
                  )}
                </Panel>
              </section>
            )}
            <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              <Panel
                title={self ? "My attendance position" : "Attendance overview"}
                note={`${displayDate(`${data.meta.date}T00:00:00Z`)} · one state per active employee`}
                action={
                  <TextLink href={drill("active")}>View records</TextLink>
                }
              >
                <AttendanceChart data={data} drill={drill} />
                <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-600">
                  <TextLink href={drill("late")}>
                    {data.kpis.late} late
                  </TextLink>
                  <TextLink href={drill("conflicts")}>
                    {data.attendance.conflicts} leave conflicts
                  </TextLink>
                  <span>Separate indicators; overlap the chart.</span>
                </div>
                <div className="rounded-b-xl bg-slate-50 px-5 py-3 text-xs leading-5 text-slate-500">
                  {data.kpis.pendingAttendance} pending / unknown. Recorded
                  absence ({data.kpis.recordedAbsences}) remains pending until a
                  finalization rule is available.
                </div>
              </Panel>
              <Panel
                title="Workforce composition"
                note="Active employees in the selected scope"
              >
                <Bars
                  rows={data.workforce.employment}
                  label="Employment classification"
                />
                <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
                  {data.kpis.confirmed} confirmed permanent ·{" "}
                  {data.kpis.joiners} joiners this month
                </div>
              </Panel>
            </section>
            <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              <Panel
                title="Attendance trend"
                note="Observed daily records; historical active headcount is unavailable"
                action={
                  <select
                    aria-label="Attendance trend period"
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                    value={filters.period}
                    onChange={(e) => change("period", e.target.value)}
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                  </select>
                }
              >
                <TrendChart rows={data.attendance.trend} />
              </Panel>
              <Panel
                title="Leave this month"
                note={`${data.meta.date.slice(0, 7)} · ledger posting date through selected day`}
                action={<TextLink href="/leave">Leave management</TextLink>}
              >
                <div className="grid grid-cols-2 border-b border-slate-100 p-5">
                  <div>
                    <span className="text-2xl font-bold">
                      {data.leave.requestsThisMonth}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      Requests submitted
                    </p>
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      {data.leave.upcoming}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      Approved · next 30 days
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 p-5">
                  {data.leave.usage.map((item) => (
                    <div
                      key={item.code}
                      className="min-w-0 rounded-lg bg-slate-50 p-2 text-center"
                    >
                      <div className="text-xs font-bold text-slate-500">
                        {item.code}
                      </div>
                      <div className="my-2 text-xl font-bold">
                        {item.used ?? "—"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        net used days
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
            {!self && (
              <>
                <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
                  <Panel
                    title="Department availability"
                    note="Active workforce; staffing requirements and duty roster are unavailable"
                  >
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Department</th>
                            <th>Active</th>
                            <th>Present</th>
                            <th>Leave*</th>
                            <th>Holiday*</th>
                            <th>Unresolved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.workforce.departments.map((row) => (
                            <tr key={row.id}>
                              <td>
                                <Link
                                  className="font-semibold text-[#176b9c]"
                                  href={drill("active", { department: row.id })}
                                >
                                  {row.name}
                                </Link>
                              </td>
                              <td>{row.active}</td>
                              <td>{row.present}</td>
                              <td>{row.approvedLeave}</td>
                              <td>{row.weeklyHoliday}</td>
                              <td>{row.unknown}</td>
                            </tr>
                          ))}
                          {!data.workforce.departments.length && (
                            <tr>
                              <td
                                colSpan={6}
                                className="py-8 text-center text-slate-500"
                              >
                                No active workforce.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="px-5 py-3 text-xs text-slate-500">
                      *Leave excludes punch conflicts. Holiday includes worked
                      holidays; columns may overlap.
                    </p>
                  </Panel>
                  <Panel
                    title="Probation & confirmation"
                    note="Stored review dates; next 30 days"
                    action={
                      <TextLink href="/employees/probation-evaluations">
                        Review
                      </TextLink>
                    }
                  >
                    <div className="flex flex-wrap gap-4 border-b border-slate-100 px-5 py-4 text-xs">
                      <TextLink href={drill("overdue")}>
                        {data.lifecycle.overdue} overdue
                      </TextLink>
                      <TextLink href={drill("upcoming")}>
                        {data.lifecycle.upcoming} upcoming
                      </TextLink>
                      <span className="text-slate-500">
                        {data.lifecycle.recentlyConfirmed} confirmed this month
                      </span>
                    </div>
                    {data.lifecycle.reviews.length ? (
                      <div className="divide-y divide-slate-100">
                        {data.lifecycle.reviews.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-3 p-4 hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">
                                {item.href ? <Link href={item.href} className="hover:underline">{item.employee}</Link> : item.employee}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {item.department}
                              </div>
                            </div>
                            <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs">
                              {item.date &&
                                displayDate(`${item.date}T00:00:00Z`)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty>
                        No stored reviews in the next 30 days or overdue.
                      </Empty>
                    )}
                  </Panel>
                </section>
                <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  <Panel
                    title="Workforce by assignment"
                    note="Active employees · current assignments"
                    action={
                      <select
                        aria-label="Workforce breakdown"
                        value={workforceView}
                        onChange={(e) => setWorkforceView(e.target.value)}
                        className="max-w-full rounded border border-slate-200 px-2 py-1 text-xs"
                      >
                        <option value="departments">Department</option>
                        <option value="branches">Branch</option>
                        <option value="businessUnits">Business unit</option>
                        <option value="employeeTypes">Employee type</option>
                      </select>
                    }
                  >
                    <Bars
                      rows={
                        workforceView === "departments"
                          ? data.workforce.departments.map((d) => ({
                              name: d.name,
                              count: d.active,
                            }))
                          : workforceView === "branches"
                            ? data.workforce.branches
                            : workforceView === "businessUnits"
                              ? data.workforce.businessUnits
                              : data.workforce.employeeTypes
                      }
                      label="Headcount distribution"
                    />
                  </Panel>
                  <Panel
                    title="Joining trend"
                    note="Joining dates for employees in the current scope"
                  >
                    <Bars
                      rows={data.workforce.joiners.map((row) => ({
                        name: row.month,
                        count: row.count,
                      }))}
                      label="Monthly employee joining counts"
                    />
                  </Panel>
                  <Panel
                    title="Weekly holiday & CH"
                    note="Employee-specific holidays and earned credits"
                    action={<TextLink href="/leave">Leave</TextLink>}
                  >
                    <dl className="space-y-4 p-5 text-sm">
                      <Stat
                        label="Scheduled holiday · selected date"
                        value={data.kpis.weeklyHoliday}
                      />
                      <Stat
                        label="Worked weekly holiday"
                        value={data.kpis.workedWeeklyHoliday}
                      />
                      <Stat
                        label="CH credited this month"
                        value={data.ch.earned}
                      />
                      <Stat
                        label="CH reversed this month"
                        value={data.ch.reversed}
                      />
                      <Stat
                        label={
                          <TextLink href={drill("chPending")}>
                            Eligibility pending
                          </TextLink>
                        }
                        value={data.ch.pending}
                      />
                      <Stat
                        label={
                          <TextLink href={drill("chExceptions")}>
                            HR resolution
                          </TextLink>
                        }
                        value={data.ch.exceptions}
                      />
                    </dl>
                    <div className="rounded-b-xl bg-slate-50 px-5 py-3 text-xs leading-5 text-slate-500">
                      {data.ch.policyEnabled
                        ? "Qualification policy enabled. Credits come from the attendance service."
                        : "CH qualification is pending policy confirmation. Dashboard refresh never credits leave."}
                    </div>
                  </Panel>
                </section>
                <section className="grid gap-5 lg:grid-cols-2">
                  <Panel
                    title="Recent HR activity"
                    note="Employee record audit events · month to selected date"
                  >
                    {data.activities.length ? (
                      <ol className="divide-y divide-slate-100">
                        {data.activities.map((item) => (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-slate-50"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-semibold capitalize">
                                  {item.label}
                                </div>
                                <div className="mt-1 truncate text-xs text-slate-500">
                                  {item.employee}
                                </div>
                              </div>
                              <time
                                className="shrink-0 text-[11px] text-slate-500"
                                dateTime={item.timestamp}
                              >
                                {displayDate(
                                  item.timestamp,
                                  data.meta.timezone,
                                )}
                              </time>
                            </Link>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <Empty>
                        {data.meta.mode === "TEAM"
                          ? "Employee audit activity is restricted to HR."
                          : "No employee record changes in this period."}
                      </Empty>
                    )}
                  </Panel>
                  <Panel
                    title="Integration & data freshness"
                    note="Recorded processing state; no live connectivity claim"
                  >
                    <dl className="space-y-4 p-5 text-sm">
                      <Stat
                        label="Last attendance update · selected range"
                        value={
                          data.attendance.lastProcessedAt
                            ? `${displayDate(data.attendance.lastProcessedAt, data.meta.timezone)} ${time(data.attendance.lastProcessedAt)}`
                            : "No updates"
                        }
                      />
                      <Stat
                        label="Pending punches · selected day"
                        value={
                          data.health.punches
                            ? (data.health.punches.PENDING ?? 0)
                            : null
                        }
                      />
                      <Stat
                        label="Unresolved / failed punches"
                        value={
                          data.health.punches
                            ? (data.health.punches.UNRESOLVED ?? 0) +
                              (data.health.punches.ERROR ?? 0)
                            : null
                        }
                      />
                    </dl>
                    {data.health.devices !== null && (
                      <div className="border-t border-slate-100 p-5">
                        <p className="mb-3 text-xs leading-5 text-slate-500">
                          {data.health.deviceScope}
                        </p>
                        {!data.health.devices.length ? (
                          <p className="text-sm font-semibold text-slate-600">
                            Biometric devices: not configured
                          </p>
                        ) : (
                          data.health.devices.map((device) => (
                            <div key={device.id} className="mb-3 text-xs">
                              <b>{device.name}</b> · {device.configuredStatus}
                              <p className="mt-1 text-slate-500">
                                Last recorded sync:{" "}
                                {device.lastSyncAt
                                  ? `${displayDate(device.lastSyncAt, data.meta.timezone)} ${time(device.lastSyncAt)}`
                                  : "Never recorded"}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    <p className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500">
                      {data.health.roster}. Payroll:{" "}
                      {data.health.payroll.toLowerCase()}.
                    </p>
                  </Panel>
                </section>
              </>
            )}
            <nav
              aria-label="Quick actions and reports"
              className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-slate-200 bg-white p-5"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quick access
              </span>
              {(self
                ? [
                    ["My attendance", "/attendance"],
                    ["My leave", "/leave"],
                    ["My profile", "/profile"],
                  ]
                : [
                    ["Employee records", "/employees"],
                    ["Attendance records", "/attendance"],
                    ["Leave approvals", "/approvals"],
                    ["Leave management", "/leave"],
                    ["Probation reviews", "/employees/probation-evaluations"],
                  ]
              ).map(([label, href]) => (
                <Link
                  key={href}
                  href={href!}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#176b9c]"
                >
                  {label}
                  <ArrowUpRight size={13} />
                </Link>
              ))}
              {canWrite && (
                <Link
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#176b9c]"
                  href={drill("active")}
                >
                  <ShieldCheck size={13} />
                  Scoped workforce report
                </Link>
              )}
            </nav>
            <p className="text-[11px] leading-5 text-slate-400">
              {data.meta.headcountBasis} Pending queues show their current
              status. Month-to-date metrics end on the selected day.
            </p>
          </>
        )
      )}
    </div>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0 text-xs font-semibold text-slate-600">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field mt-1.5 text-sm"
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Stat({
  label,
  value,
}: {
  label: React.ReactNode;
  value: number | string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs leading-5 text-slate-500">{label}</dt>
      <dd className="text-right text-xs font-semibold leading-5 tabular-nums text-slate-800">
        {value ?? "Unavailable"}
      </dd>
    </div>
  );
}
