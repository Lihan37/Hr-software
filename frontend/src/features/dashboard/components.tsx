import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Inbox, Users, type LucideIcon } from "lucide-react";
import type { DashboardOverview, Distribution } from "./types";

export const stateLabels: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Finalized absent",
  APPROVED_LEAVE: "Approved leave",
  WEEKLY_HOLIDAY: "Weekly holiday",
  WORKED_WEEKLY_HOLIDAY: "Worked holiday",
  MISSING_PUNCH: "Missing punch",
  PUBLIC_HOLIDAY: "Public holiday",
  PENDING: "Pending / unknown",
};
const colors: Record<string, string> = {
  PRESENT: "#176b9c",
  ABSENT: "#b45309",
  APPROVED_LEAVE: "#11837a",
  WEEKLY_HOLIDAY: "#7b8fa6",
  WORKED_WEEKLY_HOLIDAY: "#193752",
  MISSING_PUNCH: "#d9a344",
  PUBLIC_HOLIDAY: "#a5bec6",
  PENDING: "#dce3e9",
};

export function Panel({
  title,
  note,
  action,
  children,
  className = "",
}: {
  title: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-slate-200 bg-white ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div className="min-w-0">
          <h2 className="font-bold text-[#11263d]">{title}</h2>
          {note && (
            <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-6 text-sm leading-6 text-slate-500">
      <Inbox className="shrink-0 text-slate-400" size={18} />
      {children}
    </div>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-semibold text-[#176b9c] hover:underline"
    >
      {children}
      <ArrowUpRight size={14} />
    </Link>
  );
}
export function KpiCard({
  label,
  value,
  note,
  href,
  icon: Icon = Users,
}: {
  label: string;
  value: number | string;
  note: string;
  href: string;
  icon?: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group min-w-0 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-sky-300"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold leading-5 text-slate-600">
          {label}
        </p>
        <Icon size={17} className="shrink-0 text-[#176b9c]" />
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-[#11263d]">
        {value}
      </div>
      <div className="mt-2 flex items-start justify-between gap-1 text-[11px] leading-4 text-slate-500">
        <span>{note}</span>
        <ArrowUpRight
          size={13}
          className="shrink-0 opacity-0 group-hover:opacity-100"
        />
      </div>
    </Link>
  );
}
export function AttendanceChart({
  data,
  drill,
}: {
  data: DashboardOverview;
  drill: (metric: string) => string;
}) {
  const total = data.kpis.active;
  let offset = 0;
  const segments = Object.entries(data.attendance.states)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => {
      const start = offset;
      offset += total ? (value / total) * 100 : 0;
      return `${colors[key]} ${start}% ${offset}%`;
    });
  return (
    <div className="grid items-center gap-6 p-5 sm:grid-cols-[180px_1fr]">
      <div
        className="mx-auto grid size-44 place-items-center rounded-full"
        role="img"
        aria-label={`Attendance distribution for ${total} active employees. Breakdown follows.`}
        style={{
          background: segments.length
            ? `conic-gradient(${segments.join(",")})`
            : "#f1f5f9",
        }}
      >
        <div className="grid size-32 content-center rounded-full bg-white text-center">
          <span className="text-4xl font-bold tracking-tight text-[#11263d]">
            {total}
          </span>
          <span className="mt-1 text-xs text-slate-500">active workforce</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        {Object.entries(data.attendance.states).map(([key, value]) => (
          <Link
            href={drill(key)}
            key={key}
            className="flex min-w-0 items-center justify-between gap-2 rounded-md p-2 text-xs hover:bg-slate-50"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: colors[key] }}
              />
              <span>{stateLabels[key]}</span>
            </span>
            <strong className="tabular-nums text-slate-800">{key === 'ABSENT' && !data.attendance.absenceFinalizationAvailable ? '—' : value}</strong>
          </Link>
        ))}
      </div>
    </div>
  );
}
export function Bars({ rows, label }: { rows: Distribution[]; label: string }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return rows.length ? (
    <div className="space-y-4 p-5" aria-label={label}>
      {rows.map((row) => (
        <div key={row.name}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 break-words text-slate-600">
              {row.name.replaceAll("_", " ")}
            </span>
            <strong className="tabular-nums text-[#11263d]">{row.count}</strong>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#176b9c]"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Empty>No records in this scope.</Empty>
  );
}
export function TrendChart({
  rows,
}: {
  rows: DashboardOverview["attendance"]["trend"];
}) {
  if (!rows.some((row) => row.present || row.missing || row.recordedAbsent))
    return <Empty>No attendance records in this date range.</Empty>;
  const max = Math.max(...rows.map((r) => r.present + r.missing), 1);
  const w = 700;
  const h = 150;
  const left = 32;
  const bottom = 24;
  const top = 14;
  const point = (i: number, value: number) =>
    `${left + (i * (w - left - 12)) / Math.max(rows.length - 1, 1)},${h - bottom - (value / max) * (h - bottom - top)}`;
  return (
    <div className="p-5">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>● Completed attendance</span>
        <span className="text-amber-700">● Missing punch</span>
        <span className="ml-auto">Recorded employees / day</span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        role="img"
        aria-label="Daily recorded attendance trend; exact values available below"
      >
        <title>Recorded attendance by date</title>
        {[0, 0.5, 1].map((level) => (
          <g key={level}>
            <line
              x1={left}
              x2={w}
              y1={h - bottom - level * (h - bottom - top)}
              y2={h - bottom - level * (h - bottom - top)}
              stroke="#e7ebef"
            />
            <text
              x="0"
              y={h - bottom - level * (h - bottom - top) + 4}
              fill="#677584"
              fontSize="11"
            >
              {Math.round(max * level)}
            </text>
          </g>
        ))}
        <polyline
          points={rows.map((r, i) => point(i, r.present)).join(" ")}
          fill="none"
          stroke="#176b9c"
          strokeWidth="2.5"
        />
        <polyline
          points={rows.map((r, i) => point(i, r.missing)).join(" ")}
          fill="none"
          stroke="#b45309"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        {rows.map((r, i) => (
          <circle
            key={r.date}
            cx={point(i, r.present).split(",")[0]}
            cy={point(i, r.present).split(",")[1]}
            r="3"
            fill="#176b9c"
          >
            <title>
              {r.date}: {r.present} complete, {r.missing} missing
            </title>
          </circle>
        ))}
        <text x={left} y={h - 3} fill="#677584" fontSize="11">
          {rows[0]?.date}
        </text>
        <text x={w - 5} textAnchor="end" y={h - 3} fill="#677584" fontSize="11">
          {rows.at(-1)?.date}
        </text>
      </svg>
      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer">View accessible data table</summary>
        <div className="table-wrap mt-3">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Complete</th>
                <th>Missing punch</th>
                <th>Recorded absent*</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td>{r.present}</td>
                  <td>{r.missing}</td>
                  <td>{r.recordedAbsent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2">
          *Recorded absence is not treated as finalized absence without a
          processing cutoff.
        </p>
      </details>
    </div>
  );
}
